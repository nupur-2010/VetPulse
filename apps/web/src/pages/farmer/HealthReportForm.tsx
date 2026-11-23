import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, X, FileText, MapPin, Thermometer } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { cattleApi, reportsApi } from '@/services/api'

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
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])

  const { data: cattleData } = useQuery({
    queryKey: ['cattle'],
    queryFn: () => cattleApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => reportsApi.create(data),
    onSuccess: (report) => {
      navigate(`/farmer/assessments/${report.id}`)
    },
  })

  const toggleSymptom = (symptom: string) => {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      cattleId: formData.get('cattleId'),
      state: formData.get('state') || 'Maharashtra',
      district: formData.get('district') || 'Pune',
      symptomDuration: formData.get('symptomDuration') || '2-3 days',
      severity: formData.get('severity') || 'moderate',
      temperature: formData.get('temperature') ? parseFloat(formData.get('temperature') as string) : undefined,
      symptoms: selectedSymptoms,
      photos: photos.length > 0 ? photos : undefined,
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Submit Health Report</h1>
          <p className="text-stone-600">Describe your cattle's health concerns</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Select Animal</CardTitle></CardHeader>
            <CardContent>
              <Select
                name="cattleId"
                options={(cattleData?.cattle || []).map(c => ({
                  value: c.id,
                  label: `${c.name || c.tagNumber} (${c.breed})`,
                }))}
                placeholder="Select cattle"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observed Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(SYMPTOM_GROUPS).map(([group, symptoms]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-sm font-medium text-stone-700 mb-2">{group}</h4>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedSymptoms.includes(symptom)
                            ? 'bg-primary text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {selectedSymptoms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <p className="text-sm text-stone-500 mb-2">Selected: {selectedSymptoms.length} symptoms</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSymptoms.map(s => (
                      <Badge key={s} variant="info">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                Clinical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input name="temperature" label="Body Temperature (°C)" type="number" step="0.1" placeholder="e.g., 39.5" />
                <Select name="symptomDuration" label="Duration" options={[
                  { value: '1 day', label: '1 day' },
                  { value: '2-3 days', label: '2-3 days' },
                  { value: '4-7 days', label: '4-7 days' },
                  { value: '1-2 weeks', label: '1-2 weeks' },
                  { value: 'More than 2 weeks', label: 'More than 2 weeks' },
                ]} placeholder="Select duration" />
              </div>
              <Select name="severity" label="Severity" options={[
                { value: 'mild', label: 'Mild' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'severe', label: 'Severe' },
                { value: 'critical', label: 'Critical' },
              ]} placeholder="Select severity" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input name="state" label="State *" placeholder="State" required defaultValue="Maharashtra" />
                <Input name="district" label="District *" placeholder="District" required defaultValue="Pune" />
              </div>
              <Input name="village" label="Village (optional)" placeholder="Village" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Photos (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center">
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                  <p className="text-sm text-stone-600">Click to upload photos</p>
                  <p className="text-xs text-stone-500 mt-1">JPG, PNG up to 10MB</p>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <div className="w-20 h-20 bg-stone-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-stone-500">{photo.name.slice(0, 8)}...</span>
                      </div>
                      <button type="button" onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" isLoading={createMutation.isPending}>
              Submit Report
            </Button>
            <Link to="/farmer"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </div>
      </form>
    </div>
  )
}