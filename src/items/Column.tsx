import React from 'react'
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
  const content = item.content as { title: string; childIds: string[] }
  const childIds: string[] = content?.childIds ?? []

  const setTitle = (title: string) => {
    updateItem(item.id, { content: { ...content, title } }, true)
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={100}
      className="overflow-hidden flex flex-col"
      style={{ background: '#F8F8F8' }}
    >
      <div onPointerDown={e => e.stopPropagation()} className="p-2 flex flex-col h-full">
        <input
          className="font-semibold text-sm text-text-primary bg-transparent border-none outline-none mb-2 w-full border-b border-card-border pb-1"
          value={content?.title ?? 'Column'}
          onChange={e => setTitle(e.target.value)}
          placeholder="Column title"
        />
        <div className="flex-1 overflow-auto space-y-1">
          {childIds.length === 0 && (
            <p className="text-xs text-text-muted italic">Drop items here</p>
          )}
          {childIds.map(id => {
            const child = items[id]
            if (!child) return null
            return (
              <div key={id} className="bg-white rounded border border-card-border p-1.5 text-xs truncate">
                {(child.content as Record<string, unknown>)?.['title'] as string ||
                 ((child.content as Record<string, unknown>)?.['html']
                   ? (child.content as Record<string, unknown>)['html'] as string
                   : child.type)}
              </div>
            )
          })}
        </div>
      </div>
    </CardShell>
  )
}
