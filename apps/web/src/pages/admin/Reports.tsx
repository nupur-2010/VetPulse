import { useQuery } from '@tanstack/react-query'
import { Search, Filter, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { reportsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function AdminReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => reportsApi.list({ limit: 100 }),
  })

  const reports = data?.reports || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">All Health Reports</h1>
        <p className="text-stone-600">Monitor all submitted health reports across the platform</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input placeholder="Search reports..." className="pl-9" />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-stone-100 rounded animate-pulse" />)}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState icon={<FileText className="w-6 h-6" />} title="No reports found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-stone-500 border-b">
                    <th className="pb-3 font-medium">Report ID</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map(report => (
                    <tr key={report.id} className="text-sm">
                      <td className="py-3 font-medium">{report.reportNumber}</td>
                      <td className="py-3 text-stone-600">{report.district}, {report.state}</td>
                      <td className="py-3">
                        <Badge variant={report.status === 'VET_REVIEWED' ? 'success' : 'warning'}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 text-stone-500">{formatDate(report.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
