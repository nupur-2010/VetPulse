import { useQuery } from '@tanstack/react-query'
import { FileText, Clock, CheckCircle, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { consultationsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function VetConsultations() {
  const { data, isLoading } = useQuery({
    queryKey: ['vet-consultations'],
    queryFn: () => consultationsApi.listVet(),
  })

  const consultations = data?.consultations || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Consultations</h1>
        <p className="text-stone-600">Manage your consultation requests</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />)}
            </div>
          ) : consultations.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No consultations"
              description="You have no consultation requests at this time"
            />
          ) : (
            <div className="space-y-3">
              {consultations.map(consultation => (
                <div key={consultation.id} className="p-4 rounded-lg border border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{consultation.farmerName || 'Farmer'}</p>
                      <p className="text-sm text-stone-500">{consultation.reportNumber}</p>
                    </div>
                    <Badge
                      variant={
                        consultation.status === 'REQUESTED' ? 'warning' :
                        consultation.status === 'ACCEPTED' ? 'info' :
                        consultation.status === 'COMPLETED' ? 'success' : 'default'
                      }
                    >
                      {consultation.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-stone-500">
                    Requested: {formatDate(consultation.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
