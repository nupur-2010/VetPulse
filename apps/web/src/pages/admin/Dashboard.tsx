import { useQuery } from '@tantml/react-query'
import { Link } from 'react-router-dom'
import { Users, BookOpen, FileText, AlertTriangle, TrendingUp, Map, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useAuthStore } from '@/store/auth'
import { adminApi } from '@/services/api'

export function AdminDashboard() {
  const stats = [
    { label: 'Total Farmers', value: '2,500+', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Cattle', value: '15,000+', icon: BookOpen, color: 'bg-green-50 text-green-600' },
    { label: 'Health Reports', value: '45,000+', icon: FileText, color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Outbreaks', value: '12', icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Admin Dashboard</h1>
        <p className="text-stone-600">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/admin/reports" className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50">
                <FileText className="w-4 h-4" />
                <span>View All Reports</span>
              </Link>
              <Link to="/admin/map" className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50">
                <Map className="w-4 h-4" />
                <span>Disease Map</span>
              </Link>
              <Link to="/admin/outbreaks" className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50">
                <AlertTriangle className="w-4 h-4" />
                <span>Outbreak Clusters</span>
              </Link>
              <Link to="/admin/analytics" className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50">
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Recent Alerts</h3>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">Potential outbreak detected</p>
                <p className="text-xs text-yellow-600">Pune district • 5 cases</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-orange-800">FMD cluster identified</p>
                <p className="text-xs text-orange-600">Nagpur district • 3 cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Disease Distribution</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>FMD</span>
                <span className="font-medium">32%</span>
              </div>
              <div className="flex justify-between">
                <span>Mastitis</span>
                <span className="font-medium">24%</span>
              </div>
              <div className="flex justify-between">
                <span>LSD</span>
                <span className="font-medium">18%</span>
              </div>
              <div className="flex justify-between">
                <span>BRD</span>
                <span className="font-medium">14%</span>
              </div>
              <div className="flex justify-between">
                <span>Others</span>
                <span className="font-medium">12%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
