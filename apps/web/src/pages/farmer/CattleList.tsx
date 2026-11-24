import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cattleApi } from '@/services/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'

export function CattleList() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['cattle'],
    queryFn: () => cattleApi.list(),
  })

  const cattle = data?.cattle || []

  const filteredCattle = cattle.filter((cow) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      cow.tagNumber.toLowerCase().includes(q) ||
      (cow.name && cow.name.toLowerCase().includes(q)) ||
      cow.breed.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 page-enter max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Cattle Herd</h1>
          <p className="text-stone-600 text-sm">Manage registered cattle, photos, and health status</p>
        </div>
        <Link to="/farmer/cattle/add">
          <Button className="btn-pasture">
            <Plus className="w-4 h-4 mr-2" />
            Register Cattle
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input 
                placeholder="Search by tag number, name, or breed..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredCattle.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No cattle registered"
              description="Start by registering your first cattle to track their health and upload photos"
              action={
                <Link to="/farmer/cattle/add">
                  <Button className="btn-pasture">
                    <Plus className="w-4 h-4 mr-2" />
                    Register Cattle
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCattle.map((cow) => {
                const photo =
                  cow.photos?.[0]?.photoUrl ||
                  cow.photoUrl ||
                  localStorage.getItem(`cattle_photo_${cow.id}`)

                return (
                  <Link
                    key={cow.id}
                    to={`/farmer/cattle/${cow.id}`}
                    className="flex items-center justify-between p-4 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group shadow-sm bg-white"
                  >
                    <div className="flex items-center gap-4">
                      {photo ? (
                        <img
                          src={photo}
                          alt={cow.name || cow.tagNumber}
                          className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-stone-200 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-950 text-amber-300 flex items-center justify-center text-lg font-black shadow-sm group-hover:scale-105 transition-transform">
                          {cow.name?.charAt(0) || cow.tagNumber.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-stone-900 group-hover:text-emerald-950 text-base">
                          {cow.name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-stone-500 font-medium">
                          <span className="font-mono text-stone-700 font-semibold">{cow.tagNumber}</span> • {cow.breed} • {cow.gender.toLowerCase()}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Added {formatDate(cow.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={cow.isActive ? 'success' : 'default'} className="text-[10px]">
                        {cow.isActive ? 'Active' : 'Archived'}
                      </Badge>
                      {cow.pregnancyStatus === 'PREGNANT' && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pregnant
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
