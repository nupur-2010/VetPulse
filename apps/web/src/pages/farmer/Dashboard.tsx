import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  BookOpen, 
  FileText, 
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { reportsApi, cattleApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/utils'

export function FarmerDashboard() {
  const { farmerProfile } = useAuthStore()
  
  const { data: cattleData } = useQuery({
    queryKey: ['cattle'],
    queryFn: () => cattleApi.list({ limit: 5 }),
  })

  const { data: reportsData } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list({ limit: 5 }),
  })

  const cattle = cattleData?.cattle || []
  const reports = reportsData?.reports || []

  const stats = [
    { 
      label: 'Total Cattle', 
      value: cattleData?.total || 0, 
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
    },
    { 
      label: 'Active Reports', 
      value: reports.filter(r => r.status !== 'CONFIRMED').length, 
      icon: FileText,
      color: 'bg-yellow-50 text-yellow-600',
    },
    { 
      label: 'Pending Review', 
      value: reports.filter(r => r.status === 'AI_COMPLETED').length, 
      icon: Clock,
      color: 'bg-orange-50 text-orange-600',
    },
    { 
      label: 'Completed', 
      value: reports.filter(r => r.status === 'VET_REVIEWED' || r.status === 'CONFIRMED').length, 
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome back, {farmerProfile?.firstName || 'Farmer'}
          </h1>
          <p className="text-stone-600">Here's what's happening with your cattle</p>
        </div>
        <div className="flex gap-3">
          <Link to="/farmer/reports/new">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
          </Link>
          <Link to="/farmer/cattle/add">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Cattle
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                  <p className="text-xs text-stone-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Cattle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Cattle</CardTitle>
              <Link to="/farmer/cattle" className="text-sm text-primary font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {cattle.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No cattle registered yet</p>
                <Link to="/farmer/cattle/add">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Cattle
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cattle.map((cow) => (
                  <Link
                    key={cow.id}
                    to={`/farmer/cattle/${cow.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary flex items-center justify-center font-medium">
                        {cow.name?.charAt(0) || cow.tagNumber.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{cow.name || cow.tagNumber}</p>
                        <p className="text-sm text-stone-500">{cow.breed}</p>
                      </div>
                    </div>
                    <Badge variant={cow.isActive ? 'success' : 'default'}>
                      {cow.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Health Reports</CardTitle>
              <Link to="/farmer/reports/new" className="text-sm text-primary font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No health reports yet</p>
                <Link to="/farmer/reports/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Submit First Report
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    to={`/farmer/reports/${report.id}`}
                    className="block p-3 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-stone-900">{report.reportNumber}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="text-sm text-stone-500">
                      {formatDate(report.createdAt)} • {report.district}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    AI_COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700' },
    VET_REVIEWED: { bg: 'bg-purple-50', text: 'text-purple-700' },
    CONFIRMED: { bg: 'bg-red-50', text: 'text-red-700' },
  }
  const variant = variants[status] || variants.PENDING
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
