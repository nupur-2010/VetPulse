import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cattleApi } from '@/services/api'
import { formatDate } from '@/lib/utils'

export function CattleList() {
  const { data, isLoading } = useQuery({
    queryKey: ['cattle'],
    queryFn: () => cattleApi.list(),
  })

  const cattle = data?.cattle || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Cattle</h1>
          <p className="text-stone-600">Manage your registered cattle</p>
        </div>
        <Link to="/farmer/cattle/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Register Cattle
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
              <Input 
                placeholder="Search by tag number or name..." 
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : cattle.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No cattle registered"
              description="Start by registering your first cattle to track their health"
              action={
                <Link to="/farmer/cattle/add">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Register Cattle
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {cattle.map((cow) => (
                <Link
                  key={cow.id}
                  to={`/farmer/cattle/${cow.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-stone-200 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary flex items-center justify-center text-lg font-semibold">
                      {cow.name?.charAt(0) || cow.tagNumber.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{cow.name || 'Unnamed'}</p>
                      <p className="text-sm text-stone-500">
                        {cow.tagNumber} • {cow.breed} • {cow.gender.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={cow.isActive ? 'success' : 'default'}>
                      {cow.isActive ? 'Active' : 'Archived'}
                    </Badge>
                    <span className="text-sm text-stone-500">
                      Added {formatDate(cow.createdAt)}
                    </span>
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
