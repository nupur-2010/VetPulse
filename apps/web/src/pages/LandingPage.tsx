import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { PastoralScene, CowIcon } from '@/components/ui/PastoralScene'
import { useAuthStore } from '@/store/auth'
import {
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Award,
  LogOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const numeric = parseInt(target.replace(/[^0-9]/g, ''))
  const [count, setCount] = useState(0)

  useEffect(() => {
    let frame: number
    const duration = 2000
    const start = performance.now()
    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(numeric * eased))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [numeric])

  return <>{count.toLocaleString()}{suffix}</>
}

export function LandingPage() {
  const { isAuthenticated, user, farmerProfile, vetProfile, logout } = useAuthStore()

  const dashboardPath = user?.role === 'ADMIN' ? '/admin' : user?.role === 'VETERINARIAN' ? '/vet' : '/farmer'
  const displayName = farmerProfile
    ? `${farmerProfile.firstName}`
    : vetProfile
    ? `Dr. ${vetProfile.lastName}`
    : user?.email?.split('@')[0] || 'User'

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 selection:bg-emerald-200">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group">
              <CowIcon className="w-10 h-10 transition-transform group-hover:scale-105" />
              <div>
                <span className="font-extrabold text-2xl text-emerald-950 tracking-tight block leading-none">
                  Vet<span className="text-emerald-700">Pulse</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-700">
                  Cattle Health Intelligence
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-700">
              <a href="#how-it-works" className="hover:text-emerald-800 transition-colors">How It Works</a>
              <a href="#veterinary-care" className="hover:text-emerald-800 transition-colors">Veterinary Care</a>
              <a href="#breeds" className="hover:text-emerald-800 transition-colors">Indian Breeds</a>
              <a href="#outbreak-radar" className="hover:text-emerald-800 transition-colors">Disease Radar</a>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to={dashboardPath}
                    className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{displayName}</span>
                    <span className="text-emerald-700 capitalize font-medium">({user?.role?.toLowerCase()})</span>
                  </Link>
                  <Link to={dashboardPath}>
                    <Button className="btn-pasture text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 shadow-md">
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={logout}
                    className="text-xs font-semibold text-stone-500 hover:text-red-600 px-2.5 py-1.5"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="font-semibold text-stone-700 hover:text-emerald-900">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button className="btn-pasture text-sm px-5 py-2.5 shadow-md">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Luminous Sunset & Pasture Hero Section */}
      <section className="relative w-full overflow-hidden min-h-[85vh] lg:min-h-[720px] xl:min-h-[780px] pt-24 pb-16 lg:pt-28 lg:pb-20 flex flex-col justify-center bg-[#070e0f]">
        {/* Photorealistic Pastoral Sunset Scene (Independent Absolute Layer) */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
          <PastoralScene />
        </div>

        {/* Hero Content - Perfectly Centered Grid Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Bold Text Lines requested by user */}
            <div className="lg:col-span-7 text-white space-y-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-extrabold tracking-wide shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                AI-Assisted Cattle Health & Dedicated Veterinary Care
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-white text-shadow-deep">
                  Sunset in the Pasture.
                </h1>
                <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] text-amber-400 text-shadow-deep">
                  Care in the Clinic.
                </h2>
              </div>

              <p className="text-base sm:text-lg lg:text-xl text-stone-100 max-w-2xl font-bold leading-relaxed text-shadow-deep">
                Where cattle graze peacefully across lush green pastures and veterinarians stand ready to heal. VetPulse brings symptom tracking, tele-veterinary consultations, and early epidemic alerts directly to farmers and rural clinics.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath}>
                      <Button size="lg" className="btn-pasture text-base px-8 py-4 w-full sm:w-auto shadow-2xl">
                        Open Your Dashboard
                        <ArrowRight className="w-5 h-5 ml-2.5" />
                      </Button>
                    </Link>
                    {user?.role === 'FARMER' ? (
                      <Link to="/farmer/reports/new">
                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white/95 hover:bg-white text-emerald-950 font-black px-7 py-4 rounded-full w-full sm:w-auto shadow-xl border-2 border-emerald-200"
                        >
                          Submit Health Report
                        </Button>
                      </Link>
                    ) : user?.role === 'VETERINARIAN' ? (
                      <Link to="/vet/reports">
                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white/95 hover:bg-white text-emerald-950 font-black px-7 py-4 rounded-full w-full sm:w-auto shadow-xl border-2 border-emerald-200"
                        >
                          <Stethoscope className="w-4 h-4 mr-2 text-emerald-700" />
                          Review Reports Queue
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/admin/map">
                        <Button
                          variant="outline"
                          size="lg"
                          className="bg-white/95 hover:bg-white text-emerald-950 font-black px-7 py-4 rounded-full w-full sm:w-auto shadow-xl border-2 border-emerald-200"
                        >
                          Disease Outbreak Map
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" className="btn-pasture text-base px-8 py-4 w-full sm:w-auto shadow-2xl">
                        Register Your Herd
                        <ArrowRight className="w-5 h-5 ml-2.5" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button
                        variant="outline"
                        size="lg"
                        className="bg-white/95 hover:bg-white text-emerald-950 font-black px-7 py-4 rounded-full w-full sm:w-auto shadow-xl border-2 border-emerald-200"
                      >
                        <Stethoscope className="w-4 h-4 mr-2 text-emerald-700" />
                        Veterinarian Portal
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Verified Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-200 font-bold">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Licensed Veterinary Doctors</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Gir, Sahiwal & Indigenous Herds</span>
                </div>
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Early Outbreak Alerts</span>
                </div>
              </div>
            </div>

            {/* Right Column: Subtle floating telemetry badge near vet & tablet */}
            <div className="hidden lg:flex lg:col-span-5 flex-col justify-end items-end h-full pointer-events-none pb-6">
              <div className="bg-emerald-950/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-emerald-400/40 text-white shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <p className="text-xs font-black text-white">Live Health Telemetry Active</p>
                    <p className="text-[11px] text-emerald-300 font-medium">Bovine Vitals • Pulse • Early Epidemic Triage</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Impact Metrics Bar */}
      <section className="py-10 bg-emerald-950 text-white border-y border-emerald-900/60 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Cattle Farmers Enrolled', value: '2500', suffix: '+', note: 'Maharashtra, Gujarat & Punjab' },
              { label: 'Livestock Animals Monitored', value: '15000', suffix: '+', note: 'Dairy & Indigenous Breeds' },
              { label: 'Clinical Reports Evaluated', value: '45000', suffix: '+', note: 'Diagnosed with Vet Oversight' },
              { label: 'Early Epidemics Contained', value: '890', suffix: '+', note: 'LSD & FMD Outbreak Clusters' },
            ].map((stat) => (
              <div key={stat.label} className="border-l-2 border-emerald-600/50 pl-5">
                <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-bold text-white">{stat.label}</div>
                <div className="text-xs text-emerald-400/80 mt-0.5">{stat.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Veterinary Care in Action (Photo Grid) */}
      <section id="veterinary-care" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-4">
            <Stethoscope className="w-4 h-4 text-emerald-700" />
            Vets in the Field
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight">
            Caring for Cows Where It Matters Most: The Farm
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
            Bridging the gap between remote pastures and certified veterinary medicine through
            field-ready diagnostics and compassionate care.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="relative h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1596733430284-f7437764b169?auto=format&fit=crop&w=800&q=80"
                alt="Cow grazing peacefully in deep green pasture"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Pasture Health</span>
                <h3 className="text-lg font-bold">Daily Vital & Symptom Logging</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Farmers can log cow body temperatures, rumination changes, appetite drops, and milk yield fluctuations in seconds, even with low mobile connectivity.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Localized in regional languages</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="relative h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=800&q=80"
                alt="Veterinarian clinical examination"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Expert Review</span>
                <h3 className="text-lg font-bold">Certified Veterinary Tele-Care</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Qualified veterinary officers review submitted symptoms, photo attachments of lesions or skin nodules, and approve prescription treatments with official license numbers.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Direct consultation & prescription queue</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group rounded-3xl overflow-hidden bg-white border border-stone-200/80 shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="relative h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=800&q=80"
                alt="Herd of cows in pasture at golden sunset"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Epidemic Radar</span>
                <h3 className="text-lg font-bold">Community Disease Containment</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                Automated geospatial clustering isolates potential Foot-and-Mouth (FMD) or Lumpy Skin Disease (LSD) outbreaks before they wipe out livestock across entire taluks.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>GPS radius alerts to neighboring farms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Indigenous Indian Breeds We Protect */}
      <section id="breeds" className="py-20 bg-stone-100 border-y border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3">
                <Award className="w-4 h-4 text-amber-700" />
                Native Livestock Heritage
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
                Tailored for Major Indian Breeds
              </h2>
            </div>
            <p className="text-stone-600 max-w-md mt-4 md:mt-0 text-sm">
              Each breed has unique heat tolerance, physiological baselines, and disease vulnerabilities. VetPulse AI adapts baselines accordingly.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                breed: 'Gir',
                region: 'Gujarat / Saurashtra',
                specialty: 'High milk yield & disease resistance',
                img: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=400&q=80',
              },
              {
                breed: 'Sahiwal',
                region: 'Punjab & Haryana',
                specialty: 'Superior heat and tick tolerance',
                img: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=400&q=80',
              },
              {
                breed: 'Kankrej',
                region: 'Rann of Kutch',
                specialty: 'Hardy dual-purpose breed',
                img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=400&q=80',
              },
              {
                breed: 'HF & Jersey Cross',
                region: 'Pan-India Dairy',
                specialty: 'High production, needs close care',
                img: 'https://images.unsplash.com/photo-1596733430284-f7437764b169?auto=format&fit=crop&w=400&q=80',
              },
            ].map((item) => (
              <div key={item.breed} className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all">
                <div className="h-40 overflow-hidden">
                  <img src={item.img} alt={item.breed} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h4 className="font-extrabold text-stone-900 text-base">{item.breed}</h4>
                  <p className="text-xs text-emerald-700 font-semibold">{item.region}</p>
                  <p className="text-xs text-stone-500 mt-2">{item.specialty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Process */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-emerald-950">
            From Symptom to Recovery in 3 Steps
          </h2>
          <p className="mt-3 text-stone-600">
            A seamless bridge connecting rural farmers to accredited veterinary care
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-md relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center mb-6">
              1
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Record Symptoms</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Select symptoms like excessive salivation, mouth ulcers, lameness, or milk reduction. Upload photos of skin lesions.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-md relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-black text-xl flex items-center justify-center mb-6">
              2
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">AI Clinical Triage</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              Trained on extensive veterinary datasets, the model matches symptoms with probable bovine diseases like FMD, LSD, or Mastitis.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-stone-200/80 shadow-md relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center mb-6">
              3
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Doctor's Review</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              A licensed veterinarian reviews the report, confirms or adjusts the diagnosis, and provides actionable medical guidance.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden relative shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1800&q=80"
            alt="Cows in pasture at sunset"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/80 to-amber-950/70" />

          <div className="relative z-10 px-8 py-16 sm:px-16 sm:py-20 max-w-3xl text-white">
            <span className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-3 block">
              Protect Your Livestock Today
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
              Every Cattle Life Matters to the Farm Family.
            </h2>
            <p className="text-stone-200 text-base sm:text-lg mb-8 leading-relaxed">
              Don't wait for symptoms to turn into costly outbreaks. Join thousands of farmers and veterinarians safeguarding herd health on VetPulse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <>
                  <Link to={dashboardPath}>
                    <Button size="lg" className="btn-sunset text-base px-8 py-4 shadow-xl">
                      Go to Your Dashboard
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  {user?.role === 'FARMER' && (
                    <Link to="/farmer/cattle">
                      <Button
                        variant="outline"
                        size="lg"
                        className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-full"
                      >
                        Manage Cattle Herds
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="btn-sunset text-base px-8 py-4 shadow-xl">
                      Register For Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-full"
                    >
                      Doctor Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-stone-300 py-14 px-4 sm:px-6 lg:px-8 border-t border-emerald-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <CowIcon className="w-10 h-10" />
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">VetPulse</span>
              <p className="text-xs text-stone-400">Livestock Healthcare & Veterinary Surveillance Platform</p>
            </div>
          </div>
          <div className="text-center md:text-right text-xs text-stone-400 space-y-1">
            <p>© 2026 VetPulse. Dedicated to Indian Dairy and Cattle Farmers.</p>
            <p className="text-emerald-400 font-medium">Developed for Agricultural & Veterinary Care Excellence.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
