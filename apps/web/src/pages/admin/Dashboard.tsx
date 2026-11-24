import { Link } from 'react-router-dom'
import { Users, BookOpen, FileText, AlertTriangle, Map, BarChart3, Shield, Leaf, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export function AdminDashboard() {
  const stats = [
    { label: 'Total Farmers', value: '2,500+', icon: Users, gradient: 'from-sky-50 to-blue-50', iconBg: 'bg-sky-100 text-sky-600' },
    { label: 'Total Cattle', value: '15,000+', icon: BookOpen, gradient: 'from-grass-50 to-green-50', iconBg: 'bg-grass-100 text-grass-700' },
    { label: 'Health Reports', value: '45,000+', icon: FileText, gradient: 'from-purple-50 to-violet-50', iconBg: 'bg-purple-100 text-purple-600' },
    { label: 'Active Outbreaks', value: '12', icon: AlertTriangle, gradient: 'from-red-50 to-rose-50', iconBg: 'bg-red-100 text-red-600' },
  ]

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-800 via-primary to-grass p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-grass/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Admin Dashboard
          </h1>
          <p className="text-grass-200 mt-1 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" />
            Platform overview and analytics
          </p>
        </div>
      </div>

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

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <h3 className="font-bold text-primary-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-grass" />
              Quick Actions
            </h3>
            <div className="space-y-1.5">
              {[
                { to: '/admin/reports', icon: FileText, label: 'View All Reports', color: 'text-primary' },
                { to: '/admin/map', icon: Map, label: 'Disease Map', color: 'text-grass-700' },
                { to: '/admin/outbreaks', icon: AlertTriangle, label: 'Outbreak Clusters', color: 'text-sunset' },
                { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', color: 'text-sky-600' },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-grass-50/50 hover:to-transparent transition-all">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-grass-50 to-primary-50 flex items-center justify-center`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="font-medium text-sm text-primary-800">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <h3 className="font-bold text-primary-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-sunset" />
              Recent Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 bg-gradient-to-r from-yellow-50 to-sunset-50 rounded-xl border border-yellow-200/50">
                <p className="text-sm font-semibold text-yellow-800">Potential outbreak detected</p>
                <p className="text-xs text-yellow-600 mt-0.5">Pune district • 5 cases</p>
              </div>
              <div className="p-3.5 bg-gradient-to-r from-orange-50 to-sunset-50 rounded-xl border border-orange-200/50">
                <p className="text-sm font-semibold text-orange-800">FMD cluster identified</p>
                <p className="text-xs text-orange-600 mt-0.5">Nagpur district • 3 cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <h3 className="font-bold text-primary-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              Disease Distribution
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { name: 'FMD', pct: 32, color: 'bg-red-400' },
                { name: 'Mastitis', pct: 24, color: 'bg-sunset' },
                { name: 'LSD', pct: 18, color: 'bg-yellow-400' },
                { name: 'BRD', pct: 14, color: 'bg-sky-400' },
                { name: 'Others', pct: 12, color: 'bg-grass' },
              ].map((disease) => (
                <div key={disease.name}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-primary-800">{disease.name}</span>
                    <span className="font-bold text-stone-600">{disease.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${disease.color} rounded-full transition-all duration-1000`} style={{ width: `${disease.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
