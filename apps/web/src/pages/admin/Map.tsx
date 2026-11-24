import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MultiSelect, MultiSelectOption } from '@/components/ui/MultiSelect'
import { analyticsApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

// Normalize a cluster from the backend DBSCAN output into a map-ready shape
interface ClusterPoint {
  id: string
  name: string
  disease: string
  status: string
  severity: string
  district: string
  state: string
  latitude: number
  longitude: number
  radiusKm: number
  reportCount: number
  createdAt: string
}

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#eab308',
  LOW: '#16a34a',
  POTENTIAL: '#3b82f6',
  UNDER_INVESTIGATION: '#ea580c',
  SUSPECTED_OUTBREAK: '#dc2626',
  DISMISSED: '#78716c',
  ACTIVE: '#dc2626',
}

export const CORE_DISEASES = [
  'Foot-and-Mouth Disease',
  'Blackleg',
  'Anthrax',
  'Bovine Respiratory Disease',
  'Haemorrhagic Septicaemia',
  'Lumpy Skin Disease',
  'Mastitis',
  'Theileriosis',
  'Clostridial Diseases',
  'Brucellosis',
]

export const RISK_FILTER_OPTIONS: MultiSelectOption[] = [
  { value: 'CRITICAL', label: 'Critical (≥10 cases)', color: SEVERITY_COLORS.CRITICAL },
  { value: 'HIGH', label: 'High (6-9 cases)', color: SEVERITY_COLORS.HIGH },
  { value: 'MEDIUM', label: 'Medium (4-5 cases)', color: SEVERITY_COLORS.MEDIUM },
  { value: 'LOW', label: 'Low (3 cases)', color: SEVERITY_COLORS.LOW },
  { value: 'POTENTIAL', label: 'Potential Surveillance', color: SEVERITY_COLORS.POTENTIAL },
]

export const DISEASE_FILTER_OPTIONS: MultiSelectOption[] = [
  { value: 'Foot-and-Mouth Disease', label: 'Foot-and-Mouth Disease' },
  { value: 'Blackleg', label: 'Blackleg' },
  { value: 'Anthrax', label: 'Anthrax' },
  { value: 'Bovine Respiratory Disease', label: 'Bovine Respiratory Disease' },
  { value: 'Haemorrhagic Septicaemia', label: 'Haemorrhagic Septicaemia' },
  { value: 'Lumpy Skin Disease', label: 'Lumpy Skin Disease' },
  { value: 'Mastitis', label: 'Mastitis' },
  { value: 'Theileriosis', label: 'Theileriosis' },
  { value: 'Clostridial Diseases', label: 'Clostridial Diseases' },
  { value: 'Brucellosis', label: 'Brucellosis' },
  { value: 'Other', label: 'Other Diseases' },
]

function getClusterSeverity(c: any): string {
  const explicit = (c.severity || c.riskLevel || '').toUpperCase()
  if (explicit && SEVERITY_COLORS[explicit]) return explicit

  const statusUpper = (c.status || '').toUpperCase()
  if (statusUpper === 'LAB_CONFIRMED') return 'CRITICAL'
  if (statusUpper === 'SUSPECTED_OUTBREAK') return 'CRITICAL'
  if (statusUpper === 'UNDER_INVESTIGATION') return 'HIGH'
  if (statusUpper === 'CRITICAL' || statusUpper === 'HIGH' || statusUpper === 'MEDIUM' || statusUpper === 'LOW') {
    return statusUpper
  }

  const count = Number(c.reportCount ?? c.animalCount ?? 0)
  if (count >= 10) return 'CRITICAL'
  if (count >= 6) return 'HIGH'
  if (count >= 4) return 'MEDIUM'
  if (count >= 1) return 'LOW'

  return 'POTENTIAL'
}

export function getClusterColor(cluster: { status?: string; severity?: string; reportCount?: number; animalCount?: number }): string {
  const statusUpper = (cluster.status || '').toUpperCase()
  if (statusUpper === 'LAB_CONFIRMED') return SEVERITY_COLORS.CRITICAL
  if (statusUpper === 'SUSPECTED_OUTBREAK') return SEVERITY_COLORS.SUSPECTED_OUTBREAK
  if (statusUpper === 'UNDER_INVESTIGATION') return SEVERITY_COLORS.UNDER_INVESTIGATION
  if (statusUpper === 'DISMISSED') return SEVERITY_COLORS.DISMISSED

  const severityUpper = (cluster.severity || '').toUpperCase()
  if (SEVERITY_COLORS[severityUpper]) return SEVERITY_COLORS[severityUpper]

  const count = Number(cluster.reportCount ?? cluster.animalCount ?? 0)
  if (count >= 10) return SEVERITY_COLORS.CRITICAL
  if (count >= 6) return SEVERITY_COLORS.HIGH
  if (count >= 4) return SEVERITY_COLORS.MEDIUM
  if (count >= 1) return SEVERITY_COLORS.LOW

  return SEVERITY_COLORS.POTENTIAL
}

function normalizeClusters(raw: any): ClusterPoint[] {
  if (!raw) return []
  const list: any[] = Array.isArray(raw) ? raw : raw.clusters || []
  if (!Array.isArray(list)) return []
  return list
    .filter((c) => c && (c.centerLatitude || c.latitude) && (c.centerLongitude || c.longitude))
    .map((c) => {
      const severity = getClusterSeverity(c)
      const fallbackDistrict = c.name ? c.name.split(' ')[0] : 'Maharashtra'
      return {
        id: c.id || c.clusterId || '',
        name: c.name || `${c.disease || 'Cluster'} Cluster`,
        disease: c.disease || c.suspectedDisease || 'Unknown',
        status: c.status || 'POTENTIAL',
        severity,
        district: c.district && c.district !== '—' ? c.district : fallbackDistrict,
        state: c.state && c.state !== '—' ? c.state : 'Maharashtra',
        latitude: Number(c.centerLatitude ?? c.latitude),
        longitude: Number(c.centerLongitude ?? c.longitude),
        radiusKm: Number(c.radiusKm ?? c.radius ?? 10),
        reportCount: Number(c.reportCount ?? c.animalCount ?? 0),
        createdAt: c.createdAt || c.lastReportAt || new Date().toISOString(),
      }
    })
}

