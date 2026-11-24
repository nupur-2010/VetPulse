import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { config } from '../config/index.js';

const AI_TIMEOUT_MS = 20000;

interface AiPrediction {
  prediction_id?: string;
  provider?: string;
  predicted_disease: string;
  confidence: number;
  class_probabilities: Record<string, number>;
  top_contributing_factors?: string[];
  supporting_symptoms?: string[];
  severity?: string;
  recommendations?: string[];
  disclaimer?: string;
  image_assessment?: {
    status?: string;
    note?: string;
    predicted_class?: string;
    confidence?: number;
  } | null;
  used_image?: boolean;
  calibration_applied?: boolean;
  confidence_band?: string;
  is_low_confidence?: boolean;
  requires_vet_review?: boolean;
  inconclusive?: boolean;
  top2_margin?: number;
  evidence_count?: number;
  unrecognized_symptoms?: string[];
  confidence_note?: string | null;
}

const DEFAULT_RECOMMENDATIONS = [
  'Consult a veterinarian for confirmation',
  'Isolate the affected animal if symptoms worsen',
  'Monitor temperature and appetite closely',
  'Maintain clean water and feed',
];

export class PredictionService {
  async processReport(reportId: string): Promise<void> {
    try {
      const report = await prisma.healthReport.findUnique({
        where: { id: reportId },
        include: { symptoms: true, photos: true },
      });

      if (!report) return;

      const symptoms = report.symptoms.map(s => s.symptomName);
      const baseUrl = `http://127.0.0.1:${config.port}`;
      const imageUrls = report.photos.map(photo =>
        photo.photoUrl.startsWith('http') ? photo.photoUrl : `${baseUrl}${photo.photoUrl}`
      );

      const payload = {
        symptoms,
        temperature: report.temperature ?? undefined,
        symptom_duration: report.symptomDuration,
        severity: report.severity,
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      const ai = await this.callAiService(payload);
      const confidence = Math.max(0, Math.min(1, (ai.confidence ?? 0) / 100));

      const ranked = Object.entries(ai.class_probabilities ?? {})
        .map(([disease, probability]) => ({
          disease,
          confidence: Math.max(0, Math.min(1, Number(probability) / 100)),
        }))
        .sort((a, b) => b.confidence - a.confidence);

      const factors =
        ai.top_contributing_factors && ai.top_contributing_factors.length > 0
          ? ai.top_contributing_factors
          : ai.supporting_symptoms ?? symptoms;

      const severity = (ai.severity ?? report.severity ?? 'moderate').toLowerCase();

      const recommendations = [...(ai.recommendations ?? [])];
      if (ai.confidence_note && !recommendations.includes(ai.confidence_note)) {
        recommendations.push(ai.confidence_note);
      }

      const data = {
        predictionId: ai.prediction_id ?? `PRED-${uuidv4()}`,
        provider: ai.provider ?? 'local-fusion',
        modelStatus: 'LOADED',
        isSimulated: false,
        predictedDisease: ai.predicted_disease,
        confidence,
        confidenceInterpretation: this.getConfidenceInterpretation(
          confidence,
          ai.confidence_band
        ),
        severity,
        supportingSymptoms: factors.slice(0, 8),
        recommendations:
          recommendations.length > 0
            ? recommendations
            : DEFAULT_RECOMMENDATIONS,
        imageAssessmentStatus: ai.used_image ? 'analyzed' : 'not_analyzed',
        imageAssessmentNote: ai.image_assessment?.note ?? null,
        disclaimer:
          ai.disclaimer ??
          'AI-assisted screening only. Confirm with a licensed veterinarian.',
        status: 'COMPLETED' as const,
        errorMessage: null,
      };

      await prisma.prediction.upsert({
        where: { reportId },
        update: {
          ...data,
          candidates: {
            deleteMany: {},
            create: ranked.map(item => ({
              disease: item.disease,
              confidence: item.confidence,
            })),
          },
        },
        create: {
          reportId,
          ...data,
          candidates: {
            create: ranked.map(item => ({
              disease: item.disease,
              confidence: item.confidence,
            })),
          },
        },
      });

      await prisma.healthReport.update({
        where: { id: reportId },
        data: { status: 'AI_COMPLETED' },
      });
    } catch (error) {
      console.error('Prediction processing error:', error);

      try {
        await prisma.prediction.upsert({
          where: { reportId },
          update: {
            provider: 'local-fusion',
            modelStatus: 'ERROR',
            isSimulated: false,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            disclaimer: 'The AI service could not process this report.',
          },
          create: {
            reportId,
            predictionId: `PRED-ERROR-${Date.now()}`,
            provider: 'local-fusion',
            modelStatus: 'ERROR',
            isSimulated: false,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            disclaimer: 'The AI service could not process this report.',
          },
        });
      } catch (persistError) {
        console.error('Failed to persist prediction error:', persistError);
      }
    }
  }

  private async callAiService(payload: Record<string, unknown>): Promise<AiPrediction> {
    type FetchLike = (input: string, init?: Record<string, unknown>) => Promise<any>;
    const fetchFn = (globalThis as any).fetch as FetchLike | undefined;
    if (!fetchFn) {
      throw new Error('Global fetch is unavailable. Use Node.js 18 or newer.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetchFn(`${config.aiService.url}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.aiService.apiKey
            ? { Authorization: `Bearer ${config.aiService.apiKey}` }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`AI service ${response.status}: ${detail.slice(0, 300)}`);
      }

      return (await response.json()) as AiPrediction;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getPrediction(reportId: string): Promise<any> {
    let prediction = await prisma.prediction.findUnique({
      where: { reportId },
      include: { candidates: true },
    });
    if (!prediction || prediction.status === 'FAILED') {
      await this.processReport(reportId);
      prediction = await prisma.prediction.findUnique({
        where: { reportId },
        include: { candidates: true },
      });
    }
    return prediction;
  }

  private getConfidenceInterpretation(confidence: number, band?: string): string {
    // The calibrated band from the AI service is authoritative when present.
    if (band === 'high') return 'High Confidence';
    if (band === 'medium') return 'Moderate Confidence';
    if (band === 'low') return 'Low Confidence';
    if (confidence >= 0.9) return 'Very High Confidence';
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    if (confidence >= 0.4) return 'Low Confidence';
    return 'Very Low Confidence';
  }
}

export const predictionService = new PredictionService();
