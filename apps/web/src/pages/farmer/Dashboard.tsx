import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus,
  BookOpen,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  Leaf,
  Sun,
  Stethoscope,
  MapPin
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { reportsApi, cattleApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { formatDateTime } from '@/lib/utils'

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
      gradient: 'from-sky-50 to-sky-100',
      iconBg: 'bg-sky-100 text-sky-600',
    },
    {
      label: 'Active Reports',
      value: reports.filter(r => r.status !== 'CONFIRMED').length,
      icon: FileText,
      gradient: 'from-sunset-50 to-yellow-50',
      iconBg: 'bg-sunset-100 text-sunset-600',
    },
    {
      label: 'Pending Review',
      value: reports.filter(r => r.status === 'AI_COMPLETED').length,
      icon: Clock,
      gradient: 'from-earth-50 to-sunset-50',
      iconBg: 'bg-earth-100 text-earth',
    },
    {
      label: 'Completed',
      value: reports.filter(r => r.status === 'VET_REVIEWED' || r.status === 'CONFIRMED').length,
      icon: CheckCircle2,
      gradient: 'from-grass-50 to-green-50',
      iconBg: 'bg-grass-100 text-grass-700',
    },
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary to-grass p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-grass/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sunset/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-5 h-5 text-sunset-300" />
              <span className="text-sm text-grass-200 font-medium">Good day!</span>
            </div>
            <h1 className="text-2xl font-bold">
              Welcome back, {farmerProfile?.firstName || 'Farmer'}
            </h1>
            <p className="text-grass-200 mt-1 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5" />
              Here's what's happening with your cattle
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/farmer/reports/new">
              <Button className="btn-sunset shadow-md">
                <FileText className="w-4 h-4 mr-2" />
                Submit Report
              </Button>
            </Link>
            <Link to="/farmer/cattle/add">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Cattle
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Cattle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-grass" />
                Recent Cattle
              </CardTitle>
              <Link to="/farmer/cattle" className="text-sm text-primary font-semibold flex items-center gap-1 hover:text-grass transition-colors">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {cattle.length === 0 ? (
              <div className="text-center py-10 text-stone-500">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-grass-50 to-primary-50 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <BookOpen className="w-7 h-7 text-grass-400" />
                </div>
                <p className="font-medium text-primary-800">No cattle registered yet</p>
                <Link to="/farmer/cattle/add">
                  <Button variant="outline" size="sm" className="mt-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Cattle
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {cattle.map((cow, i) => (
                  <Link
                    key={cow.id}
                    to={`/farmer/cattle/${cow.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gradient-to-r hover:from-grass-50/50 hover:to-transparent transition-all stagger-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-grass-100 to-primary-100 text-primary flex items-center justify-center font-bold">
                        {cow.name?.charAt(0) || cow.tagNumber.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-primary-800">{cow.name || cow.tagNumber}</p>
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
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sunset" />
                Recent Health Reports
              </CardTitle>
              <Link to="/farmer/reports/new" className="text-sm text-primary font-semibold flex items-center gap-1 hover:text-grass transition-colors">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-10 text-stone-500">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sunset-50 to-cream-300 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText className="w-7 h-7 text-sunset-400" />
                </div>
                <p className="font-medium text-primary-800">No health reports yet</p>
                <Link to="/farmer/reports/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Submit First Report
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report, i) => {
                  const isReviewed = report.status === 'VET_REVIEWED' || report.status === 'CONFIRMED' || !!report.vetReview
                  const isConsultationSent = report.consultationRequested

                  return (
                    <Link
                      key={report.id}
                      to={`/farmer/reports/${report.id}`}
                      className={`block p-4 rounded-xl transition-all stagger-in border ${
                        isReviewed
                          ? 'border-l-4 border-l-emerald-600 border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 shadow-sm'
                          : 'border-stone-200 hover:border-sunset/50 hover:bg-stone-50/80'
                      }`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary-900 font-mono text-sm">{report.reportNumber}</span>
                          {report.cattle?.name && (
                            <span className="text-xs font-semibold text-stone-600">
                              • {report.cattle.name}
                            </span>
                          )}
                        </div>
                        <StatusBadge
                          status={report.status}
                          isReviewed={isReviewed}
                          consultationRequested={isConsultationSent}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-stone-500">
                        <span>Submitted: <strong className="text-stone-700 font-medium">{formatDateTime(report.createdAt)}</strong></span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {report.village ? `${report.village}, ` : ''}{report.district}
                        </span>
                      </div>

                      {/* Doctor Remarks Snippet if reviewed */}
                      {isReviewed && report.vetReview?.notes && (
                        <div className="mt-2.5 p-2 rounded-lg bg-emerald-100/60 text-xs text-emerald-950 flex items-start gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Doctor's Remark: </span>
                            <span className="italic">"{report.vetReview.notes}"</span>
                          </div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  isReviewed,
  consultationRequested,
}: {
  status: string
  isReviewed: boolean
  consultationRequested?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* If vet reviewed/confirmed, mark with success green */}
      {isReviewed ? (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Confirmed & Reviewed
        </span>
      ) : (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            status === 'AI_COMPLETED'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 inline-block mr-1" />
          {status === 'AI_COMPLETED' ? 'AI Completed' : 'Pending Review'}
        </span>
      )}

      {/* Outside indicator for consultation sent / reviewed */}
      {consultationRequested && (
        isReviewed ? (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            Consultation Completed & Reviewed
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Consultation Sent (Pending Review)
          </span>
        )
      )}
    </div>
  )
}
