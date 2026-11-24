import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Stethoscope, 
  Clock, 
  ImageIcon, 
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { reportsApi } from '@/services/api'
import { formatDateTime } from '@/lib/utils'

export function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
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
    return <div className="h-64 bg-stone-100 rounded-xl animate-pulse" />
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">Report not found</p>
        <Link to="/farmer" className="text-primary hover:underline mt-2 inline-block">Back to dashboard</Link>
      </div>
    )
  }

  const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle },
    AI_COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', icon: FileText },
    VET_REVIEWED: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
    CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  }

  const config = statusConfig[report.status] || statusConfig.PENDING
  const StatusIcon = config.icon

  const prediction = report.prediction
  const confidence = prediction?.confidence ?? 0
  const isLowConfidence = confidence < 0.4
  const isConsultationRequested = report.consultationRequested || requestSuccess
  const vetReview = report.vetReview || prediction?.vetReviews?.[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900">{report.reportNumber}</h1>
            <div className={`px-3 py-1 rounded-full ${config.bg} ${config.text} flex items-center gap-1.5 text-xs font-semibold`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{report.status.replace('_', ' ')}</span>
            </div>
            {isConsultationRequested && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Consultation Sent
              </span>
            )}
          </div>
          <p className="text-stone-500 text-xs mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Submitted on {formatDateTime(report.createdAt)}</span>
          </p>
        </div>
      </div>

      {/* Basic Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-bold">Report Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Submission Date & Time</span>
              <span className="font-semibold text-stone-800">{formatDateTime(report.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Animal</span>
              <span className="font-semibold text-stone-800">
                {report.cattle?.name ? `${report.cattle.name} (${report.cattle.tagNumber})` : (report.cattle?.tagNumber || 'Unknown')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Breed</span>
              <span className="font-medium text-stone-800">{report.cattle?.breed || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Duration</span>
              <span className="font-medium text-stone-800">{report.symptomDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Severity</span>
              <Badge variant={report.severity === 'critical' ? 'danger' : report.severity === 'severe' ? 'warning' : 'info'}>
                {report.severity}
              </Badge>
            </div>
            {report.temperature && (
              <div className="flex justify-between">
                <span className="text-stone-500">Body Temperature</span>
                <span className="font-bold text-stone-900">{report.temperature}°C</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-bold">Location & Origin</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-stone-700">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{report.village ? `${report.village}, ` : ''}{report.district}, {report.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">District</span>
              <span className="font-semibold text-stone-800">{report.district}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">State</span>
              <span className="font-semibold text-stone-800">{report.state}</span>
            </div>
            {report.latitude && report.longitude && (
              <div className="flex justify-between text-xs text-stone-400">
                <span>GPS Coordinates</span>
                <span className="font-mono">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Symptoms */}
      <Card>
        <CardHeader><CardTitle className="text-base font-bold">Observed Symptoms</CardTitle></CardHeader>
        <CardContent>
          {report.symptoms && report.symptoms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.symptoms.map((s: any, i: number) => (
                <Badge key={i} variant="info" className="py-1 px-2.5">{s.symptomName}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-stone-500 text-sm">No symptoms recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      {report.additionalNotes && (
        <Card>
          <CardHeader><CardTitle className="text-base font-bold">Additional Notes from Farmer</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-stone-800 whitespace-pre-wrap">{report.additionalNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attached Photos */}
      {report.photos && report.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Attached Photos ({report.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {report.photos.map((p: any, i: number) => (
                <div
                  key={i}
                  onClick={() => setSelectedPhoto(p.photoUrl)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-stone-200 cursor-pointer hover:shadow-md transition-all bg-stone-100"
                >
                  <img
                    src={p.photoUrl}
                    alt={`Report photo ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                    Click to view
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm font-bold z-10"
            >
              ×
            </button>
            <img src={selectedPhoto} alt="Full view" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* AI Assessment */}
      {report.prediction && (
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900">AI Disease Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-4 rounded-xl ${report.prediction.isSimulated ? 'bg-yellow-50/70 border border-yellow-200' : 'bg-emerald-50/70 border border-emerald-200'}`}>
              {report.prediction.isSimulated && (
                <p className="text-xs text-yellow-700 font-semibold mb-1">⚠️ Simulated demonstration assessment</p>
              )}
              <h4 className="font-bold text-xl text-stone-900">{report.prediction.predictedDisease || 'No prediction'}</h4>
              <p className="text-sm text-stone-600 mt-1">
                Confidence: <span className="font-bold text-stone-900">{report.prediction.confidence ? `${Math.round(report.prediction.confidence * 100)}%` : 'N/A'}</span>
              </p>
              <p className="text-xs text-stone-500 mt-2 italic">{report.prediction.disclaimer}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Veterinarian Review Section */}
      {vetReview && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 shadow-md">
          <CardHeader className="border-b border-teal-100 pb-3">
            <CardTitle className="text-base font-bold text-teal-950 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-700" />
              Doctor Review & Clinical Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-teal-100 text-xs sm:text-sm">
              <div>
                <span className="text-stone-500">Doctor:</span>{' '}
                <span className="font-bold text-stone-900">
                  Dr. {vetReview.vet?.firstName} {vetReview.vet?.lastName}
                </span>
                {vetReview.vet?.specialization && (
                  <span className="text-stone-500 text-xs ml-1.5">({vetReview.vet.specialization})</span>
                )}
              </div>
              <div className="text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Reviewed: {formatDateTime(vetReview.createdAt)}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Decision</span>
              <Badge variant={vetReview.decision === 'AGREES_AI' ? 'success' : 'warning'}>
                {vetReview.decision?.replace('_', ' ')}
              </Badge>
              {vetReview.alternativeDiagnosis && (
                <p className="text-xs font-semibold text-stone-800 mt-1">
                  Alternative Diagnosis: {vetReview.alternativeDiagnosis}
                </p>
              )}
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-teal-200">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block mb-1">
                Clinical Remarks:
              </span>
              <p className="text-sm text-stone-800 whitespace-pre-wrap font-medium">
                {vetReview.notes || 'No remarks entered.'}
              </p>
            </div>

            {vetReview.recommendedActions && (
              <div className="p-3.5 bg-emerald-100/60 rounded-xl border border-emerald-200">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block mb-1">
                  Doctor's Recommendations:
                </span>
                <p className="text-sm text-emerald-950 font-medium">
                  {vetReview.recommendedActions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultation Request Option: Only when Medium or High Confidence */}
      {report.status !== 'VET_REVIEWED' && report.status !== 'CONFIRMED' && (
        <Card className="shadow-sm">
          <CardContent className="py-4">
            {requestSuccess && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Consultation request sent to veterinarians in your state ({report.state})!
              </div>
            )}
            {requestError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs mb-3">
                {requestError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-stone-900">Request Veterinary Consultation</p>
                <p className="text-xs text-stone-500">
                  {isConsultationRequested
                    ? 'A consultation request is already active for this report.'
                    : isLowConfidence
                    ? 'Consultation request is not available for low confidence reports.'
                    : 'Request an in-person or tele-consultation with a state veterinarian.'}
                </p>
              </div>

              <div>
                {isConsultationRequested ? (
                  <Button
                    disabled
                    className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs opacity-90 cursor-not-allowed hover:bg-emerald-100 shadow-sm"
                  >
                    ✓ Consultation Sent
                  </Button>
                ) : isLowConfidence ? (
                  <div className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Low Confidence (Unavailable)</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => consultMutation.mutate()}
                    isLoading={consultMutation.isPending}
                    className="btn-pasture text-xs font-bold"
                  >
                    Request Consultation
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Link to={`/farmer/assessments/${report.id}`}>
          <Button className="btn-pasture">View Assessment Details</Button>
        </Link>
        <Link to="/farmer">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
