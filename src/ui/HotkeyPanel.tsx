import React, { useState, useEffect } from 'react'
import { X, Keyboard, RotateCcw } from 'lucide-react'
import {
  HOTKEY_DEFS, CATEGORY_LABELS,
  loadHotkeyOverrides, saveHotkeyOverride, resetHotkeyOverride, getEffectiveKey,
} from '../lib/hotkeys'

interface Props {
  onClose: () => void
}

export function HotkeyPanel({ onClose }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>(loadHotkeyOverrides)
  const [rebinding, setRebinding] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const refresh = () => setOverrides(loadHotkeyOverrides())

  useEffect(() => {
    if (!rebinding) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') { setRebinding(null); return }

      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) parts.push(key)

      if (parts.length === 0) return
      const combo = parts.join('+')
      saveHotkeyOverride(rebinding, combo)
      refresh()
      setRebinding(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rebinding])

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat, label,
    items: HOTKEY_DEFS.filter(d => d.category === cat),
  }))

  const fq = filter.toLowerCase()
  const filtered = fq
    ? HOTKEY_DEFS.filter(d =>
        d.label.toLowerCase().includes(fq) ||
        d.description.toLowerCase().includes(fq) ||
        getEffectiveKey(d, overrides).toLowerCase().includes(fq)
      )
    : null

  const isModified = (id: string) => !!overrides[id]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-card-border">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-accent" />
            <span className="font-semibold text-text-primary">Keyboard shortcuts</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="text-sm border border-card-border rounded px-2 py-1 outline-none w-40"
              placeholder="Filter…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {rebinding && (
            <div className="bg-accent/10 border border-accent rounded-lg p-3 text-sm text-accent text-center">
              Press a key combination to rebind — Escape to cancel
            </div>
          )}

          {filtered ? (
            <Section
              label="Search results"
              items={filtered}
              overrides={overrides}
              rebinding={rebinding}
              setRebinding={setRebinding}
              onReset={id => { resetHotkeyOverride(id); refresh() }}
              isModified={isModified}
            />
          ) : (
            grouped.map(g => (
              <Section
                key={g.cat}
                label={g.label}
                items={g.items}
                overrides={overrides}
                rebinding={rebinding}
                setRebinding={setRebinding}
                onReset={id => { resetHotkeyOverride(id); refresh() }}
                isModified={isModified}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-card-border text-xs text-text-muted flex justify-between items-center">
          <span>Click a shortcut to rebind it.</span>
          <button
            className="text-xs text-accent hover:underline"
            onClick={() => {
              localStorage.removeItem('canvas-hotkey-overrides')
              refresh()
            }}
          >
            Reset all to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, items, overrides, rebinding, setRebinding, onReset, isModified }: {
  label: string
  items: typeof HOTKEY_DEFS
  overrides: Record<string, string>
  rebinding: string | null
  setRebinding: (id: string | null) => void
  onReset: (id: string) => void
  isModified: (id: string) => boolean
}) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{label}</h3>
      <div className="space-y-0.5">
        {items.map(def => {
          const key = getEffectiveKey(def, overrides)
          const isRebinding = rebinding === def.id
          const modified = isModified(def.id)
          const isNonRebindable = key.includes('Drag') || key.includes('click') || key === 'Arrows'
          return (
            <div
              key={def.id}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm group hover:bg-gray-50 ${isRebinding ? 'bg-accent/5 ring-1 ring-accent' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-text-primary">{def.label}</span>
                <span className="text-text-muted ml-2 text-xs">{def.description}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {modified && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary"
                    title="Reset to default"
                    onClick={() => onReset(def.id)}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
                <kbd
                  className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                    isNonRebindable
                      ? 'border-card-border text-text-muted cursor-default'
                      : isRebinding
                        ? 'border-accent text-accent bg-accent/5 cursor-pointer'
                        : 'border-card-border text-text-primary bg-gray-50 cursor-pointer hover:border-accent hover:text-accent'
                  } ${modified ? 'border-accent/50 text-accent' : ''}`}
                  onClick={() => !isNonRebindable && setRebinding(isRebinding ? null : def.id)}
                  title={isNonRebindable ? undefined : 'Click to rebind'}
                >
                  {isRebinding ? '…' : key}
                </kbd>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
