import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { analyticsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

// Normalize a cluster from the backend DBSCAN output into a map-ready shape
interface ClusterPoint {
  id: string
  name: string
  disease: string
  status: string
  district: string
  state: string
  latitude: number
  longitude: number
  radiusKm: number
  reportCount: number
  createdAt: string
}

function normalizeClusters(raw: any): ClusterPoint[] {
  if (!raw) return []
  const list: any[] = Array.isArray(raw) ? raw : raw.clusters || []
  if (!Array.isArray(list)) return []
  return list
    .filter((c) => c && (c.centerLatitude || c.latitude) && (c.centerLongitude || c.longitude))
    .map((c) => ({
      id: c.id || c.clusterId || '',
      name: c.name || `${c.disease || 'Cluster'} Cluster`,
      disease: c.disease || c.suspectedDisease || 'Unknown',
      status: c.status || 'POTENTIAL',
      district: c.district || '—',
      state: c.state || '—',
      latitude: Number(c.centerLatitude ?? c.latitude),
      longitude: Number(c.centerLongitude ?? c.longitude),
      radiusKm: Number(c.radiusKm ?? c.radius ?? 10),
      reportCount: Number(c.reportCount ?? c.animalCount ?? 0),
      createdAt: c.createdAt || c.lastReportAt || new Date().toISOString(),
    }))
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#eab308',
  LOW: '#16a34a',
  POTENTIAL: '#3b82f6',
  UNDER_INVESTIGATION: '#ea580c',
  SUSPECTED_OUTBREAK: '#dc2626',
  LAB_CONFIRMED: '#7f1d1d',
  ACTIVE: '#dc2626',
}

export function AdminMap() {
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [clusters, setClusters] = useState<ClusterPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClusters = async () => {
    setLoading(true)
    setError('')
    try {
      const raw = await analyticsApi.getClusters()
      setClusters(normalizeClusters(raw))
    } catch (e: any) {
      console.error('Failed to load clusters', e)
      setError(e?.response?.data?.error || 'Failed to load cluster data. Make sure cluster detection has run.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClusters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const districts = useMemo(() => {
    const set = new Set(clusters.map((c) => c.district))
    return Array.from(set).sort()
  }, [clusters])

  const visibleClusters = useMemo(() => {
    if (!selectedDistrict) return clusters
    return clusters.filter((c) => c.district === selectedDistrict)
  }, [clusters, selectedDistrict])

  const recalc = async () => {
    setLoading(true)
    setError('')
    try {
      await analyticsApi.detectOutbreaks()
      await fetchClusters()
    } catch (e: any) {
      console.error('Recalculate failed', e)
      setError(e?.response?.data?.error || 'Recalculation failed')
      setLoading(false)
    }
  }

  const mapCenter: [number, number] = [20.3, 77.6] // Maharashtra centroid

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Disease Map</h1>
          <p className="text-stone-600">DBSCAN clusters from real health report data</p>
        </div>
        <Button variant="outline" onClick={recalc} disabled={loading}>
          {loading ? 'Calculating…' : 'Recalculate DBSCAN'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Disease Tracking</CardTitle>
            {/* z-[1000] ensures the dropdown renders above Leaflet map panes (max z-index ~700) */}
            <div className="relative z-[1000] min-w-[200px]">
              <Select
                options={[
                  { value: '', label: 'All Districts' },
                  ...districts.map((d) => ({ value: d, label: d })),
                ]}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                placeholder="Filter by district"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="h-[520px] rounded-lg bg-stone-100 relative overflow-hidden" style={{ zIndex: 0 }}>
            <MapContainer
              center={mapCenter}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              {/* OpenStreetMap tiles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {visibleClusters.map((cluster) => {
                const color = SEVERITY_COLORS[cluster.status.toUpperCase()] || SEVERITY_COLORS.POTENTIAL
                return (
                  <CircleMarker
                    key={cluster.id}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(10 + cluster.reportCount * 2, 32)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
                  >
                    <Tooltip>
                      <div className="text-xs">
                        <strong>{cluster.disease}</strong>
                        <br />
                        {cluster.reportCount} case(s) • {cluster.district}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <p className="font-semibold">{cluster.name}</p>
                        <p className="text-xs text-stone-600">Disease: {cluster.disease}</p>
                        <p className="text-xs text-stone-600">Status: {cluster.status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-stone-600">Cases: {cluster.reportCount}</p>
                        <p className="text-xs text-stone-600">Radius: {cluster.radiusKm} km</p>
                        <p className="text-xs text-stone-600">District: {cluster.district}, {cluster.state}</p>
                        <p className="text-xs text-stone-400">Detected: {formatDate(cluster.createdAt)}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <p className="text-stone-500">Loading cluster data…</p>
              </div>
            )}

            {!loading && visibleClusters.length === 0 && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-stone-400">
                  No clusters found. Click "Recalculate DBSCAN" to analyze the reports.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS.CRITICAL }} />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS.HIGH }} />
              <span>High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS.MEDIUM }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS.LOW }} />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS.POTENTIAL }} />
              <span>Potential</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Detected Clusters ({visibleClusters.length})</CardTitle></CardHeader>
        <CardContent>
          {visibleClusters.length === 0 ? (
            <p className="text-sm text-stone-500">No clusters detected yet.</p>
          ) : (
            <div className="space-y-3">
              {visibleClusters.map((cluster) => (
                <div key={cluster.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: SEVERITY_COLORS[cluster.status.toUpperCase()] || SEVERITY_COLORS.POTENTIAL }}
                    />
                    <div>
                      <p className="font-medium">{cluster.disease}</p>
                      <p className="text-sm text-stone-500">
                        {cluster.district} • {cluster.reportCount} cases • {cluster.radiusKm} km radius
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-stone-400">
                    {formatDate(cluster.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