export function AdminMap() {
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([])
  const [selectedRisks, setSelectedRisks] = useState<string[]>([])
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([])
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
    return clusters.filter((c) => {
      // 1. District multi-select filter
      if (selectedDistricts.length > 0 && !selectedDistricts.includes(c.district)) {
        return false
      }
      // 2. Risk level multi-select filter
      if (selectedRisks.length > 0 && !selectedRisks.includes(c.severity)) {
        return false
      }
      // 3. Disease multi-select filter
      if (selectedDiseases.length > 0) {
        const directMatch = selectedDiseases.includes(c.disease)
        const isOther = !CORE_DISEASES.includes(c.disease)
        const otherMatch = selectedDiseases.includes('Other') && isOther
        if (!directMatch && !otherMatch) {
          return false
        }
      }
      return true
    })
  }, [clusters, selectedDistricts, selectedRisks, selectedDiseases])

  const hasActiveFilters = selectedDistricts.length > 0 || selectedRisks.length > 0 || selectedDiseases.length > 0

  const handleResetFilters = () => {
    setSelectedDistricts([])
    setSelectedRisks([])
    setSelectedDiseases([])
  }

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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle>Live Disease Tracking</CardTitle>
              <p className="text-xs text-stone-500 mt-1">
                Showing {visibleClusters.length} of {clusters.length} detected clusters
              </p>
            </div>

            {/* Filter controls beside district filter with multi-select support */}
            {/* z-[1000] ensures the dropdowns render above Leaflet map panes */}
            <div className="relative z-[1000] flex flex-wrap items-center gap-2.5">
              <MultiSelect
                label="District"
                placeholder="All Districts"
                options={districts.map((d) => ({ value: d, label: d }))}
                selected={selectedDistricts}
                onChange={setSelectedDistricts}
                showSearch
              />

              <MultiSelect
                label="Risk"
                placeholder="All Risk Levels"
                options={RISK_FILTER_OPTIONS}
                selected={selectedRisks}
                onChange={setSelectedRisks}
              />

              <MultiSelect
                label="Disease"
                placeholder="All Diseases"
                options={DISEASE_FILTER_OPTIONS}
                selected={selectedDiseases}
                onChange={setSelectedDiseases}
                showSearch
              />

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs h-8 text-stone-600 hover:text-stone-900 border-dashed rounded-xl"
                >
                  Reset Filters
                </Button>
              )}
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
                const color = getClusterColor(cluster)
                return (
                  <CircleMarker
                    key={cluster.id}
                    center={[cluster.latitude, cluster.longitude]}
                    radius={Math.min(10 + cluster.reportCount * 2, 32)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 2 }}
                  >
                    <Tooltip>
                      <div className="text-xs">
                        <strong>{cluster.disease}</strong>
                        <br />
                        <span style={{ color }}>● {cluster.severity}</span> • {cluster.reportCount} case(s) • {cluster.district}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="text-sm min-w-[200px]">
                        <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-1.5 mb-2">
                          <p className="font-bold text-stone-900">{cluster.name}</p>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                            style={{ background: color }}
                          >
                            {cluster.severity}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600"><strong>Disease:</strong> {cluster.disease}</p>
                        <p className="text-xs text-stone-600"><strong>Status:</strong> {cluster.status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-stone-600"><strong>Cases:</strong> {cluster.reportCount} reports</p>
                        <p className="text-xs text-stone-600"><strong>Radius:</strong> {cluster.radiusKm} km</p>
                        <p className="text-xs text-stone-600"><strong>District:</strong> {cluster.district}, {cluster.state}</p>
                        <p className="text-xs text-stone-400 mt-1"><strong>Detected:</strong> {formatDate(cluster.createdAt)}</p>
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
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: SEVERITY_COLORS.CRITICAL }} />
              <span className="font-medium text-stone-800">Critical (≥10 cases / Outbreak)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: SEVERITY_COLORS.HIGH }} />
              <span className="font-medium text-stone-800">High (6-9 cases / Investigation)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: SEVERITY_COLORS.MEDIUM }} />
              <span className="font-medium text-stone-800">Medium (4-5 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: SEVERITY_COLORS.LOW }} />
              <span className="font-medium text-stone-800">Low (3 cases)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ background: SEVERITY_COLORS.POTENTIAL }} />
              <span className="font-medium text-stone-800">Potential Surveillance</span>
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
              {visibleClusters.map((cluster) => {
                const color = getClusterColor(cluster)
                return (
                  <div key={cluster.id} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl hover:bg-stone-100/70 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ background: color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-stone-900">{cluster.disease}</p>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
                            style={{ background: color }}
                          >
                            {cluster.severity}
                          </span>
                          {cluster.status && cluster.status !== 'POTENTIAL' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-200 text-stone-700">
                              {cluster.status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {cluster.district}, {cluster.state} • {cluster.reportCount} cases • {cluster.radiusKm} km radius
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-stone-400 font-medium whitespace-nowrap">
                      {formatDate(cluster.createdAt)}
                    </span>
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
