import { forwardRef, SelectHTMLAttributes, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, value, defaultValue, onChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [internalValue, setInternalValue] = useState<string>((value ?? defaultValue ?? '') as string)
    const selectRef = useRef<HTMLSelectElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const currentValue = value !== undefined ? (value as string) : internalValue

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedOption = options.find((o) => o.value === currentValue)
    const displayLabel = selectedOption?.label || ''

    const handleSelect = (val: string) => {
      setInternalValue(val)
      setIsOpen(false)

      if (selectRef.current) {
        selectRef.current.value = val
        // Create synthetic change event
        const event = new Event('change', { bubbles: true })
        selectRef.current.dispatchEvent(event)
      }

      if (onChange) {
        const syntheticEvent = {
          target: { value: val, name: props.name },
          currentTarget: { value: val, name: props.name },
        } as React.ChangeEvent<HTMLSelectElement>
        onChange(syntheticEvent)
      }
    }

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label className="block text-sm font-semibold text-primary-800 mb-1.5">
            {label}
          </label>
        )}

        {/* Hidden native select for form libraries (react-hook-form, standard forms) */}
        <select
          ref={(node) => {
            selectRef.current = node
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ;(ref as React.MutableRefObject<HTMLSelectElement | null>).current = node
            }
          }}
          className="sr-only"
          value={currentValue}
          onChange={(e) => {
            setInternalValue(e.target.value)
            onChange?.(e)
          }}
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Premium custom dropdown button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex items-center justify-between w-full h-11 rounded-xl border-2 bg-white px-4 py-2.5 text-sm transition-all duration-200',
              'hover:border-grass-300 hover:shadow-sm',
              isOpen
                ? 'border-primary ring-2 ring-primary/15 shadow-md'
                : 'border-stone-200',
              error && 'border-red-400 hover:border-red-500',
              !displayLabel && 'text-stone-400',
              displayLabel && 'text-stone-800 font-medium',
              className
            )}
          >
            <span className="truncate">
              {displayLabel || placeholder || 'Select...'}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-stone-400 transition-transform duration-200 flex-shrink-0 ml-2',
                isOpen && 'rotate-180 text-primary'
              )}
            />
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border-2 border-grass-100 shadow-xl overflow-hidden animate-slide-up">
              <div className="max-h-60 overflow-y-auto py-1.5">
                {placeholder && (
                  <div className="px-4 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {placeholder}
                  </div>
                )}
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors duration-150 text-left',
                      option.value === currentValue
                        ? 'bg-gradient-to-r from-grass-50 to-primary-50 text-primary font-semibold'
                        : 'text-stone-700 hover:bg-grass-50/50'
                    )}
                  >
                    <span>{option.label}</span>
                    {option.value === currentValue && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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

Select.displayName = 'Select'

export { Select }
