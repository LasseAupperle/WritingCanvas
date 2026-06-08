import React from 'react'
import {
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
} from 'lucide-react'
import { useStore } from '../state/store'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'

export function AlignToolbar() {
  const selectedIds = useStore(s => s.selectedIds)
  const items = useStore(s => s.items)
  const updateItem = useStore(s => s.updateItem)

  if (selectedIds.size < 2) return null

  const sel = Array.from(selectedIds)
    .map(id => items[id])
    .filter(Boolean)

  const align = (fn: (i: typeof sel[0]) => { x?: number; y?: number }) => {
    for (const item of sel) {
      const patch = fn(item)
      if (patch.x !== undefined || patch.y !== undefined) {
        updateItem(item.id, patch)
      }
    }
  }

  const minX = Math.min(...sel.map(i => i.x))
  const maxX = Math.max(...sel.map(i => i.x + i.w))
  const minY = Math.min(...sel.map(i => i.y))
  const maxY = Math.max(...sel.map(i => i.y + i.h))
  const ctrX = (minX + maxX) / 2
  const ctrY = (minY + maxY) / 2

  const distributeH = () => {
    if (sel.length < 3) return
    const sorted = [...sel].sort((a, b) => a.x - b.x)
    const totalW = sorted.reduce((s, i) => s + i.w, 0)
    const space = (maxX - minX - totalW) / (sorted.length - 1)
    let x = minX
    for (const item of sorted) {
      updateItem(item.id, { x })
      x += item.w + space
    }
  }

  const distributeV = () => {
    if (sel.length < 3) return
    const sorted = [...sel].sort((a, b) => a.y - b.y)
    const totalH = sorted.reduce((s, i) => s + i.h, 0)
    const space = (maxY - minY - totalH) / (sorted.length - 1)
    let y = minY
    for (const item of sorted) {
      updateItem(item.id, { y })
      y += item.h + space
    }
  }

  const actions = [
    { icon: <AlignLeft size={14} />, title: 'Align left', fn: () => align(() => ({ x: minX })) },
    { icon: <AlignCenter size={14} />, title: 'Center horizontal', fn: () => align(i => ({ x: ctrX - i.w / 2 })) },
    { icon: <AlignRight size={14} />, title: 'Align right', fn: () => align(i => ({ x: maxX - i.w })) },
    { icon: <AlignStartVertical size={14} />, title: 'Align top', fn: () => align(() => ({ y: minY })) },
    { icon: <AlignCenterVertical size={14} />, title: 'Center vertical', fn: () => align(i => ({ y: ctrY - i.h / 2 })) },
    { icon: <AlignEndVertical size={14} />, title: 'Align bottom', fn: () => align(i => ({ y: maxY - i.h })) },
  ]

  return (
    <div
      className="absolute z-40 flex items-center gap-0.5 bg-white border border-card-border rounded-lg shadow-card px-1.5 py-1"
      style={{ bottom: 16, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
    >
      {actions.map((a, i) => (
        <button
          key={i}
          title={a.title}
          className="p-1 rounded hover:bg-gray-100 text-text-muted hover:text-text-primary"
          onClick={a.fn}
        >
          {a.icon}
        </button>
      ))}
      {sel.length >= 3 && (
        <>
          <div className="w-px h-4 bg-card-border mx-0.5" />
          <button
            title="Distribute horizontally"
            className="p-1 rounded hover:bg-gray-100 text-text-muted hover:text-text-primary text-xs font-mono"
            onClick={distributeH}
          >⇔</button>
          <button
            title="Distribute vertically"
            className="p-1 rounded hover:bg-gray-100 text-text-muted hover:text-text-primary text-xs font-mono"
            onClick={distributeV}
          >⇕</button>
        </>
      )}
    </div>
  )
}
