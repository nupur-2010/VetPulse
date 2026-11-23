import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

const MOCK_OUTBREAKS = [
  { id: '1', name: 'Pune FMD Cluster', status: 'POTENTIAL', district: 'Pune', state: 'Maharashtra', animalCount: 5, createdAt: new Date().toISOString() },
  { id: '2', name: 'Nagpur LSD Alert', status: 'UNDER_INVESTIGATION', district: 'Nagpur', state: 'Maharashtra', animalCount: 8, createdAt: new Date().toISOString() },
  { id: '3', name: 'Kolhapur Mastitis', status: 'SUSPECTED_OUTBREAK', district: 'Kolhapur', state: 'Maharashtra', animalCount: 12, createdAt: new Date().toISOString() },
  { id: '4', name: 'Aurangabad BRD', status: 'LAB_CONFIRMED', district: 'Aurangabad', state: 'Maharashtra', animalCount: 6, createdAt: new Date().toISOString() },
]

const statusConfig: Record<string, { bg: string; text: string }> = {
  POTENTIAL: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  UNDER_INVESTIGATION: { bg: 'bg-orange-50', text: 'text-orange-700' },
  SUSPECTED_OUTBREAK: { bg: 'bg-red-50', text: 'text-red-700' },
  LAB_CONFIRMED: { bg: 'bg-red-100', text: 'text-red-800' },
  DISMISSED: { bg: 'bg-stone-50', text: 'text-stone-700' },
}

export function AdminOutbreaks() {
  const outbreaks = MOCK_OUTBREAKS

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Outbreak Detection</h1>
          <p className="text-stone-600">Monitor and investigate potential disease outbreaks</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalculate
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{outbreaks.filter(o => o.status === 'POTENTIAL').length}</p>
            <p className="text-sm text-stone-500">Potential</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{outbreaks.filter(o => o.status === 'UNDER_INVESTIGATION').length}</p>
            <p className="text-sm text-stone-500">Investigating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">{outbreaks.filter(o => o.status === 'SUSPECTED_OUTBREAK' || o.status === 'LAB_CONFIRMED').length}</p>
            <p className="text-sm text-stone-500">Active Outbreaks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-stone-600">{outbreaks.filter(o => o.status === 'DISMISSED').length}</p>
            <p className="text-sm text-stone-500">Dismissed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {outbreaks.map(outbreak => {
              const config = statusConfig[outbreak.status] || statusConfig.POTENTIAL
              return (
                <div key={outbreak.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    {outbreak.status === 'LAB_CONFIRMED' ? (
                      <CheckCircle className="w-5 h-5 text-red-600" />
                    ) : outbreak.status === 'DISMISSED' ? (
                      <XCircle className="w-5 h-5 text-stone-400" />
                    ) : (
                      <AlertTriangle className={`w-5 h-5 ${outbreak.status === 'SUSPECTED_OUTBREAK' ? 'text-red-600' : 'text-yellow-600'}`} />
                    )}
                    <div>
                      <p className="font-semibold">{outbreak.name}</p>
                      <p className="text-sm text-stone-500">{outbreak.district}, {outbreak.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500">{outbreak.animalCount} animals</span>
                    <Badge className={config.bg + ' ' + config.text}>{outbreak.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-stone-400">{formatDate(outbreak.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
