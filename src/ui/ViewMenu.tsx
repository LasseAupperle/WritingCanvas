import React, { useState, useRef, useEffect } from 'react'
import { Settings2, ChevronDown } from 'lucide-react'
import { useStore } from '../state/store'

export function ViewMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const snapToGrid = useStore(s => s.snapToGrid)
  const showGrid = useStore(s => s.showGrid)
  const smartGuides = useStore(s => s.smartGuides)
  const setSnapToGrid = useStore(s => s.setSnapToGrid)
  const setShowGrid = useStore(s => s.setShowGrid)
  const setSmartGuides = useStore(s => s.setSmartGuides)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 text-xs text-text-muted hover:bg-gray-100 rounded px-2 py-1"
        onClick={() => setOpen(o => !o)}
      >
        <Settings2 size={14} />
        View
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-card-border rounded shadow-lg z-50 w-48 py-1">
          <Toggle label="Smart guides" value={smartGuides} onChange={setSmartGuides} />
          <Toggle label="Snap to grid" value={snapToGrid} onChange={v => { setSnapToGrid(v); if (v) setShowGrid(true) }} />
          <Toggle label="Grid overlay" value={showGrid} onChange={setShowGrid} />
        </div>
      )}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center justify-between"
      onClick={() => onChange(!value)}
    >
      {label}
      <span className={`w-3 h-3 rounded-full border ${value ? 'bg-accent border-accent' : 'border-card-border'}`} />
    </button>
  )
}
