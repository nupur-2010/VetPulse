import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Camera, X, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cattleApi } from '@/services/api'
import type { CreateCattleRequest } from '@/types'

const cattleSchema = z.object({
  tagNumber: z.string().min(1, 'Tag number is required'),
  name: z.string().optional(),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['MALE', 'FEMALE']),
  dateOfBirth: z.string().optional(),
  estimatedAge: z.string().optional(),
  weight: z.string().optional(),
  identificationMarks: z.string().optional(),
  pregnancyStatus: z.enum(['NOT_PREGNANT', 'PREGNANT', 'UNKNOWN']).optional(),
})

type CattleForm = z.infer<typeof cattleSchema>

const BREEDS = [
  { value: 'gir', label: 'Gir' },
  { value: 'sahiwal', label: 'Sahiwal' },
  { value: 'red-sindhi', label: 'Red Sindhi' },
  { value: 'tharparkar', label: 'Tharparkar' },
  { value: 'rathi', label: 'Rathi' },
  { value: 'kankrej', label: 'Kankrej' },
  { value: 'hariana', label: 'Hariana' },
  { value: 'ongole', label: 'Ongole' },
  { value: 'hallikar', label: 'Hallikar' },
  { value: 'kangayam', label: 'Kangayam' },
  { value: 'jersey-cross', label: 'Jersey Crossbred' },
  { value: 'hf-cross', label: 'Holstein Friesian Crossbred' },
  { value: 'other', label: 'Other' },
]

export function AddCattle() {
  const navigate = useNavigate()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CattleForm>({
    resolver: zodResolver(cattleSchema),
    defaultValues: {
      gender: 'FEMALE',
      pregnancyStatus: 'UNKNOWN',
    },
  })

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const createMutation = useMutation({
    mutationFn: async (data: CreateCattleRequest) => {
      setIsUploading(true)
      const created = await cattleApi.create(data)
      if (photoFile && created?.id) {
        try {
          await cattleApi.addPhoto(created.id, photoFile)
        } catch (err) {
          console.warn('Photo upload to backend warning:', err)
        }
      }
      if (photoPreview && created?.id) {
        localStorage.setItem(`cattle_photo_${created.id}`, photoPreview)
      }
      return created
    },
    onSuccess: () => {
      setIsUploading(false)
      navigate('/farmer/cattle')
    },
    onError: () => {
      setIsUploading(false)
    },
  })

  const onSubmit = (data: CattleForm) => {
    const payload: CreateCattleRequest = {
      tagNumber: data.tagNumber.trim(),
      name: data.name?.trim() || undefined,
      breed: data.breed,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth && data.dateOfBirth.trim() !== '' ? new Date(data.dateOfBirth).toISOString() : undefined,
      estimatedAge: data.estimatedAge?.trim() || undefined,
      weight: data.weight && data.weight.trim() !== '' ? parseFloat(data.weight) : undefined,
      identificationMarks: data.identificationMarks?.trim() || undefined,
      pregnancyStatus: data.pregnancyStatus,
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link to="/farmer/cattle" className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Register New Cattle</h1>
          <p className="text-stone-600 text-sm">Add a new animal to your herd with tag and profile photo</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Cattle Profile Photo Upload Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-stone-800">
                Cattle Profile Photo
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                {photoPreview ? (
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-md group">
                    <img src={photoPreview} alt="Cattle Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-stone-100 border border-stone-200 flex flex-col items-center justify-center text-stone-400">
                    <ImageIcon className="w-10 h-10 mb-1" />
                    <span className="text-[11px] font-medium">No photo</span>
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <p className="text-xs text-stone-600">
                    Upload a clear photo of the cattle face or side profile for veterinary identification and health records.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl border border-stone-200 hover:border-emerald-300 shadow-sm cursor-pointer transition-all">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    {photoPreview ? 'Change Photo' : 'Select Cattle Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                  {photoFile && (
                    <span className="block text-[11px] text-emerald-700 font-semibold truncate max-w-xs">
                      {photoFile.name} ({(photoFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Tag Number *"
                placeholder="e.g., TAG-001"
                {...register('tagNumber')}
                error={errors.tagNumber?.message}
              />
              <Input
                label="Name (optional)"
                placeholder="e.g., Bessie"
                {...register('name')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Breed *"
                options={BREEDS}
                placeholder="Select breed"
                {...register('breed')}
                error={errors.breed?.message}
              />
              <Select
                label="Gender *"
                options={[
                  { value: 'MALE', label: 'Male' },
                  { value: 'FEMALE', label: 'Female' },
                ]}
                {...register('gender')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                {...register('dateOfBirth')}
              />
              <Input
                label="Estimated Age"
                placeholder="e.g., 3 years"
                {...register('estimatedAge')}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Weight (kg)"
                type="number"
                placeholder="e.g., 450"
                {...register('weight')}
              />
              <Select
                label="Pregnancy Status"
                options={[
                  { value: 'UNKNOWN', label: 'Unknown' },
                  { value: 'NOT_PREGNANT', label: 'Not Pregnant' },
                  { value: 'PREGNANT', label: 'Pregnant' },
                ]}
                {...register('pregnancyStatus')}
              />
            </div>

            <div>
              <Input
                label="Identification Marks"
                placeholder="e.g., White star patch on forehead, notched left ear"
                {...register('identificationMarks')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" isLoading={createMutation.isPending || isUploading} className="btn-pasture">
                <Save className="w-4 h-4 mr-2" />
                Register Cattle
              </Button>
              <Link to="/farmer/cattle">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
