import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { analyticsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

const statusConfig: Record<string, { bg: string; text: string }> = {
  POTENTIAL: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  UNDER_INVESTIGATION: { bg: 'bg-orange-50', text: 'text-orange-700' },
  SUSPECTED_OUTBREAK: { bg: 'bg-red-50', text: 'text-red-700' },
  LAB_CONFIRMED: { bg: 'bg-red-100', text: 'text-red-800' },
  DISMISSED: { bg: 'bg-stone-50', text: 'text-stone-700' },
}

interface ClusterRow {
  id: string
  name: string
  disease: string
  status: string
  district: string
  state: string
  reportCount: number
  radiusKm: number
  createdAt: string
}

function normalize(raw: any): ClusterRow[] {
  const list: any[] = Array.isArray(raw) ? raw : raw?.clusters || []
  if (!Array.isArray(list)) return []
  return list.map((c) => {
    const fallbackDistrict = c.name ? c.name.split(' ')[0] : 'Maharashtra'
    return {
      id: c.id || '',
      name: c.name || `${c.disease || 'Cluster'} Cluster`,
      disease: c.disease || c.suspectedDisease || 'Unknown',
      status: c.status || 'POTENTIAL',
      district: c.district && c.district !== '—' ? c.district : fallbackDistrict,
      state: c.state && c.state !== '—' ? c.state : 'Maharashtra',
      reportCount: Number(c.reportCount ?? c.animalCount ?? 0),
      radiusKm: Number(c.radiusKm ?? 10),
      createdAt: c.createdAt || c.lastReportAt || new Date().toISOString(),
    }
  })
}

export function AdminOutbreaks() {
  const [outbreaks, setOutbreaks] = useState<ClusterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClusters = async () => {
    setLoading(true)
    setError('')
    try {
      const raw = await analyticsApi.getClusters()
      setOutbreaks(normalize(raw))
    } catch (e: any) {
      console.error('Failed to load clusters', e)
      setError(e?.response?.data?.error || 'Failed to load outbreak data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const recalc = async () => {
    setLoading(true)
    setError('')
    try {
      await analyticsApi.detectOutbreaks()
      const raw = await analyticsApi.getClusters()
      setOutbreaks(normalize(raw))
    } catch (e: any) {
      console.error('Recalculate failed', e)
      setError(e?.response?.data?.error || 'Recalculation failed')
    } finally {
      setLoading(false)
    }
  }

  const countBy = (statuses: string[]) => outbreaks.filter((o) => statuses.includes(o.status)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Outbreak Detection</h1>
          <p className="text-stone-600">Monitor and investigate potential disease outbreaks (DBSCAN)</p>
        </div>
        <Button variant="outline" onClick={recalc} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Recalculate
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{loading ? '…' : countBy(['POTENTIAL'])}</p>
            <p className="text-sm text-stone-500">Potential</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{loading ? '…' : countBy(['UNDER_INVESTIGATION'])}</p>
            <p className="text-sm text-stone-500">Investigating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {loading ? '…' : countBy(['SUSPECTED_OUTBREAK', 'LAB_CONFIRMED'])}
            </p>
            <p className="text-sm text-stone-500">Active Outbreaks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-stone-600">{loading ? '…' : countBy(['DISMISSED'])}</p>
            <p className="text-sm text-stone-500">Dismissed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-stone-500">Loading clusters…</p>
          ) : outbreaks.length === 0 ? (
            <p className="text-sm text-stone-500">
              No disease clusters detected yet. Click "Recalculate" to run DBSCAN on the health reports.
            </p>
          ) : (
          <div className="space-y-3">
            {outbreaks.map((outbreak) => {
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
                      <p className="text-sm text-stone-500">
                        {outbreak.disease} • {outbreak.district}, {outbreak.state} • {outbreak.radiusKm} km radius
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500">{outbreak.reportCount} reports</span>
                    <Badge className={config.bg + ' ' + config.text}>{outbreak.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-stone-400">{formatDate(outbreak.createdAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
