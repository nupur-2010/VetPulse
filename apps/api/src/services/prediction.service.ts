import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { config } from '../config/index.js';

const MOCK_DISEASES = [
  { disease: 'Foot and Mouth Disease', confidence: 0.92, severity: 'HIGH', symptoms: ['blisters', 'fever', 'lameness'] },
  { disease: 'Bovine Respiratory Disease', confidence: 0.78, severity: 'MEDIUM', symptoms: ['coughing', 'nasal discharge', 'fever'] },
  { disease: 'Mastitis', confidence: 0.85, severity: 'MEDIUM', symptoms: ['swollen udder', 'milk changes', 'fever'] },
  { disease: 'Tick Fever', confidence: 0.70, severity: 'HIGH', symptoms: ['fever', 'anaemia', 'weakness'] },
  { disease: 'Blackleg', confidence: 0.65, severity: 'CRITICAL', symptoms: ['sudden death', 'lameness', 'swelling'] },
  { disease: 'Brucellosis', confidence: 0.55, severity: 'HIGH', symptoms: ['abortion', 'fever', 'joint swelling'] },
  { disease: 'Anthrax', confidence: 0.45, severity: 'CRITICAL', symptoms: ['sudden death', 'blood from orifices', 'bloat'] },
  { disease: 'Lumpy Skin Disease', confidence: 0.88, severity: 'HIGH', symptoms: ['nodules', 'fever', 'swelling'] },
  { disease: 'Theileriosis', confidence: 0.72, severity: 'MEDIUM', symptoms: ['fever', 'anaemia', 'lymph node swelling'] },
  { disease: 'Acute Metallic Poisoning', confidence: 0.60, severity: 'HIGH', symptoms: ['convulsions', 'diarrhoea', 'abdominal pain'] },
];

export class PredictionService {
  async processReport(reportId: string): Promise<void> {
    try {
      const report = await prisma.healthReport.findUnique({
        where: { id: reportId },
        include: { symptoms: true },
      });

      if (!report) return;

      const symptomNames = report.symptoms.map(s => s.symptomName.toLowerCase());
      
      // Simulate AI analysis with mock data
      let bestMatch = MOCK_DISEASES[Math.floor(Math.random() * MOCK_DISEASES.length)];
      
      // Simple symptom matching simulation
      for (const disease of MOCK_DISEASES) {
        const matchCount = disease.symptoms.filter(s => symptomNames.some(sn => sn.includes(s))).length;
        if (matchCount > 0 && matchCount / disease.symptoms.length > 0.5) {
          bestMatch = disease;
          break;
        }
      }

      const predictionId = uuidv4();
      
      await prisma.prediction.create({
        data: {
          id: predictionId,
          reportId,
          predictionId: `PRED-${Date.now()}`,
          provider: 'mock',
          modelStatus: 'MOCK',
          isSimulated: true,
          predictedDisease: bestMatch.disease,
          confidence: bestMatch.confidence,
          confidenceInterpretation: this.getConfidenceInterpretation(bestMatch.confidence),
          severity: bestMatch.severity,
          supportingSymptoms: symptomNames.slice(0, 5),
          recommendations: this.getRecommendations(bestMatch.disease),
          disclaimer: 'This is a simulated AI prediction for demonstration purposes. Please consult a veterinarian for official diagnosis.',
          status: 'COMPLETED',
        },
      });

      // Update report status
      await prisma.healthReport.update({
        where: { id: reportId },
        data: { status: 'AI_COMPLETED' },
      });
    } catch (error) {
      console.error('Prediction processing error:', error);
      
      await prisma.prediction.create({
        data: {
          reportId,
          predictionId: `PRED-ERROR-${Date.now()}`,
          provider: 'mock',
          modelStatus: 'ERROR',
          isSimulated: true,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          disclaimer: 'Prediction service encountered an error.',
        },
      });
    }
  }

  async getPrediction(reportId: string): Promise<any> {
    return prisma.prediction.findUnique({
      where: { reportId },
      include: { candidates: true },
    });
  }

  private getConfidenceInterpretation(confidence: number): string {
    if (confidence >= 0.9) return 'Very High Confidence';
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    if (confidence >= 0.4) return 'Low Confidence';
    return 'Very Low Confidence';
  }

  private getRecommendations(disease: string): string[] {
    const recommendations: Record<string, string[]> = {
      'Foot and Mouth Disease': [
        'Isolate affected animals immediately',
        'Notify local veterinary authorities',
        'Vaccinate unaffected animals',
        'Implement biosecurity measures',
        'Disinfect premises and equipment',
      ],
      'Bovine Respiratory Disease': [
        'Provide antibiotic treatment as prescribed',
        'Ensure adequate ventilation',
        'Isolate affected animals',
        'Monitor temperature regularly',
        'Provide supportive care',
      ],
      'Mastitis': [
        'Milk out affected quarter frequently',
        'Apply udder ointment',
        'Administer antibiotics if prescribed',
        'Keep udder clean and dry',
        'Monitor milk quality',
      ],
    };

    return recommendations[disease] || [
      'Consult a veterinarian immediately',
      'Isolate affected animal',
      'Monitor symptoms closely',
      'Maintain hygiene',
      'Document observations',
    ];
  }
}

export const predictionService = new PredictionService();