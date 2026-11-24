import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Stethoscope, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Camera, 
  Check, 
  Star, 
  FileCheck, 
  Award, 
  Building2, 
  Clock, 
  CheckCircle2 
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function VetProfilePage() {
  const { user, vetProfile, updateVetProfile } = useAuthStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string>(
    localStorage.getItem(`vet_avatar_${user?.id}`) || ''
  )
  
  const [formData, setFormData] = useState({
    firstName: vetProfile?.firstName || '',
    lastName: vetProfile?.lastName || '',
    phone: vetProfile?.phone || '',
    specialization: vetProfile?.specialization || 'Bovine Medicine & Surgery',
    licenseNumber: vetProfile?.licenseNumber || 'VCI-MH-82910',
    clinicName: (vetProfile as any)?.clinicName || 'Rural Veterinary Clinical Center',
    clinicAddress: (vetProfile as any)?.clinicAddress || 'Shivaji Nagar, Pune',
    consultationFee: vetProfile?.consultationFee || 150,
    isAvailable: vetProfile?.isAvailable ?? true,
    yearsOfExperience: (vetProfile as any)?.yearsOfExperience || 8,
  })

  const { data: reportsData } = useQuery({
    queryKey: ['vet-reports-summary'],
    queryFn: () => reportsApi.list({ limit: 50 }),
  })

  const reports = reportsData?.reports || []
  const solvedCount = reports.filter(r => r.status === 'VET_REVIEWED' || r.status === 'CONFIRMED').length
  const pendingCount = reports.filter(r => r.status === 'AI_COMPLETED').length

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarUrl(result)
        if (user?.id) {
          localStorage.setItem(`vet_avatar_${user.id}`, result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleAvailability = () => {
    const newStatus = !formData.isAvailable
    setFormData(prev => ({ ...prev, isAvailable: newStatus }))
    updateVetProfile({ isAvailable: newStatus })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateVetProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      specialization: formData.specialization,
      licenseNumber: formData.licenseNumber,
      consultationFee: Number(formData.consultationFee),
      isAvailable: formData.isAvailable,
      ...({ clinicName: formData.clinicName, clinicAddress: formData.clinicAddress, yearsOfExperience: Number(formData.yearsOfExperience) } as any),
    })
    setIsEditing(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const initials = `Dr. ${formData.firstName.slice(0, 1)}${formData.lastName.slice(0, 1)}`.toUpperCase() || 'DR'

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      {/* Header Profile Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-8 shadow-xl border border-teal-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with photo upload */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-teal-400/40 shadow-2xl bg-emerald-950 flex items-center justify-center text-2xl font-black text-teal-300">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Doctor" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center">
                  <Stethoscope className="w-8 h-8 mb-1 text-teal-400" />
                  <span className="text-sm font-bold">{initials}</span>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-teal-500 hover:bg-teal-400 text-emerald-950 rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-110">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Dr. {formData.firstName || 'Veterinarian'} {formData.lastName || ''}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Licensed Veterinarian
              </span>
              <button
                onClick={toggleAvailability}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                  formData.isAvailable 
                    ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' 
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
                title="Click to toggle availability"
              >
                <span className={`w-2 h-2 rounded-full ${formData.isAvailable ? 'bg-emerald-950 animate-pulse' : 'bg-stone-400'}`} />
                {formData.isAvailable ? 'Available for Consultations' : 'Currently Offline'}
              </button>
            </div>

            <p className="text-teal-200 font-medium flex items-center justify-center md:justify-start gap-2 text-sm">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              {formData.specialization} • License: {formData.licenseNumber}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs text-teal-200/80">
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
                Practicing since {formatDate(user?.createdAt || new Date().toISOString())}
              </span>
            </div>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? 'btn-secondary' : 'btn-pasture'}
            >
              {isEditing ? 'Cancel Editing' : 'Edit Credentials'}
            </Button>
          </div>
        </div>

        {/* Saved Toast */}
        {savedSuccess && (
          <div className="mt-4 p-3 bg-teal-500/30 border border-teal-400/50 rounded-xl text-teal-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-amber-300" />
            Veterinary credentials updated successfully!
          </div>
        )}
      </div>

      {/* Clinical Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover-lift border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-950">{solvedCount}</p>
              <p className="text-xs font-semibold text-emerald-700">Solved Cases</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-950">{pendingCount}</p>
              <p className="text-xs font-semibold text-amber-700">Pending Queue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-0 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-purple-950">4.9 / 5</p>
              <p className="text-xs font-semibold text-purple-700">Farmer Rating</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift border-0 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-sky-950">{formData.yearsOfExperience} Yrs</p>
              <p className="text-xs font-semibold text-sky-700">Experience</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details and Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clinic & Registration Information */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-700" />
              Practice & Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">License Number</span>
              <p className="font-bold text-stone-900 font-mono">{formData.licenseNumber}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Clinic Name</span>
              <p className="font-bold text-stone-900">{formData.clinicName}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Clinic Address</span>
              <p className="font-bold text-stone-900">{formData.clinicAddress}</p>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl space-y-1">
              <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider block">Consultation Fee</span>
              <p className="font-bold text-emerald-800">₹{formData.consultationFee} / tele-consultation</p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Edit Profile Form */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700" />
              {isEditing ? 'Edit Veterinary Information' : 'Practicing Credentials'}
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
                    label="Specialization *"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    required
                  />
                  <Input
                    label="Veterinary License Number *"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <Input
                    label="Consultation Fee (₹)"
                    type="number"
                    value={formData.consultationFee}
                    onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                  />
                  <Input
                    label="Years of Experience"
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Clinic Name"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  />
                  <Input
                    label="Clinic Location / Address"
                    value={formData.clinicAddress}
                    onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                  />
                </div>

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
                    <span className="text-xs text-stone-500 font-semibold block">Full Name & Title</span>
                    <span className="font-bold text-stone-900 text-base">
                      Dr. {formData.firstName} {formData.lastName}
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
                    <span className="text-xs text-stone-500 font-semibold block">Clinical Role</span>
                    <span className="font-bold text-teal-800 text-base flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      Licensed Veterinary Medical Officer
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-teal-950 text-sm">Active Tele-Consultations & AI Reviews</h4>
                    <p className="text-xs text-teal-800 mt-0.5">Your profile is visible to dairy farmers requesting urgent livestock reviews in your region.</p>
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
