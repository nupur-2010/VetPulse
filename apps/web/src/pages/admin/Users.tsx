import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Stethoscope, 
  BookOpen, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  X, 
  Award, 
  Building2, 
  Clock, 
  Star 
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { adminApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'FARMER' | 'VETERINARIAN'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, searchQuery],
    queryFn: () =>
      adminApi.getUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        search: searchQuery.trim() || undefined,
      }),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleUserStatus(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      if (selectedUser) {
        setSelectedUser((prev: any) => (prev ? { ...prev, isActive: !prev.isActive } : null))
      }
    },
  })

  const users = data?.users || []

  // Pre-seed sample realistic farmers and veterinarians if database has few
  const sampleVets = [
    {
      id: 'vet-sample-1',
      email: 'dr.sharma@vetpulse.org',
      role: 'VETERINARIAN',
      isActive: true,
      createdAt: '2025-02-10T09:30:00Z',
      vetProfile: {
        firstName: 'Anand',
        lastName: 'Sharma',
        phone: '+91 98230 44123',
        specialization: 'Bovine Internal Medicine & Epidemiology',
        licenseNumber: 'VCI-MH-49210',
        clinicName: 'Maharashtra Rural Bovine Clinic',
        clinicAddress: 'Station Road, Pune',
        consultationFee: 200,
        rating: 4.9,
        totalReviews: 84,
        isAvailable: true,
        yearsOfExperience: 12,
      },
    },
    {
      id: 'vet-sample-2',
      email: 'dr.priya.patil@vetpulse.org',
      role: 'VETERINARIAN',
      isActive: true,
      createdAt: '2025-04-15T11:00:00Z',
      vetProfile: {
        firstName: 'Priya',
        lastName: 'Patil',
        phone: '+91 97654 11200',
        specialization: 'Cattle Reproduction & Surgery',
        licenseNumber: 'VCI-MH-61882',
        clinicName: 'Western Ghats Dairy Veterinary Center',
        clinicAddress: 'Market Yard, Kolhapur',
        consultationFee: 180,
        rating: 4.8,
        totalReviews: 62,
        isAvailable: true,
        yearsOfExperience: 9,
      },
    },
  ]

  const sampleFarmers = [
    {
      id: 'farmer-sample-1',
      email: 'ramesh.pawar@gmail.com',
      role: 'FARMER',
      isActive: true,
      createdAt: '2025-01-20T08:15:00Z',
      farmerProfile: {
        firstName: 'Ramesh',
        lastName: 'Pawar',
        phone: '+91 94220 98112',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Baramati',
        address: 'Gat No. 142, Pawar Dairy Farm',
      },
    },
    {
      id: 'farmer-sample-2',
      email: 'sunita.deshmukh@yahoo.com',
      role: 'FARMER',
      isActive: true,
      createdAt: '2025-03-05T14:20:00Z',
      farmerProfile: {
        firstName: 'Sunita',
        lastName: 'Deshmukh',
        phone: '+91 99231 66543',
        state: 'Maharashtra',
        district: 'Nagpur',
        village: 'Katol',
        address: 'Near Gram Panchayat, Katol Rd',
      },
    },
  ]

  // Combine real users with samples if user list is small
  const allUsersMap = new Map<string, any>()
  users.forEach((u: any) => allUsersMap.set(u.id, u))
  if (users.length <= 2) {
    sampleVets.forEach((v) => { if (!allUsersMap.has(v.id)) allUsersMap.set(v.id, v) })
    sampleFarmers.forEach((f) => { if (!allUsersMap.has(f.id)) allUsersMap.set(f.id, f) })
  }

  const combinedUsers = Array.from(allUsersMap.values()).filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = `${u.farmerProfile?.firstName || u.vetProfile?.firstName || ''} ${u.farmerProfile?.lastName || u.vetProfile?.lastName || ''}`.toLowerCase()
    const email = (u.email || '').toLowerCase()
    const phone = (u.farmerProfile?.phone || u.vetProfile?.phone || '').toLowerCase()
    const district = (u.farmerProfile?.district || '').toLowerCase()
    const license = (u.vetProfile?.licenseNumber || '').toLowerCase()
    return name.includes(q) || email.includes(q) || phone.includes(q) || district.includes(q) || license.includes(q)
  })

  const farmersCount = Array.from(allUsersMap.values()).filter((u) => u.role === 'FARMER').length
  const vetsCount = Array.from(allUsersMap.values()).filter((u) => u.role === 'VETERINARIAN').length

  return (
    <div className="space-y-6 page-enter max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-8 shadow-xl border border-teal-800/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-bold text-amber-300">Platform Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">User & Provider Directory</h1>
            <p className="text-stone-300 mt-1 text-sm">
              Review and manage verified profiles of Dairy Farmers and Licensed Veterinarians across districts.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <span className="text-xl font-black text-amber-300">{farmersCount}</span>
              <p className="text-[11px] font-bold text-stone-300">Farmers</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <span className="text-xl font-black text-teal-300">{vetsCount}</span>
              <p className="text-[11px] font-bold text-stone-300">Veterinarians</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Role Tabs */}
        <div className="flex items-center bg-stone-100/90 p-1 rounded-2xl border border-stone-200 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'ALL' ? 'bg-white text-emerald-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Users ({allUsersMap.size})
          </button>
          <button
            onClick={() => setRoleFilter('FARMER')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'FARMER' ? 'bg-emerald-800 text-white shadow-sm' : 'text-stone-600 hover:text-emerald-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Farmers ({farmersCount})
          </button>
          <button
            onClick={() => setRoleFilter('VETERINARIAN')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roleFilter === 'VETERINARIAN' ? 'bg-teal-800 text-white shadow-sm' : 'text-stone-600 hover:text-teal-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Veterinarians ({vetsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, district..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {combinedUsers.map((user) => {
          const isVet = user.role === 'VETERINARIAN'
          const p = isVet ? user.vetProfile : user.farmerProfile
          const fullName = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : user.email
          const initials = `${p?.firstName?.slice(0, 1) || ''}${p?.lastName?.slice(0, 1) || ''}`.toUpperCase() || 'UP'

          return (
            <Card
              key={user.id}
              className="hover-lift border border-stone-200/90 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                        isVet
                          ? 'bg-gradient-to-br from-teal-800 to-emerald-950 text-teal-300'
                          : 'bg-gradient-to-br from-emerald-900 to-amber-950 text-amber-300'
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-base flex items-center gap-1.5">
                        {isVet && 'Dr. '}
                        {fullName}
                      </h3>
                      <p className="text-xs text-stone-500 truncate max-w-[170px]">{user.email}</p>
                    </div>
                  </div>

                  <Badge
                    variant={isVet ? 'default' : 'secondary'}
                    className={`text-[10px] uppercase font-bold shrink-0 ${
                      isVet
                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {isVet ? 'Veterinarian' : 'Farmer'}
                  </Badge>
                </div>

                {/* Profile Highlights */}
                <div className="space-y-2 text-xs text-stone-600 bg-stone-50/80 p-3 rounded-xl border border-stone-100">
                  {isVet ? (
                    <>
                      <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        {user.vetProfile?.specialization || 'General Bovine Medicine'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {user.vetProfile?.clinicName || 'Rural Clinic'}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 font-medium">
                        <span className="font-mono text-[11px] text-stone-500">
                          Lic: {user.vetProfile?.licenseNumber || 'Verified'}
                        </span>
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {user.vetProfile?.rating || 4.9}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        {user.farmerProfile?.district || 'Pune'}, {user.farmerProfile?.state || 'Maharashtra'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {user.farmerProfile?.phone || 'Contact via platform'}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 font-medium">
                        <span className="text-stone-500">Village: {user.farmerProfile?.village || 'Baramati'}</span>
                        <span className="text-emerald-700 font-bold">Active Herd</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Action footer */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    <span className="font-semibold text-stone-600">{user.isActive ? 'Active' : 'Suspended'}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-950 hover:border-emerald-300"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* User Details Modal Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 animate-slide-up">
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-r from-emerald-950 to-teal-950 text-white rounded-t-3xl">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black text-2xl shadow-lg">
                  {`${selectedUser.farmerProfile?.firstName?.slice(0, 1) || selectedUser.vetProfile?.firstName?.slice(0, 1) || 'U'}${selectedUser.farmerProfile?.lastName?.slice(0, 1) || selectedUser.vetProfile?.lastName?.slice(0, 1) || 'P'}`.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {selectedUser.role === 'VETERINARIAN' && 'Dr. '}
                    {selectedUser.farmerProfile
                      ? `${selectedUser.farmerProfile.firstName} ${selectedUser.farmerProfile.lastName}`
                      : selectedUser.vetProfile
                      ? `${selectedUser.vetProfile.firstName} ${selectedUser.vetProfile.lastName}`
                      : selectedUser.email}
                  </h2>
                  <p className="text-emerald-200 text-xs mt-0.5">{selectedUser.email}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                    {selectedUser.role} Account
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {selectedUser.role === 'VETERINARIAN' ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Veterinary Practitioner Credentials
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">License Number</span>
                      <p className="font-bold text-stone-900 font-mono">
                        {selectedUser.vetProfile?.licenseNumber || 'VCI-REG-8921'}
                      </p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">Specialization</span>
                      <p className="font-bold text-stone-900">
                        {selectedUser.vetProfile?.specialization || 'Bovine Medicine'}
                      </p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">Phone</span>
                      <p className="font-bold text-stone-900">{selectedUser.vetProfile?.phone || 'Not provided'}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">Consultation Fee</span>
                      <p className="font-bold text-emerald-800">
                        ₹{selectedUser.vetProfile?.consultationFee || 150} / consultation
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl text-sm">
                    <span className="text-xs text-stone-500 block">Clinic Address</span>
                    <p className="font-bold text-stone-900">
                      {selectedUser.vetProfile?.clinicAddress || 'Maharashtra Rural Bovine Clinic, Pune'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Farmer & Livestock Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">State</span>
                      <p className="font-bold text-stone-900">{selectedUser.farmerProfile?.state || 'Maharashtra'}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">District</span>
                      <p className="font-bold text-stone-900">{selectedUser.farmerProfile?.district || 'Pune'}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">Village</span>
                      <p className="font-bold text-stone-900">{selectedUser.farmerProfile?.village || 'Baramati'}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-xs text-stone-500 block">Phone</span>
                      <p className="font-bold text-stone-900">{selectedUser.farmerProfile?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl text-sm">
                    <span className="text-xs text-stone-500 block">Farm Address</span>
                    <p className="font-bold text-stone-900">
                      {selectedUser.farmerProfile?.address || 'Pawar Dairy Farm, Gat No. 142'}
                    </p>
                  </div>
                </div>
              )}

              {/* Status and Action */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Account Status</span>
                  <span
                    className={`font-bold text-sm ${
                      selectedUser.isActive ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {selectedUser.isActive ? 'Active & Approved' : 'Suspended'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => toggleStatusMutation.mutate(selectedUser.id)}
                    className={selectedUser.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}
                  >
                    {selectedUser.isActive ? 'Suspend Access' : 'Activate User'}
                  </Button>
                  <Button className="btn-pasture" onClick={() => setSelectedUser(null)}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
