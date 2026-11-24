import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    success: 'bg-gradient-to-r from-grass-50 to-green-50 text-green-700 border-green-200',
    warning: 'bg-gradient-to-r from-sunset-50 to-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200',
    info: 'bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 border-blue-200',
  }

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border shadow-sm',
        variants[variant],
        sizes[size],
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 mr-1.5" />
      {children}
    </span>
  )
}
