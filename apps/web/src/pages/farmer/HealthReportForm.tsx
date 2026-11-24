import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, FileText, MapPin, Thermometer, AlertCircle, CheckCircle2, RefreshCw, Calendar, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { cattleApi, reportsApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'

const SYMPTOM_GROUPS = {
  'General': ['Fever', 'Reduced appetite', 'Weakness', 'Weight loss', 'Dehydration', 'Reduced milk production'],
  'Skin': ['Skin nodules', 'Swelling', 'Lesions', 'Wounds', 'Hair loss'],
  'Mouth & Digestive': ['Excessive salivation', 'Mouth ulcers', 'Difficulty chewing', 'Diarrhoea', 'Bloating', 'Reduced rumination'],
  'Respiratory': ['Cough', 'Nasal discharge', 'Difficulty breathing', 'Rapid breathing'],
  'Udder & Reproductive': ['Swollen udder', 'Abnormal milk', 'Pain during milking', 'Reproductive problems', 'Abnormal discharge'],
  'Movement': ['Lameness', 'Difficulty standing', 'Joint swelling', 'Sudden weakness'],
}

export function HealthReportForm() {
  const navigate = useNavigate()
  const { farmerProfile } = useAuthStore()

  const [selectedCattleId, setSelectedCattleId] = useState<string>('')
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [temperature, setTemperature] = useState<string>('')
  const [symptomDuration, setSymptomDuration] = useState<string>('2-3 days')
  const [severity, setSeverity] = useState<string>('moderate')
  const [additionalNotes, setAdditionalNotes] = useState<string>('')
  
  // Location states
  const [stateName, setStateName] = useState<string>(farmerProfile?.state || 'Maharashtra')
  const [district, setDistrict] = useState<string>(farmerProfile?.district || 'Pune')
  const [village, setVillage] = useState<string>(farmerProfile?.village || '')
  const [latitude, setLatitude] = useState<number | undefined>(undefined)
  const [longitude, setLongitude] = useState<number | undefined>(undefined)
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false)
  const [locationDetected, setLocationDetected] = useState<boolean>(false)
  const [locationStatusText, setLocationStatusText] = useState<string>('')
  
  // Submission error
  const [formError, setFormError] = useState<string | null>(null)

  // Current date/time display
  const [currentDateTime, setCurrentDateTime] = useState<string>(new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }))

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }))
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const { data: cattleData } = useQuery({
    queryKey: ['cattle'],
    queryFn: () => cattleApi.list(),
  })

  // Automatically detect location on mount
  useEffect(() => {
    detectLocation()
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusText('Geolocation not supported by your browser')
      return
    }

    setIsDetectingLocation(true)
    setLocationStatusText('Detecting GPS location...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setLatitude(lat)
        setLongitude(lon)

        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          if (response.ok) {
            const data = await response.json()
            const addr = data.address || {}
            const detectedState = addr.state || addr.region || addr.province
            const detectedDistrict = addr.state_district || addr.district || addr.county || addr.city
            const detectedVillage = addr.village || addr.town || addr.suburb || addr.neighbourhood

            if (detectedState) setStateName(detectedState)
            if (detectedDistrict) setDistrict(detectedDistrict)
            if (detectedVillage) setVillage(detectedVillage)

            setLocationDetected(true)
            setLocationStatusText(`Detected: ${detectedDistrict || ''}, ${detectedState || ''} (GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)})`)
          } else {
            setLocationDetected(true)
            setLocationStatusText(`GPS coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
          }
        } catch {
          // If network reverse geocoding fails, fallback to coordinates
          setLocationDetected(true)
          setLocationStatusText(`GPS coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
        } finally {
          setIsDetectingLocation(false)
        }
      },
      (error) => {
        console.warn('Geolocation warning:', error.message)
        setIsDetectingLocation(false)
        setLocationStatusText(`Using saved farm location (${farmerProfile?.district || 'Pune'}, ${farmerProfile?.state || 'Maharashtra'})`)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => reportsApi.create(data),
    onSuccess: (report) => {
      navigate(`/farmer/assessments/${report.id}`)
    },
    onError: (err: any) => {
      console.error('Error submitting report:', err)
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to submit report. Please check the form and try again.'
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  const toggleSymptom = (symptom: string) => {
    setFormError(null)
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    )
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setPhotos(prev => [...prev, ...Array.from(files)])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedCattleId) {
      setFormError('Please select a cattle animal for this report.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (selectedSymptoms.length === 0) {
      setFormError('Please select at least one observed symptom.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!stateName.trim() || !district.trim()) {
      setFormError('State and District are required to assign a veterinarian.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    createMutation.mutate({
      cattleId: selectedCattleId,
      state: stateName.trim(),
      district: district.trim(),
      village: village.trim() || undefined,
      latitude: latitude !== undefined ? latitude : undefined,
      longitude: longitude !== undefined ? longitude : undefined,
      location: village ? `${village}, ${district}, ${stateName}` : `${district}, ${stateName}`,
      symptomDuration: symptomDuration || '2-3 days',
      severity: severity || 'moderate',
      temperature: temperature ? parseFloat(temperature) : undefined,
      symptoms: selectedSymptoms,
      photos: photos.length > 0 ? photos : undefined,
      additionalNotes: additionalNotes.trim() || undefined,
    })
  }

  const cattleList = cattleData?.cattle || []

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Submit Health Report</h1>
            <p className="text-stone-600 text-sm">Provide your observations for AI assessment and veterinary review</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Error banner */}
      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Submission Error</p>
            <p className="text-sm text-red-700 mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date and Time Indicator */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-semibold text-stone-800">Report Date & Time:</span>
            <span>{currentDateTime}</span>
          </div>
          <span className="text-stone-400">Recorded automatically</span>
        </div>

        {/* Animal Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center justify-between">
              <span>1. Select Animal *</span>
              {selectedCattleId && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cattleList.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 flex items-center justify-between">
                <span>You haven't registered any cattle yet. Please add a cattle first.</span>
                <Link to="/farmer/cattle/add">
                  <Button size="sm" className="btn-pasture">Add Cattle</Button>
                </Link>
              </div>
            ) : (
              <div>
                <Select
                  name="cattleId"
                  value={selectedCattleId}
                  onChange={(e) => {
                    setSelectedCattleId(e.target.value)
                    setFormError(null)
                  }}
                  options={cattleList.map(c => ({
                    value: c.id,
                    label: `${c.name || c.tagNumber} (${c.breed} • Tag: ${c.tagNumber})`,
                  }))}
                  placeholder="-- Select cattle to report on --"
                />
                {!selectedCattleId && (
                  <p className="text-xs text-stone-500 mt-1.5">Choose the registered animal displaying symptoms.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observed Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                2. Observed Symptoms *
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {selectedSymptoms.length} selected
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(SYMPTOM_GROUPS).map(([group, symptoms]) => (
              <div key={group} className="mb-4 last:mb-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{group}</h4>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map(symptom => {
                    const isSelected = selectedSymptoms.includes(symptom)
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-700/50'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {symptom}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {selectedSymptoms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-500 mb-2 font-medium">Selected symptoms for AI evaluation:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSymptoms.map(s => (
                    <Badge key={s} variant="info" className="py-1 px-2.5">
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSymptom(s)}
                        className="ml-1.5 text-blue-400 hover:text-blue-800 font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-sunset" />
              3. Clinical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Body Temperature (°C)"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 39.5"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  hint="Normal is approx 38.5 - 39.2°C"
                />
              </div>
              <div>
                <Select
                  name="symptomDuration"
                  label="Duration of Symptoms"
                  value={symptomDuration}
                  onChange={(e) => setSymptomDuration(e.target.value)}
                  options={[
                    { value: '1 day', label: '1 day (Recent)' },
                    { value: '2-3 days', label: '2-3 days' },
                    { value: '4-7 days', label: '4-7 days' },
                    { value: '1-2 weeks', label: '1-2 weeks' },
                    { value: 'More than 2 weeks', label: 'More than 2 weeks (Chronic)' },
                  ]}
                />
              </div>
              <div>
                <Select
                  name="severity"
                  label="Perceived Severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  options={[
                    { value: 'mild', label: 'Mild (Normal behavior)' },
                    { value: 'moderate', label: 'Moderate (Discomfort/sluggish)' },
                    { value: 'severe', label: 'Severe (Significant distress)' },
                    { value: 'critical', label: 'Critical (Emergency)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-1.5">
                Additional Observations (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Mention any milk drop, feed refusal, previous medications or other signs..."
                className="w-full h-20 px-4 py-2.5 rounded-xl border-2 border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Automatic Location Detection */}
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50/40 to-emerald-50/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-700" />
                4. Location (Auto-Detected)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={isDetectingLocation}
                className="gap-1.5 text-xs h-8 rounded-lg border-teal-300 text-teal-800 hover:bg-teal-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                {isDetectingLocation ? 'Detecting...' : 'Re-Detect GPS'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationStatusText && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${locationDetected ? 'bg-emerald-100 text-emerald-900 font-medium' : 'bg-stone-100 text-stone-600'}`}>
                <MapPin className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>{locationStatusText}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                name="state"
                label="State *"
                placeholder="State (e.g. Maharashtra)"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                required
              />
              <Input
                name="district"
                label="District *"
                placeholder="District (e.g. Pune)"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                name="village"
                label="Village / Tehsil (Optional)"
                placeholder="e.g. Baramati"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              />
              <div className="flex items-center gap-3 pt-6 text-xs text-stone-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reports are automatically routed to verified veterinarians in your state ({stateName || 'State'}).</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              5. Animal Photos (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-stone-300 hover:border-emerald-500 transition-colors rounded-2xl p-6 text-center bg-stone-50/50">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer block">
                <Upload className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                <p className="text-sm font-semibold text-stone-700">Click to upload photos of affected areas</p>
                <p className="text-xs text-stone-500 mt-1">Clear photos of lesions, skin, eyes, or mouth help veterinarians review accurately</p>
              </label>
            </div>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white p-1">
                    <div className="w-24 h-24 bg-stone-100 rounded-lg flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                      <span className="text-xs font-semibold text-stone-700 truncate w-full">{photo.name}</span>
                      <span className="text-[10px] text-stone-400 mt-1">{(photo.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          <Button
            type="submit"
            isLoading={createMutation.isPending}
            className="btn-sunset px-8 py-3 rounded-xl font-bold shadow-md"
          >
            {createMutation.isPending ? 'Analyzing & Submitting...' : 'Submit Health Report'}
          </Button>
          <Link to="/farmer">
            <Button type="button" variant="outline" className="px-6 py-3 rounded-xl">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
