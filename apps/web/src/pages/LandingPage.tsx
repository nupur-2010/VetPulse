import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { 
  Activity, 
  Shield, 
  MapPin, 
  Users, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2,
  Microscope,
  Globe
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-stone-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M30 40 Q50 25 70 40 Q75 55 50 70 Q25 55 30 40"/>
                </svg>
              </div>
              <span className="font-bold text-xl text-primary">VetPulse</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary text-sm font-medium mb-6">
            <Microscope className="w-4 h-4" />
            AI-Assisted Cattle Health Monitoring
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-6 leading-tight">
            Protect Your Cattle.<br />
            <span className="text-primary">Detect Health Risks Earlier.</span>
          </h1>
          <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mx-auto mb-8">
            VetPulse helps cattle farmers record health concerns, access veterinary expertise 
            and monitor emerging disease risks in their communities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Platform
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Farmers', value: '2,500+' },
              { label: 'Cattle Monitored', value: '15,000+' },
              { label: 'Health Reports', value: '45,000+' },
              { label: 'Disease Alerts', value: '890+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-primary-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              How VetPulse Works
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              A comprehensive platform designed specifically for Indian cattle farming conditions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Activity,
                title: 'Health Reporting',
                description: 'Submit detailed health reports with symptoms, photos and clinical observations for your cattle.',
              },
              {
                icon: Microscope,
                title: 'AI-Assisted Assessment',
                description: 'Receive preliminary disease assessments based on reported symptoms and health data.',
              },
              {
                icon: Users,
                title: 'Veterinary Consultation',
                description: 'Connect with qualified veterinarians for expert review and guidance on your cattle health.',
              },
              {
                icon: MapPin,
                title: 'Geographic Monitoring',
                description: 'Track disease patterns and potential outbreaks across districts and regions.',
              },
              {
                icon: Shield,
                title: 'Outbreak Detection',
                description: 'Advanced algorithms identify potential disease clusters for early warning.',
              },
              {
                icon: TrendingUp,
                title: 'Analytics Dashboard',
                description: 'Access comprehensive analytics on cattle health trends and disease distribution.',
              },
            ].map((feature) => (
              <div 
                key={feature.title}
                className="p-6 bg-white rounded-xl border border-stone-200 hover:border-primary-200 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-50 text-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-stone-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-stone-900 mb-6">
                Built for Indian Cattle Farmers
              </h2>
              <div className="space-y-4">
                {[
                  'Supports all major Indian cattle breeds including Gir, Sahiwal, and crossbreds',
                  'Location-aware reporting with district and village-level tracking',
                  'Symptom-based assessment adapted for common cattle diseases in India',
                  'Regional language support for better accessibility',
                  'Offline-capable reporting for areas with limited connectivity',
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-stone-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                <Globe className="w-48 h-48 text-primary-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
            Ready to Protect Your Cattle?
          </h2>
          <p className="text-lg text-stone-600 mb-8">
            Join thousands of farmers who are already using VetPulse to monitor and protect their cattle health.
          </p>
          <Link to="/register">
            <Button size="lg">
              Start Free Today
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M30 40 Q50 25 70 40 Q75 55 50 70 Q25 55 30 40"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-primary">VetPulse</span>
            </div>
            <p className="text-sm text-stone-500">
              Smarter Cattle Health. Stronger Farming Communities.
            </p>
            <p className="text-sm text-stone-500">
              © 2026 VetPulse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
