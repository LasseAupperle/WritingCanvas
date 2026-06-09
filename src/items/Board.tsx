import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function BoardCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const navigate = useNavigate()
  const boards = useStore(s => s.boards)
  const items = useStore(s => s.items)
  const updateItem = useStore(s => s.updateItem)
  const before = useRef<Item>({ ...item })
  const childBoardId = item.childBoardId
  const childBoard = childBoardId ? boards[childBoardId] : null

  const childItems = childBoardId
    ? Object.values(items).filter(i => i.boardId === childBoardId)
    : []

  const noteCount = childItems.filter(i => i.type === 'note' || i.type === 'comment').length
  const boardCount = childItems.filter(i => i.type === 'board').length
  const docCount = childItems.filter(i => i.type === 'file' || i.type === 'image').length

  const goToBoard = () => { if (childBoardId) navigate(`/b/${childBoardId}`) }
  const description = ((item.content as Record<string, unknown>)?.description as string) ?? ''

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={100}
      className="overflow-hidden flex flex-col cursor-pointer"
      onDoubleClick={goToBoard}
    >
      {/* Color header */}
      <div
        className="h-8 flex items-center px-3 gap-2 flex-shrink-0"
        style={{ background: childBoard?.color ?? '#2D7FF9' }}
      >
        <span className="text-white font-semibold text-sm truncate">
          {childBoard?.title ?? 'Board'}
        </span>
      </div>
      <div className="px-2 pt-1 pb-0.5">
        <p className="text-xs text-text-muted">
          {boardCount} boards · {noteCount} cards · {docCount} docs
        </p>
      </div>
      <div
        className="flex-1 overflow-auto px-2 pb-2"
        onDoubleClick={e => e.stopPropagation()}
      >
        <RichTextEditor
          html={description}
          onFocus={() => { before.current = { ...item } }}
          onSave={html => {
            updateItem(item.id, { content: { ...item.content, description: html } }, true)
            pushHistory({ type: 'update', before: before.current, after: { ...item, content: { ...item.content, description: html } } }, item.boardId)
          }}
          className="tiptap-note h-full outline-none text-sm text-text-primary"
          style={{ boxSizing: 'border-box' }}
        />
      </div>
    </CardShell>
  )
}
