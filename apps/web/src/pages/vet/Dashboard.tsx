import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Clock, CheckCircle, Stethoscope, Leaf, Sun } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth'
import { reportsApi } from '@/services/api'

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
    { label: 'Pending Reviews', value: pendingCount, icon: Clock, gradient: 'from-sunset-50 to-yellow-50', iconBg: 'bg-sunset-100 text-sunset-600' },
    { label: 'Reviewed', value: reviewedCount, icon: CheckCircle, gradient: 'from-grass-50 to-green-50', iconBg: 'bg-grass-100 text-grass-700' },
    { label: 'Total Reports', value: reports.length, icon: FileText, gradient: 'from-sky-50 to-blue-50', iconBg: 'bg-sky-100 text-sky-600' },
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary to-grass p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-grass/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-5 h-5 text-sunset-300" />
            <span className="text-sm text-grass-200 font-medium">Good day!</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6" />
            Welcome, Dr. {vetProfile?.lastName || 'Veterinarian'}
          </h1>
          <p className="text-grass-200 mt-1 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            Here's your review queue
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={`hover-lift bg-gradient-to-br ${stat.gradient} border-0 stagger-in`} style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.iconBg} shadow-sm`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-800">{stat.value}</p>
                  <p className="text-xs text-stone-500 font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-primary-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sunset" />
              Reports for Review
            </h2>
            <Link to="/vet/reports" className="text-sm text-primary font-semibold hover:text-grass transition-colors">View all</Link>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-10 text-stone-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-grass-50 to-primary-50 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="w-7 h-7 text-grass-400" />
              </div>
              <p className="font-medium text-primary-800">No reports to review</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 5).map((report, i) => (
                <Link
                  key={report.id}
                  to={`/vet/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-grass-100/50 hover:bg-gradient-to-r hover:from-grass-50/30 hover:to-transparent hover:border-grass-200 transition-all stagger-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div>
                    <p className="font-semibold text-primary-800">{report.reportNumber}</p>
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
