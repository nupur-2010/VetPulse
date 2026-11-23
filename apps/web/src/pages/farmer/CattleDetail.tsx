import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Weight, BookOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cattleApi, reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function CattleDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: cattle, isLoading } = useQuery({
    queryKey: ['cattle', id],
    queryFn: () => cattleApi.get(id!),
    enabled: !!id,
  })

  const { data: historyData } = useQuery({
    queryKey: ['cattle', id, 'history'],
    queryFn: () => cattleApi.getHistory(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-stone-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!cattle) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">Cattle not found</p>
        <Link to="/farmer/cattle" className="text-primary hover:underline mt-2 inline-block">
          Back to cattle list
        </Link>
      </div>
    )
  }

  const healthReports = historyData || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/farmer/cattle" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">
            {cattle.name || cattle.tagNumber}
          </h1>
          <p className="text-stone-600">{cattle.breed}</p>
        </div>
        <Badge variant={cattle.isActive ? 'success' : 'default'}>
          {cattle.isActive ? 'Active' : 'Archived'}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cattle Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">Tag Number</p>
                  <p className="font-medium">{cattle.tagNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Gender className="w-5 h-5 text-stone-400" />
                <div>
                  <p className="text-sm text-stone-500">Gender</p>
                  <p className="font-medium">{cattle.gender}</p>
                </div>
              </div>

              {cattle.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-stone-400" />
                  <div>
                    <p className="text-sm text-stone-500">Date of Birth</p>
                    <p className="font-medium">{formatDate(cattle.dateOfBirth)}</p>
                  </div>
                </div>
              )}

              {cattle.weight && (
                <div className="flex items-center gap-3">
                  <Weight className="w-5 h-5 text-stone-400" />
                  <div>
                    <p className="text-sm text-stone-500">Weight</p>
                    <p className="font-medium">{cattle.weight} kg</p>
                  </div>
                </div>
              )}

              {cattle.identificationMarks && (
                <div className="pt-4 border-t border-stone-200">
                  <p className="text-sm text-stone-500 mb-1">Identification Marks</p>
                  <p className="font-medium">{cattle.identificationMarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {healthReports.length === 0 ? (
              <EmptyState
                title="No health reports"
                description="No health reports have been submitted for this animal yet"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Total Reports</span>
                  <span className="font-medium">{healthReports.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Latest Report</span>
                  <span className="font-medium">
                    {formatDate(healthReports[0]?.createdAt || '')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Status</span>
                  <Badge variant={healthReports[0]?.status === 'VET_REVIEWED' ? 'success' : 'warning'}>
                    {healthReports[0]?.status?.replace('_', ' ') || 'N/A'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health History</CardTitle>
        </CardHeader>
        <CardContent>
          {healthReports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-500 mb-4">No health history available</p>
              <Link to="/farmer/reports/new">
                <Button>Submit Health Report</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {healthReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/farmer/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium">{report.reportNumber}</p>
                    <p className="text-sm text-stone-500">{formatDate(report.createdAt)}</p>
                  </div>
                  <Badge
                    variant={
                      report.status === 'VET_REVIEWED'
                        ? 'success'
                        : report.status === 'AI_COMPLETED'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {report.status.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
