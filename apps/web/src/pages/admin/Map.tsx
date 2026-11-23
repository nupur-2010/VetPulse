import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Mock data for demo purposes
const MOCK_REPORTS = [
  { id: 1, lat: 18.5204, lng: 73.8567, district: 'Pune', disease: 'FMD', count: 5 },
  { id: 2, lat: 19.8762, lng: 75.9065, district: 'Aurangabad', disease: 'LSD', count: 3 },
  { id: 3, lat: 21.000, lng: 79.0000, district: 'Nagpur', disease: 'Mastitis', count: 7 },
  { id: 4, lat: 16.8579, lng: 74.5646, district: 'Kolhapur', disease: 'BRD', count: 4 },
]

export function AdminMap() {
  const [selectedDistrict, setSelectedDistrict] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Disease Map</h1>
        <p className="text-stone-600">Geographic distribution of health reports</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Disease Tracking</CardTitle>
            <div className="flex gap-2">
              <Select
                options={[
                  { value: '', label: 'All Districts' },
                  { value: 'pune', label: 'Pune' },
                  { value: 'aurangabad', label: 'Aurangabad' },
                  { value: 'nagpur', label: 'Nagpur' },
                ]}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                placeholder="Filter by district"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg overflow-hidden bg-stone-100">
            {/* Map placeholder - in production, integrate with actual Leaflet map */}
            <div className="w-full h-full flex items-center justify-center text-stone-400">
              <div className="text-center">
                <p className="text-lg font-medium">Map View</p>
                <p className="text-sm">Reports would be displayed here with markers</p>
                <div className="mt-4 text-xs text-stone-500">
                  {MOCK_REPORTS.length} clusters detected
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Clusters</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_REPORTS.map(report => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-medium">{report.district}</p>
                  <p className="text-sm text-stone-500">{report.disease} • {report.count} cases</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
