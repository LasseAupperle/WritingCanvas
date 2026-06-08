import React, { useState } from 'react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function ColumnCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const items = useStore(s => s.items)
  const selectedIds = useStore(s => s.selectedIds)
  const content = item.content as { title: string; childIds: string[] }
  const childIds: string[] = content?.childIds ?? []
  const [dropHighlight, setDropHighlight] = useState(false)

  const setTitle = (title: string) => {
    updateItem(item.id, { content: { ...content, title } }, true)
  }

  // When pointer is released inside the column body, absorb selected items
  const onInnerPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    setDropHighlight(false)
    const sel = Array.from(selectedIds).filter(id => id !== item.id)
    if (sel.length === 0) return
    const newChildIds = [...new Set([...childIds, ...sel])]
    updateItem(item.id, { content: { ...content, childIds: newChildIds } })
    // Move added items inside column bounds (offset from column position)
    sel.forEach((id, i) => {
      const child = items[id]
      if (!child) return
      updateItem(id, {
        x: item.x + 8,
        y: item.y + 48 + i * (child.h + 8),
        w: item.w - 16,
      })
    })
  }

  const removeChild = (id: string) => {
    updateItem(item.id, {
      content: { ...content, childIds: childIds.filter(c => c !== id) },
    })
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={100}
      className="overflow-hidden flex flex-col"
      style={{
        background: '#F8F8F8',
        outline: dropHighlight ? '2px dashed #2D7FF9' : undefined,
      }}
    >
      <div className="p-2 flex flex-col h-full">
        <input
          className="font-semibold text-sm text-text-primary bg-transparent border-none outline-none mb-2 w-full border-b border-card-border pb-1"
          value={content?.title ?? 'Column'}
          onChange={e => setTitle(e.target.value)}
          placeholder="Column title"
          onPointerDown={e => e.stopPropagation()}
        />
        {/* Drop zone body */}
        <div
          className="flex-1 overflow-auto space-y-1 min-h-[32px]"
          onPointerEnter={() => setDropHighlight(true)}
          onPointerLeave={() => setDropHighlight(false)}
          onPointerUp={onInnerPointerUp}
        >
          {childIds.length === 0 && (
            <p className="text-xs text-text-muted italic">Drop items here</p>
          )}
          {childIds.map(id => {
            const child = items[id]
            if (!child) return null
            const childContent = child.content as Record<string, unknown>
            const label =
              (childContent?.['title'] as string) ||
              (childContent?.['html']
                ? (childContent['html'] as string).replace(/<[^>]*>/g, '').slice(0, 40)
                : child.type)
            return (
              <div key={id} className="bg-white rounded border border-card-border p-1.5 text-xs flex justify-between items-center gap-1">
                <span className="truncate">{label}</span>
                <button
                  className="text-text-muted hover:text-red-500 flex-shrink-0"
                  onClick={() => removeChild(id)}
                  onPointerDown={e => e.stopPropagation()}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </CardShell>
  )
}
