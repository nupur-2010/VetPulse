import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Microscope, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Stethoscope, 
  Clock, 
  CheckCircle2,
  FileCheck2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { reportsApi } from '@/services/api'
import { formatDateTime } from '@/lib/utils'

export function AssessmentResult() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  })

  const consultMutation = useMutation({
    mutationFn: (notes?: string) => reportsApi.requestConsultation(id!, notes),
    onSuccess: () => {
      setRequestSuccess(true)
      setRequestError(null)
      queryClient.invalidateQueries({ queryKey: ['reports', id] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      window.alert('Confirmation has been sent! Your consultation request has been submitted to veterinarians in your state.')
    },
    onError: (err: any) => {
      setRequestError(err.response?.data?.message || err.message || 'Failed to request consultation')
    },
  })

  if (isLoading) {
    return <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">Report not found</p>
        <Link to="/farmer" className="text-primary hover:underline mt-2 inline-block">Back to dashboard</Link>
      </div>
    )
  }

  const prediction = report.prediction
  const confidence = prediction?.confidence ?? 0
  const isHigh = confidence >= 0.7
  const isMedium = confidence >= 0.4 && confidence < 0.7
  const isLowConfidence = confidence < 0.4

  const isConsultationRequested = report.consultationRequested || requestSuccess
  const vetReview = report.vetReview || prediction?.vetReviews?.[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 page-enter">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900">Assessment Result</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 font-mono text-stone-600">
                {report.reportNumber}
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Submitted: {formatDateTime(report.createdAt)}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>{report.village ? `${report.village}, ` : ''}{report.district}, {report.state}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConsultationRequested && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Consultation Sent
            </span>
          )}
          <Badge variant={
            report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED'
              ? 'success'
              : report.status === 'AI_COMPLETED'
              ? 'info'
              : 'warning'
          }>
            {report.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Demo Warning */}
      {prediction?.isSimulated && (
        <Card className="border-yellow-400 bg-yellow-50/70">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 text-sm">DEMO RESULT</h3>
                <p className="text-xs text-yellow-700 mt-0.5">
                  This assessment is simulated for demonstration purposes. Official diagnosis is confirmed by veterinarians.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Prediction Card */}
      <Card className="border-emerald-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-950 to-teal-900 text-white py-4">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2 text-white">
              <Microscope className="w-5 h-5 text-emerald-400" />
              AI Condition Assessment
            </div>
            <span className="text-xs font-normal text-emerald-200">
              Evaluated {formatDateTime(prediction?.predictionTimestamp || report.createdAt)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          {prediction ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Suspected Condition</span>
                  <h3 className="text-2xl font-black text-stone-900 mt-1">
                    {prediction.predictedDisease || 'General Malaise'}
                  </h3>
                </div>
                {prediction.confidence !== null && prediction.confidence !== undefined && (
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-stone-500 block mb-1">AI Confidence Level</span>
                    <div className="flex items-center sm:justify-end gap-2">
                      <span className="font-black text-xl text-stone-900">
                        {Math.round(confidence * 100)}%
                      </span>
                      <Badge variant={isHigh ? 'success' : isMedium ? 'warning' : 'danger'}>
                        {isHigh ? 'High Confidence' : isMedium ? 'Medium Confidence' : 'Low Confidence'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {prediction.severity && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-600">Severity Assessment:</span>
                  <Badge
                    variant={
                      prediction.severity.toLowerCase() === 'critical' ? 'danger' :
                      prediction.severity.toLowerCase() === 'high' ? 'warning' :
                      prediction.severity.toLowerCase() === 'medium' ? 'info' : 'default'
                    }
                  >
                    {prediction.severity.toUpperCase()}
                  </Badge>
                </div>
              )}

              {/* Supporting Symptoms */}
              {((prediction.supportingSymptoms && prediction.supportingSymptoms.length > 0) ||
                (report.symptoms && report.symptoms.length > 0)) && (
                <div>
                  <h4 className="text-sm font-bold text-stone-900 mb-2">Observed Supporting Symptoms</h4>
                  <div className="flex flex-wrap gap-2">
                    {(prediction.supportingSymptoms?.length ? prediction.supportingSymptoms : (report.symptoms || []).map((s: any) => s.symptomName)).map((s: string, i: number) => (
                      <Badge key={i} variant="info">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <h4 className="text-sm font-bold text-emerald-950 mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Immediate Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {prediction.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-emerald-900 font-medium">
                        <span className="text-emerald-500 font-bold">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-stone-200">
                <p className="text-xs text-stone-500 italic">{prediction.disclaimer}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Info className="w-12 h-12 mx-auto text-stone-400 mb-3" />
              <p className="text-stone-600 font-semibold">No AI prediction available yet</p>
              <p className="text-sm text-stone-500 mt-1">
                The assessment is being processed or awaiting veterinarian confirmation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Veterinarian Review Card (Visible if reviewed) */}
      {vetReview && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 shadow-md">
          <CardHeader className="border-b border-teal-100 pb-3">
            <CardTitle className="text-base font-bold text-teal-950 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-700" />
              Veterinarian Review & Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-teal-100 text-xs sm:text-sm">
              <div>
                <span className="text-stone-500">Reviewing Doctor:</span>{' '}
                <span className="font-bold text-stone-900">
                  Dr. {vetReview.vet?.firstName} {vetReview.vet?.lastName}
                </span>
                {vetReview.vet?.specialization && (
                  <span className="text-stone-500 text-xs ml-1.5">({vetReview.vet.specialization})</span>
                )}
              </div>
              <div className="text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Reviewed on: {formatDateTime(vetReview.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Doctor's Decision
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={
                  vetReview.decision === 'AGREES_AI' ? 'success' :
                  vetReview.decision === 'ALTERNATIVE_DISEASE' ? 'warning' : 'info'
                }>
                  {vetReview.decision === 'AGREES_AI' ? 'Agreed with AI Diagnosis' :
                   vetReview.decision === 'ALTERNATIVE_DISEASE' ? 'Alternative Disease Suspected' :
                   vetReview.decision === 'DISAGREES_AI' ? 'Disagrees with AI' :
                   vetReview.decision === 'NEEDS_EXAMINATION' ? 'Needs Further Examination' :
                   vetReview.decision?.replace('_', ' ')}
                </Badge>
                {vetReview.alternativeDiagnosis && (
                  <span className="text-xs font-bold text-stone-800">
                    Diagnosis: {vetReview.alternativeDiagnosis}
                  </span>
                )}
              </div>
            </div>

            {/* Doctor's Remarks */}
            <div className="p-3.5 bg-white rounded-xl border border-teal-200">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block mb-1">
                Clinical Remarks & Findings:
              </span>
              <p className="text-sm text-stone-800 whitespace-pre-wrap font-medium">
                {vetReview.notes || 'No specific remarks entered by the veterinarian.'}
              </p>
            </div>

            {vetReview.recommendedActions && (
              <div className="p-3.5 bg-emerald-100/60 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block mb-1">
                  Doctor's Recommended Actions:
                </span>
                <p className="text-sm text-emerald-950 font-medium">
                  {vetReview.recommendedActions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultation Request & Status Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-stone-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Veterinary Consultation & Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requestSuccess && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3 text-emerald-900 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Consultation request submitted! A verified veterinarian in your state ({report.state}) has been notified.</span>
            </div>
          )}

          {requestError && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700">
              {requestError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-start gap-3">
              {report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED' ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : isConsultationRequested ? (
                <Clock className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-stone-900">
                  {report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED'
                    ? 'Report Reviewed by Veterinarian'
                    : isConsultationRequested
                    ? 'Consultation Requested'
                    : 'Awaiting Review'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED'
                    ? 'A qualified doctor has reviewed this case. See clinical remarks above.'
                    : isConsultationRequested
                    ? 'Your consultation request is in the state veterinary queue.'
                    : 'Submitted report is visible to certified veterinarians in your state.'}
                </p>
              </div>
            </div>

            {/* Request Consultation Option: Only allowed when Confidence is Medium or High */}
            {report.status !== 'VET_REVIEWED' && report.status !== 'CONFIRMED' && (
              <div>
                {isConsultationRequested ? (
                  <Button
                    disabled
                    className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs opacity-90 cursor-not-allowed hover:bg-emerald-100 shadow-sm"
                  >
                    ✓ Consultation Sent
                  </Button>
                ) : isLowConfidence ? (
                  // Low Confidence -> Request consultation option is NOT available
                  <div className="text-xs text-stone-500 max-w-xs text-right">
                    <span className="font-semibold text-amber-700 block">Consultation Unavailable</span>
                    <span className="text-[11px]">Only available for Medium or High confidence reports.</span>
                  </div>
                ) : (
                  // Medium or High Confidence -> Request consultation option is displayed
                  <Button
                    onClick={() => consultMutation.mutate()}
                    isLoading={consultMutation.isPending}
                    className="btn-pasture text-xs font-bold"
                  >
                    Request Consultation
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Low Confidence Notice Box */}
          {isLowConfidence && !isConsultationRequested && report.status !== 'VET_REVIEWED' && (
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Consultation Request Policy:</span>
                Due to low AI confidence ({Math.round(confidence * 100)}%), consultation request is disabled to prevent premature referral. Please closely observe your cattle. If symptoms persist or worsen, submit an updated report with additional symptoms or clearer photos.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to={`/farmer/reports/${report.id}`}>
          <Button variant="outline" className="rounded-xl">View Report Details</Button>
        </Link>
        <Link to="/farmer/reports/new">
          <Button className="btn-sunset rounded-xl">Submit Another Report</Button>
        </Link>
        <Link to="/farmer">
          <Button variant="outline" className="rounded-xl">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
