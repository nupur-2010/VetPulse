import { useState, useEffect } from 'react'
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
import { CowIcon } from '@/components/ui/PastoralScene'
import { Eye, EyeOff, ShieldCheck, Stethoscope, Tractor, ArrowRight } from 'lucide-react'

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
  const { isAuthenticated, user, login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'ADMIN') {
        navigate('/admin')
      } else if (user?.role === 'VETERINARIAN') {
        navigate('/vet')
      } else {
        navigate('/farmer')
      }
    }
  }, [isAuthenticated, user, navigate])

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
    <div className="min-h-screen grid lg:grid-cols-12 bg-white">
      {/* Left Column: High-Resolution Cattle & Pasture Experience */}
      <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-emerald-950 flex-col justify-between p-12 text-white">
        <img
          src="https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=1600&q=85"
          alt="Cattle herd in golden sunset"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent" />

        <div className="relative z-10 flex items-center gap-3">
          <CowIcon className="w-10 h-10" />
          <span className="font-extrabold text-2xl tracking-tight">VetPulse</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Complete Livestock Protection
          </div>
          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            Join the digital veterinary network safeguarding livestock livelihoods across India.
          </h2>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-[#faf7f2]">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center lg:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-6 lg:hidden">
              <CowIcon className="w-9 h-9" />
              <span className="font-black text-2xl text-emerald-950">VetPulse</span>
            </Link>
            <h1 className="text-3xl font-black text-emerald-950 tracking-tight">Create an Account</h1>
            <p className="text-stone-500 text-sm mt-1">Select your role to configure your dedicated dashboard</p>
          </div>

          <Card className="border border-stone-200/80 shadow-xl rounded-2xl bg-white">
            <CardContent className="p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Role Toggle */}
                <div className="flex gap-2 p-1.5 bg-stone-100 rounded-xl mb-4">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                      selectedRole === 'FARMER'
                        ? 'bg-emerald-900 text-white shadow-md'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <input type="radio" value="FARMER" {...register('role')} className="sr-only" />
                    <Tractor className="w-4 h-4" />
                    Cattle Farmer
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                      selectedRole === 'VETERINARIAN'
                        ? 'bg-emerald-900 text-white shadow-md'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <input type="radio" value="VETERINARIAN" {...register('role')} className="sr-only" />
                    <Stethoscope className="w-4 h-4" />
                    Veterinarian (Doctor)
                  </label>
                </div>

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

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@vetpulse.com"
                  {...register('email')}
                  error={errors.email?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      error={errors.password?.message}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[38px] text-stone-400 hover:text-stone-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    error={errors.confirmPassword?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="State"
                    placeholder="e.g. Maharashtra"
                    {...register('state')}
                    error={errors.state?.message}
                  />
                  <Input
                    label="District"
                    placeholder="e.g. Pune"
                    {...register('district')}
                    error={errors.district?.message}
                  />
                </div>

                {selectedRole === 'VETERINARIAN' && (
                  <Input
                    label="Veterinary License Registration Number"
                    placeholder="e.g. VCI-MH-4921"
                    {...register('licenseNumber')}
                    error={errors.licenseNumber?.message}
                  />
                )}

                <Input
                  label="Phone Number (Optional)"
                  placeholder="+91 98765 43210"
                  {...register('phone')}
                />

                <Button type="submit" className="w-full btn-pasture mt-2" isLoading={registerMutation.isPending}>
                  Create My Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-5 text-center text-sm text-stone-500">
                Already registered?{' '}
                <Link to="/login" className="text-emerald-800 font-bold hover:underline">
                  Sign In
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
