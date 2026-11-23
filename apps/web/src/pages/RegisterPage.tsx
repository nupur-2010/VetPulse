import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  role: z.enum(['FARMER', 'VETERINARIAN']),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'FARMER',
    },
  })

  const selectedRole = watch('role')

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => {
      return authApi.register({
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        state: data.state,
        district: data.district,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
      })
    },
    onSuccess: (response) => {
      login(response)
      navigate('/farmer')
    },
    onError: (error: any) => {
      setError('email', {
        message: error.response?.data?.message || 'Registration failed',
      })
    },
  })

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M30 40 Q50 25 70 40 Q75 55 50 70 Q25 55 30 40"/>
              </svg>
            </div>
            <span className="font-bold text-2xl text-primary">VetPulse</span>
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Create an account</h1>
          <p className="text-stone-600 mt-1">Join VetPulse to protect your cattle</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="First name"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Last Name"
                  placeholder="Last name"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  className="pl-10"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-stone-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="pl-10 pr-10"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State"
                  placeholder="State"
                  {...register('state')}
                  error={errors.state?.message}
                />
                <Input
                  label="District"
                  placeholder="District"
                  {...register('district')}
                  error={errors.district?.message}
                />
              </div>

              <Input
                label="Phone (optional)"
                placeholder="Phone number"
                {...register('phone')}
              />

              {selectedRole === 'VETERINARIAN' && (
                <Input
                  label="License Number"
                  placeholder="Veterinary license number"
                  {...register('licenseNumber')}
                  error={errors.licenseNumber?.message}
                />
              )}

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="FARMER"
                    {...register('role')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Farmer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="VETERINARIAN"
                    {...register('role')}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">Veterinarian</span>
                </label>
              </div>

              <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-stone-600">Already have an account? </span>
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
