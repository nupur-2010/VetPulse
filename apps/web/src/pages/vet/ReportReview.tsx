import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Microscope } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { reportsApi, reviewsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'

export function VetReportReview() {
  const { id } = useParams<{ id: string }>()
  const [decision, setDecision] = useState('')
  const [remarks, setRemarks] = useState('')

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  })

  const reviewMutation = useMutation({
    mutationFn: (data: any) => reviewsApi.create(data),
    onSuccess: () => {
      alert('Review submitted successfully')
    },
  })

  const handleSubmitReview = () => {
    if (!decision) {
      alert('Please select a review decision')
      return
    }
    reviewMutation.mutate({
      reportId: id,
      decision,
      remarks,
    })
  }

  if (isLoading) {
    return <div className="h-96 bg-stone-100 rounded-xl animate-pulse" />
  }

  if (!report) {
    return <div className="text-center py-12">Report not found</div>
  }

  const prediction = report.prediction

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/vet/reports" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Review Report</h1>
          <p className="text-stone-600">{report.reportNumber}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><span className="text-stone-500">Animal:</span> {report.cattle?.name || report.cattle?.tagNumber}</div>
            <div><span className="text-stone-500">Breed:</span> {report.cattle?.breed}</div>
            <div><span className="text-stone-500">Location:</span> {report.district}, {report.state}</div>
            <div><span className="text-stone-500">Submitted:</span> {formatDate(report.createdAt)}</div>
            <div><span className="text-stone-500">Severity:</span> <Badge variant={report.severity === 'critical' ? 'danger' : 'warning'}>{report.severity}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Symptoms</CardTitle></CardHeader>
          <CardContent>
            {report.symptoms && report.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {report.symptoms.map((s, i) => <Badge key={i} variant="info">{s.symptomName}</Badge>)}
              </div>
            ) : (
              <p className="text-stone-500">No symptoms recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="w-5 h-5" />
              AI Prediction
              {prediction.isSimulated && <Badge variant="warning">DEMO</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-stone-50 rounded-lg">
              <h4 className="font-semibold text-lg">{prediction.predictedDisease || 'No prediction'}</h4>
              {prediction.confidence && (
                <p className="text-sm text-stone-600 mt-1">Confidence: {Math.round(prediction.confidence * 100)}%</p>
              )}
              {prediction.isSimulated && (
                <p className="text-xs text-yellow-600 mt-2">⚠️ Simulated result for demonstration</p>
              )}
            </div>
            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">AI Recommendations</h5>
                <ul className="space-y-1">
                  {prediction.recommendations.map((r: string, i: number) => (
                    <li key={i} className="text-sm text-stone-600">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Your Review</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Review Decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            options={[
              { value: 'AGREES_AI', label: 'Agrees with AI suggestion' },
              { value: 'DISAGREES_AI', label: 'Disagrees with AI suggestion' },
              { value: 'INCONCLUSIVE', label: 'Inconclusive' },
              { value: 'ALTERNATIVE_DISEASE', label: 'Alternative suspected disease' },
              { value: 'NEEDS_EXAMINATION', label: 'Needs further examination' },
            ]}
            placeholder="Select decision"
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Clinical Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter your clinical findings and remarks..."
            />
          </div>
          <Button onClick={handleSubmitReview} isLoading={reviewMutation.isPending}>
            Submit Review
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
