import { useState, useRef, useEffect } from 'react'
import { User, X } from 'lucide-react'
import api from '../lib/api'
import type { Customer } from '@world-of-vintage/shared'

interface Props {
  selected: Customer | null
  onSelect: (c: Customer | null) => void
}

export default function CustomerSearch({ selected, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Customer[] }>('/customers', { params: { search: query } })
        setResults(res.data.data)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (selected) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <User size={14} className="text-gray-400" />
        <span className="font-medium text-gray-900">{selected.name}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{selected.phone}</span>
        {selected.visitCount != null && (
          <span className="text-xs text-gray-400">{selected.visitCount} visits</span>
        )}
        <button
          onClick={() => onSelect(null)}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative flex-1">
      <div className="flex items-center gap-2">
        <User size={14} className="text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Customer name or phone (optional)"
          className="flex-1 text-sm py-1 focus:outline-none text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }}>
            <X size={13} className="text-gray-400" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left"
            >
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                {c.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.phone} · {c.visitCount ?? 0} visits</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => { setOpen(false) }}
            className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100"
          >
            Walk-in (no customer)
          </button>
        </div>
      )}

      {open && query.length > 1 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 text-xs text-gray-400">
          No customer found — walk-in sale
        </div>
      )}
    </div>
  )
}
