import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-primary-800 mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border-2 border-stone-200 bg-white px-4 py-2.5 text-sm',
            'placeholder:text-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all duration-200',
            'hover:border-grass-300 hover:shadow-sm',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-stone-50',
            error && 'border-red-400 focus:ring-red-100 focus:border-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-stone-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-grass-400 inline-block" />
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
