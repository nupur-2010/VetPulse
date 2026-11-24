import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Map,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FileText,
  PlusCircle,
  ShieldCheck,
  User,
  Stethoscope,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CowIcon } from '@/components/ui/PastoralScene'

const farmerNavItems = [
  { label: 'Dashboard', href: '/farmer', icon: LayoutDashboard },
  { label: 'My Cattle', href: '/farmer/cattle', icon: BookOpen },
  { label: 'Submit Report', href: '/farmer/reports/new', icon: PlusCircle },
  { label: 'Farmer Profile', href: '/farmer/profile', icon: User },
]

const vetNavItems = [
  { label: 'Dashboard', href: '/vet', icon: LayoutDashboard },
  { label: 'Reports', href: '/vet/reports', icon: FileText },
  { label: 'Consultations', href: '/vet/consultations', icon: Stethoscope },
  { label: 'Doctor Profile', href: '/vet/profile', icon: User },
]

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'User Directory', href: '/admin/users', icon: Users },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Disease Map', href: '/admin/map', icon: Map },
  { label: 'Outbreaks', href: '/admin/outbreaks', icon: AlertTriangle },
  { label: 'Admin Profile', href: '/admin/profile', icon: ShieldCheck },
]

export function Layout() {
  const { user, farmerProfile, vetProfile, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const role = user?.role || 'FARMER'
  const navItems = role === 'ADMIN' ? adminNavItems : role === 'VETERINARIAN' ? vetNavItems : farmerNavItems

  const profileName = farmerProfile
    ? `${farmerProfile.firstName} ${farmerProfile.lastName}`
    : vetProfile
    ? `${vetProfile.firstName} ${vetProfile.lastName}`
    : user?.email || 'User'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[270px] bg-white border-r border-stone-200/80 transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none flex flex-col justify-between',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Logo Header */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-stone-100">
            <Link to="/" className="flex items-center gap-3 group">
              <CowIcon className="w-9 h-9 transition-transform group-hover:scale-105" />
              <div>
                <span className="font-extrabold text-xl text-emerald-950 tracking-tight block leading-tight">
                  Vet<span className="text-emerald-700">Pulse</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-700">
                  {role.toLowerCase()} console
                </span>
              </div>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-stone-100 rounded-xl transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isDashboardRoot = item.href === '/farmer' || item.href === '/vet' || item.href === '/admin'
              const isActive = isDashboardRoot
                ? location.pathname === item.href
                : (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200',
                    isActive
                      ? 'bg-emerald-900 text-white shadow-md'
                      : 'text-stone-600 hover:bg-emerald-50/60 hover:text-emerald-950'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Card at Bottom */}
        <div className="p-4 border-t border-stone-100 bg-[#faf7f2]/50">
          <Link
            to={`/${role.toLowerCase()}/profile`}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50/70 transition-colors group"
            title="Click to view and edit profile"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              {profileName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate group-hover:text-emerald-950">{profileName}</p>
              <p className="text-xs text-emerald-800 font-semibold capitalize flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {role.toLowerCase()} • Profile
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[270px]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-sm px-6 flex items-center justify-between">
          <button
            className="lg:hidden p-2.5 hover:bg-stone-100 rounded-xl transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-stone-700" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Livestock Health Surveillance Active
          </div>

          <div className="flex items-center gap-4">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 p-2 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-900 text-white flex items-center justify-center text-xs font-bold">
                  {profileName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-bold text-stone-800">{profileName}</span>
                <ChevronDown className={cn('w-4 h-4 text-stone-400 transition-transform', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-slide-up">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <p className="text-sm font-bold text-stone-900">{profileName}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      to={`/${role.toLowerCase()}/profile`}
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-950 font-semibold transition-colors border-b border-stone-100"
                    >
                      <User className="w-4 h-4 text-emerald-700" />
                      View Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
            

        {/* Content View */}
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
