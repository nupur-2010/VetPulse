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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [showPassword, setShowPassword] = useState(false)

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
      // Redirect based on role
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
        message: error.response?.data?.message || 'Invalid credentials' 
      })
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M30 40 Q50 25 70 40 Q75 55 50 70 Q25 55 30 40"/>
              </svg>
            </div>
            <span className="font-bold text-2xl text-primary">VetPulse</span>
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">Welcome back</h1>
          <p className="text-stone-600 mt-1">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <Button type="submit" className="w-full" isLoading={loginMutation.isPending}>
                Sign in
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-stone-600">Don't have an account? </span>
              <Link to="/register" className="text-primary font-medium hover:underline">
                Register
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-stone-100 rounded-lg">
          <p className="text-xs text-stone-600 font-medium mb-2">Demo Credentials:</p>
          <div className="text-xs text-stone-600 space-y-1">
            <p><strong>Farmer:</strong> farmer@vetpulse.com / Farmer@123</p>
            <p><strong>Veterinarian:</strong> vet@vetpulse.com / Vet@12345</p>
            <p><strong>Admin:</strong> admin@vetpulse.com / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
