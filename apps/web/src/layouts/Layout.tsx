import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
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
  User,
  FileText,
  PlusCircle,
  Shield
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const farmerNavItems = [
  { label: 'Dashboard', href: '/farmer', icon: LayoutDashboard },
  { label: 'My Cattle', href: '/farmer/cattle', icon: BookOpen },
  { label: 'Submit Report', href: '/farmer/reports/new', icon: PlusCircle },
]

const vetNavItems = [
  { label: 'Dashboard', href: '/vet', icon: LayoutDashboard },
  { label: 'Reports', href: '/vet/reports', icon: FileText },
  { label: 'Consultations', href: '/vet/consultations', icon: Users },
]

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Disease Map', href: '/admin/map', icon: Map },
  { label: 'Outbreaks', href: '/admin/outbreaks', icon: AlertTriangle },
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
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-stone-200 transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-stone-200">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M30 40 Q50 25 70 40 Q75 55 50 70 Q25 55 30 40"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-primary">VetPulse</span>
            </Link>
            <button 
              className="lg:hidden p-2 hover:bg-stone-100 rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-white" 
                      : "text-stone-600 hover:bg-stone-100"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-stone-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary flex items-center justify-center font-medium">
                {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{profileName}</p>
                <p className="text-xs text-stone-500 capitalize">{role.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-stone-200">
          <div className="flex items-center justify-between h-full px-4">
            <button 
              className="lg:hidden p-2 hover:bg-stone-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-stone-100 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary flex items-center justify-center text-sm font-medium">
                    {profileName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{profileName}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {profileOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-sm font-medium">{profileName}</p>
                        <p className="text-xs text-stone-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
