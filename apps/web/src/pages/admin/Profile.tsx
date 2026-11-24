import { useAuthStore } from '@/store/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  Map, 
  AlertTriangle, 
  FileText, 
  Lock, 
  Activity 
} from 'lucide-react'

export function AdminProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-emerald-950 to-slate-900 text-white p-8 shadow-xl border border-stone-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-3xl shadow-xl">
            <Shield className="w-12 h-12" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-black">System Administrator</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Master Security Root
              </span>
            </div>
            <p className="text-stone-300 text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-stone-400 pt-1">
              Antigravity VetPulse Regional Epidemiological Command & Control
            </p>
          </div>

          <Link to="/admin/users">
            <Button className="btn-pasture shrink-0">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Privileges & Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-800" />
              Access Permissions & Security Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { title: 'Full User & Directory Access', desc: 'Inspect & moderate farmer & veterinarian accounts', ok: true },
              { title: 'Epidemic & Outbreak Broadcast', desc: 'Issue regional disease warnings and cluster alerts', ok: true },
              { title: 'Realtime GIS Surveillance', desc: 'Cluster mapping with DBSCAN spatial analysis', ok: true },
              { title: 'AI Diagnostics Pipeline Health', desc: 'Direct access to FastAPI model inference telemetry', ok: true },
            ].map((perm, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-stone-900 text-xs">{perm.title}</h4>
                  <p className="text-stone-500 text-[11px]">{perm.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-800" />
              Administrative Quick Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { to: '/admin/users', icon: Users, label: 'User Directory (Farmers & Vets)', desc: 'View profiles, contact details & credentials' },
              { to: '/admin/reports', icon: FileText, label: 'All Health Reports', desc: 'Review clinical reports across all farms' },
              { to: '/admin/map', icon: Map, label: 'Disease Geospatial Map', desc: 'Explore district case heatmaps & pins' },
              { to: '/admin/outbreaks', icon: AlertTriangle, label: 'Active Outbreak Clusters', desc: 'Track confirmed & suspected clusters' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-900 text-xs group-hover:text-emerald-950">{item.label}</h4>
                  <p className="text-stone-500 text-[11px] truncate">{item.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
