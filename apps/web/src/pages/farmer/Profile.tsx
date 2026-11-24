import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Camera, 
  Check, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Building
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cattleApi, reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function FarmerProfilePage() {
  const { user, farmerProfile, updateFarmerProfile } = useAuthStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>(
    localStorage.getItem(`farmer_avatar_${user?.id}`) || ''
  )
  
  const [formData, setFormData] = useState({
    firstName: farmerProfile?.firstName || '',
    lastName: farmerProfile?.lastName || '',
    phone: farmerProfile?.phone || '',
    state: farmerProfile?.state || 'Maharashtra',
    district: farmerProfile?.district || 'Pune',
    village: farmerProfile?.village || '',
    address: farmerProfile?.address || '',
  })

  const { data: cattleData } = useQuery({
    queryKey: ['cattle-count'],
    queryFn: () => cattleApi.list({ limit: 1 }),
  })

  const { data: reportsData } = useQuery({
    queryKey: ['reports-count'],
    queryFn: () => reportsApi.list({ limit: 1 }),
  })

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarUrl(result)
        if (user?.id) {
          localStorage.setItem(`farmer_avatar_${user.id}`, result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFarmerProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      state: formData.state,
      district: formData.district,
      village: formData.village,
      address: formData.address,
    })
    setIsEditing(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const initials = `${formData.firstName.slice(0, 1)}${formData.lastName.slice(0, 1)}`.toUpperCase() || 'FP'

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Header Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-8 shadow-xl border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with photo upload */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-amber-400/40 shadow-2xl bg-emerald-950 flex items-center justify-center text-3xl font-black text-amber-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Farmer" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-110">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-white">
                {formData.firstName || 'Farmer'} {formData.lastName || ''}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Producer
              </span>
            </div>

            <p className="text-emerald-200 font-medium flex items-center justify-center md:justify-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              {formData.village ? `${formData.village}, ` : ''}{formData.district}, {formData.state}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-emerald-200/80">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                {user?.email}
              </span>
              {formData.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {formData.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Member since {formatDate(user?.createdAt || new Date().toISOString())}
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'btn-secondary' : 'btn-sunset'}
            >
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </Button>
          </div>
        </div>

        {/* Saved Toast */}
        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/30 border border-emerald-400/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-amber-300" />
            Profile details updated successfully!
          </div>
        )}
      </div>

      {/* Farm & Livestock Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover-lift border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-950">{cattleData?.total ?? 0}</p>
              <p className="text-xs font-semibold text-emerald-700">Registered Cattle</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-950">{reportsData?.total ?? 0}</p>
              <p className="text-xs font-semibold text-amber-700">Health Assessments</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-0 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-sky-950">Active</p>
              <p className="text-xs font-semibold text-sky-700">Farm Surveillance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Farm Information */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700" />
              Farm Location & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">State</span>
              <p className="font-bold text-stone-900">{formData.state || 'Not specified'}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">District</span>
              <p className="font-bold text-stone-900">{formData.district || 'Not specified'}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Village / Tehsil</span>
              <p className="font-bold text-stone-900">{formData.village || 'Not specified'}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Address</span>
              <p className="font-bold text-stone-900">{formData.address || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Edit Profile Form */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              {isEditing ? 'Edit Profile Details' : 'Farmer Credentials'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name *"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Email Address"
                    value={user?.email || ''}
                    disabled
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                  <Input
                    label="District"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                  <Input
                    label="Village"
                    placeholder="Village name"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  />
                </div>

                <Input
                  label="Farm Address / Landmark"
                  placeholder="Street or survey number"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-pasture">
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border border-stone-200/80 rounded-2xl">
                    <span className="text-xs text-stone-500 font-semibold block">Full Name</span>
                    <span className="font-bold text-stone-900 text-base">
                      {formData.firstName} {formData.lastName}
                    </span>
                  </div>
                  <div className="p-4 border border-stone-200/80 rounded-2xl">
                    <span className="text-xs text-stone-500 font-semibold block">Primary Contact Phone</span>
                    <span className="font-bold text-stone-900 text-base">{formData.phone || 'None provided'}</span>
                  </div>
                  <div className="p-4 border border-stone-200/80 rounded-2xl">
                    <span className="text-xs text-stone-500 font-semibold block">Registered Email</span>
                    <span className="font-bold text-stone-900 text-base">{user?.email}</span>
                  </div>
                  <div className="p-4 border border-stone-200/80 rounded-2xl">
                    <span className="text-xs text-stone-500 font-semibold block">Account Role</span>
                    <span className="font-bold text-emerald-800 text-base flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Dairy Farmer / Livestock Keeper
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Need to update livestock or farm location?</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">Keep contact details updated so attending veterinarians can reach you quickly.</p>
                  </div>
                  <Button size="sm" onClick={() => setIsEditing(true)} className="btn-pasture shrink-0">
                    Edit Info
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
