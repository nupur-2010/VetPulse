import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, FileText, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { reportsApi } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export function VetReports() {
  const { vetProfile } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['vet-reports'],
    queryFn: () => reportsApi.list({ limit: 100 }),
  })

  const reports = data?.reports || []
  const vetState = vetProfile?.licenseState || 'Maharashtra'

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.cattle?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.cattle?.tagNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.prediction?.predictedDisease?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'ALL') return true
    if (statusFilter === 'PENDING') return report.status === 'PENDING' || report.status === 'AI_COMPLETED'
    if (statusFilter === 'REVIEWED') return report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED'
    return report.status === statusFilter
  })

  return (
    <div className="space-y-6 pb-12 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-700" />
            Health Reports
          </h1>
          <p className="text-stone-600 text-sm mt-0.5">
            All reports submitted by farmers in your state ({vetState})
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-900 rounded-xl border border-teal-200 text-xs font-semibold">
          <MapPin className="w-4 h-4 text-teal-700" />
          <span>Operating State: <strong>{vetState}</strong></span>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search by report number, animal, disease, district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === 'PENDING' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Awaiting Review ({reports.filter(r => r.status === 'PENDING' || r.status === 'AI_COMPLETED').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('REVIEWED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === 'REVIEWED' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Reviewed ({reports.filter(r => r.status === 'VET_REVIEWED' || r.status === 'CONFIRMED').length})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-stone-400" />}
              title="No health reports found"
              description={`There are currently no reports matching your filters from farmers in ${vetState}.`}
            />
          ) : (
            <div className="space-y-3">
              {filteredReports.map(report => {
                const confirmedDisease = report.vetReview?.alternativeDiagnosis
                const disease = confirmedDisease || report.prediction?.predictedDisease || 'Pending Assessment'
                const isReviewed = report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED' || !!report.vetReview

                return (
                  <Link
                    key={report.id}
                    to={`/vet/reports/${report.id}`}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 bg-white ${
                      isReviewed ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/10' : 'border-stone-200 hover:border-teal-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm hover:text-teal-700">
                          {report.reportNumber}
                        </span>
                        <Badge variant={
                          report.status === 'CONFIRMED' ? 'danger' :
                          report.status === 'VET_REVIEWED' ? 'success' :
                          report.status === 'AI_COMPLETED' ? 'warning' : 'default'
                        }>
                          {report.status.replace('_', ' ')}
                        </Badge>
                        {report.consultationRequested && (
                          isReviewed ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                              Consultation Completed
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Consultation Requested
                            </span>
                          )
                        )}
                      </div>

                      <p className="text-xs text-stone-600 mt-1">
                        <strong>Animal:</strong> {report.cattle?.name || report.cattle?.tagNumber || 'Unknown'} ({report.cattle?.breed || 'Breed N/A'}) •{' '}
                        <strong>Location:</strong> {report.village ? `${report.village}, ` : ''}{report.district}, {report.state}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>Submitted: <strong className="text-stone-700 font-medium">{formatDateTime(report.createdAt)}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="text-stone-700">
                          {confirmedDisease ? (
                            <span>Vet Diagnosis: <strong className="text-emerald-800">{confirmedDisease}</strong></span>
                          ) : (
                            <span>Condition: <strong>{disease}</strong></span>
                          )}
                        </span>
                      </div>

                      {/* Doctor Remarks Snippet */}
                      {report.vetReview?.notes && (
                        <div className="mt-2 text-xs bg-emerald-50 text-emerald-950 p-2 rounded-lg border border-emerald-200">
                          <span className="font-bold">Doctor's Clinical Notes: </span>
                          <span className="italic">"{report.vetReview.notes}"</span>
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="flex items-center sm:justify-end gap-1 text-xs font-semibold text-teal-700">
                        {isReviewed ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle className="w-4 h-4" /> Reviewed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-4 h-4" /> Needs Review
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-stone-400 mt-1 block">
                        {isReviewed ? 'Click to view / edit review →' : 'Click to review report →'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
