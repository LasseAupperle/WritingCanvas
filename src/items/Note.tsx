import React, { useRef } from 'react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'
import { RichTextEditor } from './RichTextEditor'
import { pushHistory } from '../state/history'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function NoteCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { html: string } | undefined
  const before = useRef<Item>({ ...item })

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={120} minH={60}
      className="overflow-auto"
    >
      <RichTextEditor
        html={content?.html ?? ''}
        onFocus={() => { before.current = { ...item } }}
        onSave={html => {
          updateItem(item.id, { content: { ...item.content, html } }, true)
          pushHistory({ type: 'update', before: before.current, after: { ...item, content: { ...item.content, html } } }, item.boardId)
        }}
        className="tiptap-note h-full outline-none text-sm text-text-primary"
        style={{ padding: '8px', boxSizing: 'border-box' }}
      />
    </CardShell>
  )
}
