import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
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

  const createMutation = useMutation({
    mutationFn: (data: CreateCattleRequest) => cattleApi.create(data),
    onSuccess: () => {
      navigate('/farmer/cattle')
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/farmer/cattle" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Register New Cattle</h1>
          <p className="text-stone-600">Add a new animal to your farm</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                placeholder="e.g., White spot on left ear"
                {...register('identificationMarks')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" isLoading={createMutation.isPending}>
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
