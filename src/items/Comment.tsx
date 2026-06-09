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

export function CommentCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { text: string }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={120} minH={60}
      className="overflow-hidden"
      style={{
        background: (item.content?.cardColor as string | undefined) || '#FFFBEA',
        borderColor: (item.content?.cardColor as string | undefined) ? undefined : '#F0E8A0',
      }}
    >
      <div className="p-2 h-full">
        <textarea
          className="w-full h-full text-sm text-text-primary bg-transparent border-none outline-none resize-none"
          placeholder="Comment…"
          value={content?.text ?? ''}
          onChange={e => updateItem(item.id, { content: { text: e.target.value } }, true)}
          onPointerDown={e => e.stopPropagation()}
        />
      </div>
    </CardShell>
  )
}
