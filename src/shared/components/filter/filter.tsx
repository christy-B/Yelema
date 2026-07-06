import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterProps {
  label: string
  options: FilterOption[]
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function Filter({ label, options, value = '', onChange, className = '' }: FilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocument = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocument)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocument); document.removeEventListener('keydown', onKey) }
  }, [open])

  const current = options.find((option) => option.value === value) ?? options[0]
  const isActive = value !== (options[0]?.value ?? '')

  return (
    <div className={`filter ${className}`.trim()} ref={ref}>
      <button type="button" className={isActive ? 'filter-trigger is-active' : 'filter-trigger'} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((value) => !value)}>
        <span>{current?.label}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open && (
        <ul className="filter-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button type="button" className={option.value === value ? 'filter-option is-active' : 'filter-option'} onClick={() => { onChange?.(option.value); setOpen(false) }}>{option.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
