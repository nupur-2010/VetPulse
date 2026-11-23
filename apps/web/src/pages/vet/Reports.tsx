import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, Filter, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function VetReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['vet-reports'],
    queryFn: () => reportsApi.list({ limit: 50 }),
  })

  const reports = data?.reports || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Health Reports</h1>
        <p className="text-stone-600">Review and assess submitted health reports</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input placeholder="Search by report number..." className="pl-9" />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="No reports to review"
              description="There are no health reports pending review"
            />
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <Link
                  key={report.id}
                  to={`/vet/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-stone-200 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-semibold">{report.reportNumber}</p>
                    <p className="text-sm text-stone-500">
                      {report.cattle?.name || 'Unknown'} • {report.breed} • {report.district}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={report.status === 'AI_COMPLETED' ? 'warning' : 'success'}>
                      {report.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-stone-500 mt-1">{formatDate(report.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
