import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Microscope, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Tag, 
  Weight, 
  Thermometer, 
  ImageIcon, 
  CheckCircle, 
  FileText, 
  Stethoscope,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { reportsApi, reviewsApi } from '@/services/api'
import { formatDateTime } from '@/lib/utils'

export function VetReportReview() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [decision, setDecision] = useState('')
  const [remarks, setRemarks] = useState('')
  const [alternativeDiagnosis, setAlternativeDiagnosis] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  })

  // Pre-fill existing review if available
  useEffect(() => {
    if (report?.vetReview) {
      setDecision(report.vetReview.decision || '')
      setRemarks(report.vetReview.notes || '')
      setAlternativeDiagnosis(report.vetReview.alternativeDiagnosis || '')
      setRecommendedActions(report.vetReview.recommendedActions || '')
    }
  }, [report])

  const reviewMutation = useMutation({
    mutationFn: (data: any) => reviewsApi.create(data),
    onSuccess: () => {
      setSubmitSuccess(true)
      setSubmitError(null)
      queryClient.invalidateQueries({ queryKey: ['reports', id] })
      queryClient.invalidateQueries({ queryKey: ['vet-reports'] })
    },
    onError: (err: any) => {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit review')
    },
  })

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!decision) {
      setSubmitError('Please select a review decision')
      return
    }

    if (decision === 'ALTERNATIVE_DISEASE' && !alternativeDiagnosis.trim()) {
      setSubmitError('Please enter the alternative suspected disease')
      return
    }

    setSubmitError(null)
    reviewMutation.mutate({
      reportId: id,
      decision,
      remarks,
      clinicalFindings: remarks,
      alternativeDiagnosis: alternativeDiagnosis.trim() || undefined,
      suspectedDisease: alternativeDiagnosis.trim() || undefined,
      recommendedActions: recommendedActions.trim() || undefined,
    })
  }

  if (isLoading) {
    return <div className="h-96 bg-stone-100 rounded-2xl animate-pulse" />
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600 font-semibold">Report not found</p>
        <Link to="/vet/reports" className="text-teal-700 hover:underline mt-2 inline-block">
          Back to Reports List
        </Link>
      </div>
    )
  }

  const prediction = report.prediction
  const farmer = report.farmer
  const cattle = report.cattle
  const photos = report.photos || []
  const isReviewed = report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED' || !!report.vetReview

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 page-enter">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/vet/reports" className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900">Clinical Review</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold">
                {report.reportNumber}
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Submission Time & Date: <strong className="text-stone-700 font-medium">{formatDateTime(report.createdAt)}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={
            report.status === 'CONFIRMED' ? 'danger' :
            report.status === 'VET_REVIEWED' ? 'success' :
            report.status === 'AI_COMPLETED' ? 'warning' : 'default'
          }>
            {report.status.replace('_', ' ')}
          </Badge>
          {report.consultationRequested && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              Consultation Requested
            </span>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Review Submitted Successfully</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your assessment, clinical remarks, and recommended actions are now visible to the farmer.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 2-Column Grid: Farmer & Animal Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Farmer Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-700" />
              Farmer & Farm Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-stone-100">
              <span className="text-stone-500">Farmer Name</span>
              <span className="font-bold text-stone-900">
                {farmer ? `${farmer.firstName} ${farmer.lastName}` : 'Registered Farmer'}
              </span>
            </div>

            {farmer?.phone && (
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" /> Contact Phone
                </span>
                <a href={`tel:${farmer.phone}`} className="font-semibold text-teal-700 hover:underline">
                  {farmer.phone}
                </a>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-stone-100">
              <span className="text-stone-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" /> Location
              </span>
              <span className="font-semibold text-stone-800 text-right">
                {report.village ? `${report.village}, ` : ''}{report.district}, {report.state}
              </span>
            </div>

            {report.latitude && report.longitude && (
              <div className="flex justify-between py-1 border-b border-stone-100 text-xs">
                <span className="text-stone-400">GPS Coordinates</span>
                <span className="font-mono text-stone-600">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
              </div>
            )}

            {cattle?.farm?.name && (
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Farm</span>
                <span className="font-medium text-stone-800">{cattle.farm.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cattle Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Animal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-stone-100">
              <span className="text-stone-500">Animal Tag / Name</span>
              <span className="font-bold text-stone-900 font-mono">
                {cattle?.tagNumber || 'N/A'} {cattle?.name ? `(${cattle.name})` : ''}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-stone-100">
              <span className="text-stone-500">Breed</span>
              <span className="font-semibold text-stone-800">{cattle?.breed || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-stone-100">
              <span className="text-stone-500">Gender</span>
              <span className="font-medium text-stone-800">{cattle?.gender || 'N/A'}</span>
            </div>

            {cattle?.weight && (
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-stone-400" /> Weight
                </span>
                <span className="font-medium text-stone-800">{cattle.weight} kg</span>
              </div>
            )}

            {cattle?.identificationMarks && (
              <div className="py-1">
                <span className="text-xs text-stone-400 block mb-0.5">Ident. Marks:</span>
                <span className="text-xs font-medium text-stone-700 bg-stone-50 p-2 rounded block">
                  {cattle.identificationMarks}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinical Observations Provided by Farmer */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-sunset" />
            Clinical Observations Submitted by Farmer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block">Temperature</span>
              <span className="text-base font-bold text-stone-900 mt-0.5 block">
                {report.temperature ? `${report.temperature}°C` : 'Not recorded'}
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block">Symptom Duration</span>
              <span className="text-sm font-bold text-stone-900 mt-0.5 block">{report.symptomDuration}</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block">Reported Severity</span>
              <Badge variant={report.severity === 'critical' ? 'danger' : report.severity === 'severe' ? 'warning' : 'info'} className="mt-1">
                {report.severity}
              </Badge>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-500 block">Date & Time</span>
              <span className="text-xs font-bold text-stone-800 mt-0.5 block">{formatDateTime(report.createdAt)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Observed Symptoms</h4>
            {report.symptoms && report.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.symptoms.map((s: any, i: number) => (
                  <Badge key={i} variant="info" className="py-1 px-3 text-xs">{s.symptomName}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500">No specific symptoms checked</p>
            )}
          </div>

          {report.additionalNotes && (
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
                Farmer's Notes & Observations:
              </span>
              <p className="text-sm text-stone-800 whitespace-pre-wrap">{report.additionalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Images Gallery (Crucial requirement: all information including images must be visible to the vet) */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-teal-700" />
              Uploaded Animal Photos ({photos.length})
            </CardTitle>
            <span className="text-xs text-stone-500">Photos uploaded by the farmer during submission</span>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              <ImageIcon className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-xs font-medium">No photos were uploaded with this report</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {photos.map((photo: any, index: number) => (
                <div
                  key={index}
                  onClick={() => setSelectedPhoto(photo.photoUrl)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-stone-200 hover:border-teal-500 cursor-pointer shadow-sm hover:shadow-md transition-all bg-stone-100"
                >
                  <img
                    src={photo.photoUrl}
                    alt={`Cattle report photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
                    <span className="text-xs font-bold">Inspect Photo</span>
                    <span className="text-[10px] text-white/80 mt-0.5">Click to enlarge</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center text-base font-bold z-10 hover:bg-black"
            >
              ×
            </button>
            <img src={selectedPhoto} alt="Full view" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* AI Prediction Summary */}
      {prediction && (
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Microscope className="w-5 h-5 text-emerald-600" />
                AI Model Suggestion
              </CardTitle>
              {prediction.isSimulated && <Badge variant="warning">DEMO RESULT</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-stone-500 font-semibold block">Suggested Condition</span>
                <h4 className="font-black text-xl text-stone-900 mt-0.5">
                  {prediction.predictedDisease || 'No prediction'}
                </h4>
              </div>
              {prediction.confidence !== null && prediction.confidence !== undefined && (
                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 block">AI Confidence</span>
                  <span className="text-lg font-black text-emerald-800">
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>

            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  AI Protocol Recommendations
                </h5>
                <ul className="space-y-1">
                  {prediction.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5 font-medium">
                      <span className="text-emerald-600 font-bold">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Review Preview (if already reviewed) */}
      {isReviewed && report.vetReview && (
        <Card className="border-teal-300 bg-teal-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-teal-950 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-700" />
              Existing Review On Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500">Submitted by:</span>
              <span className="font-bold text-stone-800">
                Dr. {report.vetReview.vet?.firstName} {report.vetReview.vet?.lastName}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-500">Review Timestamp:</span>
              <span className="font-medium text-stone-800">{formatDateTime(report.vetReview.createdAt)}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-teal-200">
              <span className="text-xs font-bold text-teal-900 block mb-1">Clinical Remarks:</span>
              <p className="text-stone-800 text-sm whitespace-pre-wrap">{report.vetReview.notes}</p>
            </div>
            {report.vetReview.recommendedActions && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-950 block mb-1">Recommended Actions:</span>
                <p className="text-emerald-950">{report.vetReview.recommendedActions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Veterinarian Review Submission Form */}
      <Card className="shadow-md border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-900 to-emerald-900 text-white rounded-t-xl py-4">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-300" />
            {isReviewed ? 'Update Clinical Review & Remarks' : 'Submit Veterinarian Review & Remarks'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <Select
              label="Review Decision *"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              options={[
                { value: 'AGREES_AI', label: 'Agrees with AI suggestion (Confirmed Diagnosis)' },
                { value: 'ALTERNATIVE_DISEASE', label: 'Alternative suspected disease' },
                { value: 'DISAGREES_AI', label: 'Disagrees with AI suggestion' },
                { value: 'NEEDS_EXAMINATION', label: 'Needs physical / further examination' },
                { value: 'INCONCLUSIVE', label: 'Inconclusive / More data required' },
              ]}
              placeholder="-- Select your veterinary evaluation --"
            />

            {decision === 'ALTERNATIVE_DISEASE' && (
              <Input
                label="Alternative Suspected Condition *"
                placeholder="e.g. Foot Rot, Babesiosis, Pneumonia"
                value={alternativeDiagnosis}
                onChange={(e) => setAlternativeDiagnosis(e.target.value)}
                required
              />
            )}

            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-1.5">
                Clinical Remarks & Assessment Notes *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all resize-none"
                placeholder="Enter your clinical observations, findings, and advice for the farmer. These remarks will be directly visible to the farmer..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-1.5">
                Recommended Actions & Treatment Guidance (Optional)
              </label>
              <textarea
                value={recommendedActions}
                onChange={(e) => setRecommendedActions(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all resize-none"
                placeholder="Recommended medication, quarantine instructions, hygiene, feeding adjustments..."
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="submit"
                isLoading={reviewMutation.isPending}
                className="btn-pasture px-8 py-3 rounded-xl font-bold shadow-md"
              >
                {isReviewed ? 'Update Review & Remarks' : 'Submit Review to Farmer'}
              </Button>
              <Link to="/vet/reports">
                <Button type="button" variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
