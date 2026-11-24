import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Calendar, MapPin, Phone, Stethoscope, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { consultationsApi } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

export function VetConsultations() {
  const { vetProfile } = useAuthStore()
  const vetState = vetProfile?.licenseState || 'Maharashtra'

  const { data, isLoading } = useQuery({
    queryKey: ['vet-consultations'],
    queryFn: () => consultationsApi.listVet(),
  })

  const consultations = data?.consultations || []

  return (
    <div className="space-y-6 pb-12 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-700" />
            Consultation Requests
          </h1>
          <p className="text-stone-600 text-sm mt-0.5">
            Incoming consultation requests from farmers in your state ({vetState})
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-900 rounded-xl border border-teal-200 text-xs font-semibold">
          <MapPin className="w-4 h-4 text-teal-700" />
          <span>State: <strong>{vetState}</strong></span>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-stone-100 rounded-xl animate-pulse" />)}
            </div>
          ) : consultations.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-stone-400" />}
              title="No consultation requests"
              description={`You have no active consultation requests from farmers in ${vetState}. When a farmer in your state requests a consultation for an animal report, it will appear here.`}
            />
          ) : (
            <div className="space-y-3.5">
              {consultations.map(consultation => {
                const report = consultation.report
                const farmer = consultation.farmer
                const cattle = report?.cattle
                const disease = report?.prediction?.predictedDisease || 'Health Assessment'

                return (
                  <div
                    key={consultation.id}
                    className="p-5 rounded-xl border border-stone-200 hover:border-teal-300 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-base">
                            {farmer ? `${farmer.firstName} ${farmer.lastName}` : (consultation.farmerName || 'Farmer')}
                          </span>
                          <Badge
                            variant={
                              consultation.status === 'REQUESTED' ? 'warning' :
                              consultation.status === 'ACCEPTED' ? 'info' :
                              consultation.status === 'COMPLETED' ? 'success' : 'default'
                            }
                          >
                            {consultation.status}
                          </Badge>
                          {report?.reportNumber && (
                            <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                              {report.reportNumber}
                            </span>
                          )}
                        </div>

                        {/* Farmer Contact & Location */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                          {farmer?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-stone-400" />
                              <a href={`tel:${farmer.phone}`} className="text-teal-700 hover:underline font-semibold">
                                {farmer.phone}
                              </a>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-stone-400" />
                            <span>
                              {report?.village ? `${report.village}, ` : ''}{report?.district || farmer?.district || 'District'}, {report?.state || farmer?.state || vetState}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>Requested: <strong className="text-stone-800 font-medium">{formatDateTime(consultation.createdAt)}</strong></span>
                          </span>
                        </div>

                        {/* Animal & Disease summary */}
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
                          <div>
                            <strong>Animal:</strong> {cattle?.name || cattle?.tagNumber || 'Cattle'} ({cattle?.breed || 'Unknown breed'})
                            {cattle?.tagNumber && <span className="ml-2 font-mono text-stone-500">Tag #{cattle.tagNumber}</span>}
                          </div>
                          <div>
                            <strong>Suspected Disease:</strong> <span className="font-semibold text-stone-900">{disease}</span>
                          </div>
                          {consultation.reason && (
                            <div className="pt-1 text-stone-600 italic">
                              "{consultation.reason}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 self-start sm:self-center">
                        <Link to={`/vet/reports/${consultation.reportId}`}>
                          <Button className="btn-pasture text-xs font-bold gap-1 shadow-sm">
                            <span>Review Case Report</span>
                            <ChevronRight className="w-4 h-4" />
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
