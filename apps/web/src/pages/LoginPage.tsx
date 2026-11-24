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
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
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
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => authApi.login(data),
    onSuccess: (response) => {
      login(response)
      if (response.user.role === 'ADMIN') {
        navigate('/admin')
      } else if (response.user.role === 'VETERINARIAN') {
        navigate('/vet')
      } else {
        navigate('/farmer')
      }
    },
    onError: (error: any) => {
      setError('email', {
        message: error.response?.data?.message || 'Invalid credentials',
      })
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white">
      {/* Left Column: High-Resolution Photographic Experience */}
      <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden bg-emerald-950 flex-col justify-between p-12 text-white">
        <img
          src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1600&q=85"
          alt="Cattle grazing at sunset"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <CowIcon className="w-10 h-10" />
          <span className="font-extrabold text-2xl tracking-tight">VetPulse</span>
        </div>

        {/* Bottom Quote & Trust Testimonial */}
        <div className="relative z-10 space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Rural Veterinary Healthcare Network
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight leading-snug">
            "Early diagnosis saved 18 cows in our village cluster from severe mastitis."
          </h2>
          <p className="text-xs text-stone-300 font-medium">
            — Dr. Rajesh Sharma, MVSc • Lead Veterinary Officer, Pune District
          </p>
        </div>
      </div>

      {/* Right Column: Clean Authentication Form */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12 bg-[#faf7f2]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-6 lg:hidden">
              <CowIcon className="w-9 h-9" />
              <span className="font-black text-2xl text-emerald-950">VetPulse</span>
            </Link>
            <h1 className="text-3xl font-black text-emerald-950 tracking-tight">Welcome Back</h1>
            <p className="text-stone-500 text-sm mt-1.5">Sign in to manage your livestock health records</p>
          </div>

          <Card className="border border-stone-200/80 shadow-xl rounded-2xl bg-white">
            <CardContent className="p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <Input
                      type="email"
                      placeholder="name@vetpulse.com"
                      className="pl-10"
                      {...register('email')}
                      error={errors.email?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...register('password')}
                      error={errors.password?.message}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-stone-400 hover:text-emerald-800 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-pasture" isLoading={loginMutation.isPending}>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-stone-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-emerald-800 font-bold hover:underline">
                  Create Account
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Demo Login Shortcuts */}
          <div className="p-4 bg-white rounded-xl border border-stone-200/80 shadow-sm text-xs space-y-2">
            <p className="font-bold text-stone-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Demo Credentials:
            </p>
            <div className="grid grid-cols-1 gap-1 text-stone-600">
              <p><strong className="text-stone-800">Farmer:</strong> farmer@vetpulse.com / Farmer@123</p>
              <p><strong className="text-stone-800">Veterinarian:</strong> vet@vetpulse.com / Vet@12345</p>
              <p><strong className="text-stone-800">Admin:</strong> admin@vetpulse.com / Admin@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
