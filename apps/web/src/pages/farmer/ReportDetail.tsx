import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="h-64 bg-stone-100 rounded-xl animate-pulse" />
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">Report not found</p>
        <Link to="/farmer" className="text-primary hover:underline mt-2 inline-block">Back to dashboard</Link>
      </div>
    )
  }

  const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
    PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle },
    AI_COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', icon: FileText },
    VET_REVIEWED: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
    CONFIRMED: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertTriangle },
  }

  const config = statusConfig[report.status] || statusConfig.PENDING
  const StatusIcon = config.icon

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/farmer" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">{report.reportNumber}</h1>
          <p className="text-stone-600">Health Report</p>
        </div>
        <div className={`px-3 py-1 rounded-full ${config.bg} ${config.text} flex items-center gap-2`}>
          <StatusIcon className="w-4 h-4" />
          <span className="font-medium text-sm">{report.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Report Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-stone-500">Submitted</span>
              <span className="font-medium">{formatDate(report.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Duration</span>
              <span className="font-medium">{report.symptomDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Severity</span>
              <Badge variant={report.severity === 'critical' ? 'danger' : 'warning'}>{report.severity}</Badge>
            </div>
            {report.temperature && (
              <div className="flex justify-between">
                <span className="text-stone-500">Temperature</span>
                <span className="font-medium">{report.temperature}°C</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-stone-600">
              <MapPin className="w-4 h-4" />
              <span>{report.village || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">District</span>
              <span className="font-medium">{report.district}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">State</span>
              <span className="font-medium">{report.state}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Symptoms</CardTitle></CardHeader>
        <CardContent>
          {report.symptoms && report.symptoms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {report.symptoms.map((s, i) => (
                <Badge key={i} variant="info">{s.symptomName}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-stone-500">No symptoms recorded</p>
          )}
        </CardContent>
      </Card>

      {report.prediction && (
        <Card>
          <CardHeader><CardTitle>AI Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${report.prediction.isSimulated ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}>
              {report.prediction.isSimulated && (
                <p className="text-xs text-yellow-700 font-medium mb-2">⚠️ DEMO RESULT — This assessment is simulated</p>
              )}
              <h4 className="font-semibold text-lg">{report.prediction.predictedDisease || 'No prediction'}</h4>
              <p className="text-sm text-stone-600 mt-1">
                Confidence: {report.prediction.confidence ? `${Math.round(report.prediction.confidence * 100)}%` : 'N/A'}
              </p>
              <p className="text-xs text-stone-500 mt-2">{report.prediction.disclaimer}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link to={`/farmer/assessments/${report.id}`}>
          <Button>View Full Assessment</Button>
        </Link>
      </div>
    </div>
  )
}
