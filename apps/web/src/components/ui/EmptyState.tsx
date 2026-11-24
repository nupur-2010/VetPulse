import { cn } from '@/lib/utils'
import { Leaf } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon ? (
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-grass-50 to-primary-50 flex items-center justify-center mb-5 shadow-sm border border-grass-100">
          {icon}
        </div>
      ) : (
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-grass-50 to-primary-50 flex items-center justify-center mb-5 shadow-sm border border-grass-100">
          <Leaf className="w-8 h-8 text-grass-400" />
        </div>
      )}
      <h3 className="text-lg font-bold text-primary-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-stone-500 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
