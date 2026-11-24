import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
  color?: string
}

export interface MultiSelectProps {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  showSearch?: boolean
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  className,
  showSearch = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = showSearch && search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleSelectAll = () => {
    onChange(options.map((opt) => opt.value))
  }

  const handleClear = () => {
    onChange([])
  }

  const getButtonText = () => {
    if (selected.length === 0) {
      return placeholder || `All ${label}s`
    }
    if (selected.length === 1) {
      const match = options.find((o) => o.value === selected[0])
      return match ? match.label : selected[0]
    }
    return `${label} (${selected.length})`
  }

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all shadow-sm',
          selected.length > 0
            ? 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100/70'
            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
        )}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
          <span className="text-stone-400 font-normal">{label}:</span>
          <span className="font-bold truncate">{getButtonText()}</span>
        </div>

        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  handleClear()
                }
              }}
              className="p-0.5 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={cn('w-3.5 h-3.5 text-stone-400 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[240px] max-w-[320px] bg-white rounded-2xl shadow-xl border border-stone-200 py-2.5 z-[1050] animate-in fade-in-50 zoom-in-95">
          {/* Search box if enabled */}
          {showSearch && (
            <div className="px-3 pb-2 border-b border-stone-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Action Bar (Select All / Clear) */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-stone-500 border-b border-stone-100">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-stone-400 hover:text-stone-700 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto px-1 py-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-3">No matching options</p>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value)
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggle(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleToggle(opt.value)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors',
                      isChecked ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-white'
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ background: opt.color }}
                      />
                    )}

                    <span className="truncate flex-1">{opt.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
