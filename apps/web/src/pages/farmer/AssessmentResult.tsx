import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Info, Microscope, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { reportsApi } from '@/services/api'

export function AssessmentResult() {
  const { id } = useParams<{ id: string }>()
  
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">Report not found</p>
      </div>
    )
  }

  const prediction = report.prediction

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Assessment Result</h1>
          <p className="text-stone-600">{report.reportNumber}</p>
        </div>
      </div>

      {/* Main Prediction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            AI-Suggested Condition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {prediction ? (
            <>
              <div>
                <h3 className="text-2xl font-bold text-stone-900">
                  {prediction.predictedDisease || 'No prediction available'}
                </h3>
                {prediction.confidence && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-stone-600">Confidence:</span>
                    <span className="font-semibold text-primary">
                      {Math.round(prediction.confidence * 100)}%
                    </span>
                    <Badge variant={prediction.confidence >= 0.7 ? 'success' : prediction.confidence >= 0.4 ? 'warning' : 'danger'}>
                      {prediction.confidence >= 0.7 ? 'High' : prediction.confidence >= 0.4 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                )}
              </div>

              {prediction.severity && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-600">Severity:</span>
                  <Badge
                    variant={
                      prediction.severity === 'critical' ? 'danger' :
                      prediction.severity === 'high' ? 'warning' :
                      prediction.severity === 'medium' ? 'info' : 'default'
                    }
                  >
                    {prediction.severity.toUpperCase()}
                  </Badge>
                </div>
              )}

              {((prediction.candidates?.length ?? 0) > 0 || (prediction.possible_conditions?.length ?? 0) > 0) && (
                <div>
                  <h4 className="font-medium mb-2">Class Probabilities</h4>
                  <div className="space-y-2">
                    {(prediction.candidates ?? prediction.possible_conditions ?? []).map((condition: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                        <span className="font-medium">{condition.disease}</span>
                        <span className="text-sm text-stone-600">
                          {Math.round((condition.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(prediction.supportingSymptoms || prediction.supporting_symptoms) && (prediction.supportingSymptoms || prediction.supporting_symptoms)!.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Contributing Factors</h4>
                  <div className="flex flex-wrap gap-2">
                    {(prediction.supportingSymptoms || prediction.supporting_symptoms)!.map((s: string, i: number) => (
                      <Badge key={i} variant="info">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {prediction.imageAssessmentStatus && prediction.imageAssessmentStatus !== 'not_analyzed' && (
                <div>
                  <h4 className="font-medium mb-2">Image Analysis</h4>
                  <p className="text-sm text-stone-600">
                    {prediction.imageAssessmentNote || 'Uploaded photo analyzed by the vision model.'}
                  </p>
                </div>
              )}

              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {prediction.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-stone-700">
                        <span className="text-primary mt-1">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-500">{prediction.disclaimer}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Info className="w-12 h-12 mx-auto text-stone-400 mb-3" />
              <p className="text-stone-600">No prediction available for this report</p>
              <p className="text-sm text-stone-500 mt-1">
                The AI assessment may still be processing or unavailable
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Status */}
      <Card>
        <CardHeader><CardTitle>Report Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {report.status === 'VET_REVIEWED' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              )}
              <div>
                <p className="font-medium">{report.status.replace('_', ' ')}</p>
                <p className="text-sm text-stone-500">
                  {report.status === 'VET_REVIEWED' 
                    ? 'This report has been reviewed by a veterinarian'
                    : 'Awaiting veterinary review'}
                </p>
              </div>
            </div>
            {report.status !== 'VET_REVIEWED' && report.status !== 'CONFIRMED' && (
              <Link to={`/farmer/reports/${report.id}`}>
                <Button variant="outline">Request Consultation</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link to="/farmer/reports/new">
          <Button>Submit Another Report</Button>
        </Link>
        <Link to="/farmer">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
