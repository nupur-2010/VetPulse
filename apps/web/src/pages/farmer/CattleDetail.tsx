import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Calendar, 
  Weight, 
  BookOpen, 
  Tag, 
  Activity, 
  Stethoscope, 
  Clock, 
  Plus, 
  FileText,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cattleApi } from '@/services/api'
import { formatDate, formatDateTime } from '@/lib/utils'

export function CattleDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: cattle, isLoading: isCattleLoading } = useQuery({
    queryKey: ['cattle', id],
    queryFn: () => cattleApi.get(id!),
    enabled: !!id,
  })

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['cattle', id, 'history'],
    queryFn: () => cattleApi.getHistory(id!),
    enabled: !!id,
  })

  const isLoading = isCattleLoading || isHistoryLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-stone-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-stone-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!cattle) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600 font-semibold">Cattle not found</p>
        <Link to="/farmer/cattle" className="text-primary hover:underline mt-2 inline-block">
          Back to cattle list
        </Link>
      </div>
    )
  }

  // Combine history from historyData or from cattle.healthReports
  const rawReports = Array.isArray(historyData) && historyData.length > 0 
    ? historyData 
    : (cattle.healthReports || [])

  const healthReports: any[] = rawReports

  const latestReport = healthReports[0]
  const latestCondition = latestReport?.prediction?.predictedDisease || (latestReport?.symptoms?.[0]?.symptomName ? `Symptoms: ${latestReport.symptoms[0].symptomName}` : 'No known condition')
  const isCurrentlyUnderReview = latestReport?.status === 'AI_COMPLETED' || latestReport?.status === 'PENDING'
  const isHealthy = healthReports.length === 0 || (!isCurrentlyUnderReview && latestReport?.status !== 'CONFIRMED')

  return (
    <div className="space-y-6 pb-12 page-enter">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/farmer/cattle" className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-stone-900">
                {cattle.name || cattle.tagNumber}
              </h1>
              <Badge variant={cattle.isActive ? 'success' : 'default'}>
                {cattle.isActive ? 'Active in Herd' : 'Archived'}
              </Badge>
            </div>
            <p className="text-stone-500 text-xs mt-0.5">
              {cattle.breed} • Tag: <span className="font-mono font-semibold text-stone-700">{cattle.tagNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to="/farmer/reports/new">
            <Button className="btn-sunset rounded-xl text-xs font-bold gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              Submit Health Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Grid: Cattle Information & Health Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cattle Information Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-700" />
              Animal Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-stone-400" /> Tag Number
                </span>
                <span className="font-mono font-bold text-stone-900">{cattle.tagNumber}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500">Gender</span>
                <span className="font-semibold text-stone-800">{cattle.gender}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500">Breed</span>
                <span className="font-semibold text-stone-800">{cattle.breed}</span>
              </div>

              {cattle.dateOfBirth && (
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400" /> Date of Birth
                  </span>
                  <span className="font-medium text-stone-800">{formatDate(cattle.dateOfBirth)}</span>
                </div>
              )}

              {cattle.weight && (
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500 flex items-center gap-2">
                    <Weight className="w-4 h-4 text-stone-400" /> Weight
                  </span>
                  <span className="font-bold text-stone-900">{cattle.weight} kg</span>
                </div>
              )}

              {cattle.pregnancyStatus && cattle.pregnancyStatus !== 'UNKNOWN' && (
                <div className="flex justify-between items-center py-1 border-b border-stone-100">
                  <span className="text-stone-500">Pregnancy Status</span>
                  <Badge variant={cattle.pregnancyStatus === 'PREGNANT' ? 'success' : 'default'}>
                    {cattle.pregnancyStatus.replace('_', ' ')}
                  </Badge>
                </div>
              )}

              {cattle.identificationMarks && (
                <div className="pt-2">
                  <span className="text-xs text-stone-400 block mb-0.5">Identification Marks</span>
                  <p className="font-medium text-stone-800 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    {cattle.identificationMarks}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Summary Card */}
        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Health Summary
              </CardTitle>
              <Badge variant={
                isCurrentlyUnderReview ? 'warning' :
                latestReport?.status === 'CONFIRMED' ? 'danger' :
                isHealthy ? 'success' : 'info'
              }>
                {isCurrentlyUnderReview ? 'Active Health Alert' :
                 latestReport?.status === 'CONFIRMED' ? 'Confirmed Disease' :
                 'Healthy / Stable'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {healthReports.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-stone-800 text-sm">No Health Issues Recorded</p>
                <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                  No sickness or disease reports have been submitted for this cattle.
                </p>
                <Link to="/farmer/reports/new" className="inline-block mt-4">
                  <Button size="sm" variant="outline" className="text-xs">
                    Submit Health Report
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-500 block font-medium">Total Reports</span>
                    <span className="text-xl font-black text-stone-900 mt-0.5 block">{healthReports.length}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-500 block font-medium">Latest Status</span>
                    <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
                      {latestReport?.status?.replace('_', ' ') || 'Normal'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Latest Report Date & Time:
                    </span>
                    <span className="font-bold text-stone-800">
                      {formatDateTime(latestReport.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-stone-100">
                    <span className="text-stone-500">Latest Condition:</span>
                    <span className="font-bold text-stone-900">{latestCondition}</span>
                  </div>

                  {latestReport.vetReview && (
                    <div className="pt-2 border-t border-stone-100 text-xs">
                      <div className="flex items-center gap-1.5 text-teal-800 font-bold mb-1">
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Doctor's Remarks:</span>
                      </div>
                      <p className="text-stone-700 bg-stone-50 p-2 rounded-lg italic">
                        "{latestReport.vetReview.notes || 'Review completed'}"
                      </p>
                    </div>
                  )}
                </div>

                <Link to={`/farmer/reports/${latestReport.id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between">
                    <span>View Latest Full Report</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health History Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Health History ({healthReports.length})
            </CardTitle>
            <span className="text-xs text-stone-500">Every report with recorded time and doctor review</span>
          </div>
        </CardHeader>
        <CardContent>
          {healthReports.length === 0 ? (
            <EmptyState
              title="No health history"
              description="No health reports or clinical assessments have been filed for this animal."
              action={
                <Link to="/farmer/reports/new">
                  <Button className="btn-pasture text-xs mt-2">Submit First Report</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {healthReports.map((report) => {
                const disease = report.prediction?.predictedDisease || 'Health Assessment'
                const hasVetReview = report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED' || !!report.vetReview
                const reviewNote = report.vetReview?.notes

                return (
                  <div
                    key={report.id}
                    className={`p-4 rounded-xl border transition-all bg-white ${
                      hasVetReview
                        ? 'border-l-4 border-l-emerald-600 border-emerald-200 bg-emerald-50/20 shadow-sm'
                        : 'border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/farmer/assessments/${report.id}`}
                            className="font-bold text-stone-900 hover:text-emerald-700 font-mono text-sm"
                          >
                            {report.reportNumber}
                          </Link>
                          {hasVetReview ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmed & Reviewed
                            </span>
                          ) : (
                            <Badge
                              variant={
                                report.status === 'AI_COMPLETED' ? 'info' : 'warning'
                              }
                            >
                              {report.status.replace('_', ' ')}
                            </Badge>
                          )}
                          {report.consultationRequested && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Consultation Sent
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>Submitted: <strong className="text-stone-700 font-medium">{formatDateTime(report.createdAt)}</strong></span>
                          {report.temperature && <span>• Temp: {report.temperature}°C</span>}
                          {report.severity && <span>• Severity: {report.severity}</span>}
                        </p>

                        <div className="mt-2 text-xs">
                          <span className="text-stone-500">Condition: </span>
                          <span className="font-bold text-stone-900">{disease}</span>
                          {report.prediction?.confidence && (
                            <span className="text-stone-500 ml-1.5">
                              ({Math.round(report.prediction.confidence * 100)}% confidence)
                            </span>
                          )}
                        </div>

                        {/* Symptoms snippet */}
                        {report.symptoms && report.symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {report.symptoms.slice(0, 4).map((s: any, idx: number) => (
                              <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                                {s.symptomName || s}
                              </span>
                            ))}
                            {report.symptoms.length > 4 && (
                              <span className="text-[11px] text-stone-400 self-center">
                                +{report.symptoms.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Vet review note preview */}
                        {reviewNote && (
                          <div className="mt-2.5 p-2 rounded-lg bg-teal-50/70 border border-teal-100 text-xs text-teal-950">
                            <span className="font-bold">Doctor's Remark:</span> "{reviewNote}"
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Link to={`/farmer/assessments/${report.id}`}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            Assessment
                          </Button>
                        </Link>
                        <Link to={`/farmer/reports/${report.id}`}>
                          <Button size="sm" className="w-full text-xs btn-pasture">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
