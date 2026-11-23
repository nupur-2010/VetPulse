import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Clock, CheckCircle, AlertTriangle, Users, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth'
import { reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function VetDashboard() {
  const { vetProfile } = useAuthStore()

  const { data: reportsData } = useQuery({
    queryKey: ['vet-reports'],
    queryFn: () => reportsApi.list({ limit: 10 }),
  })

  const reports = reportsData?.reports || []
  const pendingCount = reports.filter(r => r.status === 'AI_COMPLETED').length
  const reviewedCount = reports.filter(r => r.status === 'VET_REVIEWED' || r.status === 'CONFIRMED').length

  const stats = [
    { label: 'Pending Reviews', value: pendingCount, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Reviewed', value: reviewedCount, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Total Reports', value: reports.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome, Dr. {vetProfile?.lastName || 'Veterinarian'}
        </h1>
        <p className="text-stone-600">Here's your review queue</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-stone-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Reports for Review</h2>
            <Link to="/vet/reports" className="text-sm text-primary font-medium">View all</Link>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reports to review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 5).map(report => (
                <Link
                  key={report.id}
                  to={`/vet/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-stone-200 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium">{report.reportNumber}</p>
                    <p className="text-sm text-stone-500">
                      {report.cattle?.name || report.cattle?.tagNumber || 'Unknown'} • {report.district}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === 'AI_COMPLETED' ? 'warning' :
                      report.status === 'VET_REVIEWED' ? 'success' : 'default'
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