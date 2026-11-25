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

      let ai: AiPrediction;
      let isSimulated = false;
      let modelStatus = 'LOADED';
      let providerName = 'local-fusion';

      try {
        ai = await this.callAiService(payload);
        providerName = ai.provider ?? 'local-fusion';
        modelStatus = 'LOADED';
      } catch (serviceErr) {
        console.warn(
          'AI service unreachable or returned error, using intelligent clinical fallback:',
          serviceErr instanceof Error ? serviceErr.message : serviceErr
        );
        ai = this.generateFallbackPrediction(
          symptoms,
          report.temperature,
          report.severity,
          report.symptomDuration
        );
        isSimulated = true;
        providerName = ai.provider ?? 'rule-based-fallback';
        modelStatus = 'MOCK';
      }

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
        provider: providerName,
        modelStatus,
        isSimulated,
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
            provider: 'rule-based-fallback',
            modelStatus: 'ERROR',
            isSimulated: true,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            disclaimer: 'The AI service could not process this report.',
          },
          create: {
            reportId,
            predictionId: `PRED-ERROR-${Date.now()}`,
            provider: 'rule-based-fallback',
            modelStatus: 'ERROR',
            isSimulated: true,
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

  private generateFallbackPrediction(
    symptoms: string[],
    temperature?: number | null,
    severity?: string | null,
    _duration?: string | null
  ): AiPrediction {
    const symptomSet = new Set(symptoms.map(s => s.toLowerCase().trim()));

    const diseaseProfiles: Array<{
      disease: string;
      keywords: string[];
      baseWeight: number;
    }> = [
      {
        disease: 'Foot-and-Mouth Disease',
        keywords: [
          'mouth ulcers', 'blisters', 'excessive salivation', 'salivation',
          'drooling', 'difficulty chewing', 'hoof lesions', 'lameness', 'fever'
        ],
        baseWeight: 0.1,
      },
      {
        disease: 'Lumpy Skin Disease',
        keywords: [
          'skin nodules', 'nodules', 'lesions', 'swelling', 'lumps',
          'fever', 'enlarged lymph nodes', 'discharge'
        ],
        baseWeight: 0.1,
      },
      {
        disease: 'Mastitis',
        keywords: [
          'swollen udder', 'udder swelling', 'abnormal milk', 'clots in milk',
          'pain during milking', 'discolored milk', 'hot udder'
        ],
        baseWeight: 0.1,
      },
      {
        disease: 'Bovine Respiratory Disease',
        keywords: [
          'cough', 'coughing', 'nasal discharge', 'difficulty breathing',
          'rapid breathing', 'laboured breathing', 'fever', 'lethargy', 'runny nose'
        ],
        baseWeight: 0.1,
      },
      {
        disease: 'Blackleg',
        keywords: [
          'muscle swelling', 'swollen leg', 'lameness', 'high fever',
          'depression', 'crackling skin', 'loss of appetite'
        ],
        baseWeight: 0.05,
      },
      {
        disease: 'Anthrax',
        keywords: [
          'sudden death', 'dark blood', 'high fever', 'bleeding',
          'severe depression', 'swelling in neck'
        ],
        baseWeight: 0.05,
      },
      {
        disease: 'Haemorrhagic Septicaemia',
        keywords: [
          'swelling in throat', 'throat swelling', 'respiratory distress',
          'high fever', 'salivation', 'depression'
        ],
        baseWeight: 0.05,
      },
      {
        disease: 'Theileriosis',
        keywords: [
          'enlarged lymph nodes', 'pale mucous membranes', 'fever',
          'tick infestation', 'anemia', 'weakness'
        ],
        baseWeight: 0.05,
      },
      {
        disease: 'Brucellosis',
        keywords: [
          'abortion', 'retained placenta', 'reduced milk', 'stillbirth',
          'joint swelling'
        ],
        baseWeight: 0.05,
      },
      {
        disease: 'Clostridial Diseases',
        keywords: [
          'muscle tremors', 'bloat', 'stiffness', 'sudden weakness',
          'dark muscle'
        ],
        baseWeight: 0.05,
      },
    ];

    let bestScore = 0;
    let predictedDisease = 'Healthy';
    const scores: Record<string, number> = {};

    for (const profile of diseaseProfiles) {
      let matches = 0;
      for (const kw of profile.keywords) {
        for (const sym of symptomSet) {
          if (sym.includes(kw) || kw.includes(sym)) {
            matches += 1;
          }
        }
      }
      const score = profile.baseWeight + matches * 2.5;
      scores[profile.disease] = score;
      if (matches > 0 && score > bestScore) {
        bestScore = score;
        predictedDisease = profile.disease;
      }
    }

    if (bestScore === 0) {
      if (symptoms.length > 0) {
        predictedDisease = 'Bovine Respiratory Disease';
        scores['Bovine Respiratory Disease'] = (scores['Bovine Respiratory Disease'] || 0) + 2.0;
      } else {
        predictedDisease = 'Healthy';
        scores['Healthy'] = 3.0;
      }
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const classProbabilities: Record<string, number> = {};
    for (const [d, s] of Object.entries(scores)) {
      classProbabilities[d] = Math.round((s / totalScore) * 1000) / 10;
    }

    const topProbability = classProbabilities[predictedDisease] ?? 70;
    const confidenceVal = Math.min(95, Math.max(55, Math.round(topProbability)));

    return {
      prediction_id: `FALLBACK-${Date.now()}`,
      provider: 'rule-based-fallback',
      predicted_disease: predictedDisease,
      confidence: confidenceVal,
      class_probabilities: classProbabilities,
      top_contributing_factors: symptoms.length > 0 ? symptoms : ['General assessment'],
      supporting_symptoms: symptoms,
      severity: severity || (temperature && temperature > 39.5 ? 'high' : 'moderate'),
      recommendations: [
        `Isolate the animal immediately if ${predictedDisease} is suspected`,
        'Schedule an immediate clinical evaluation by a licensed veterinarian',
        'Monitor temperature twice daily and log any new symptoms',
        'Ensure access to clean drinking water and fresh forage',
      ],
      disclaimer: 'Generated via rule-based diagnostic fallback. Confirm with a licensed veterinarian.',
      confidence_band: confidenceVal >= 80 ? 'high' : confidenceVal >= 65 ? 'medium' : 'low',
    };
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
