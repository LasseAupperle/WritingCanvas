import React from 'react'
import { useNavigate } from 'react-router-dom'
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

export function BoardCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const navigate = useNavigate()
  const boards = useStore(s => s.boards)
  const items = useStore(s => s.items)
  const childBoardId = item.childBoardId
  const childBoard = childBoardId ? boards[childBoardId] : null

  const childItems = childBoardId
    ? Object.values(items).filter(i => i.boardId === childBoardId)
    : []

  const childBoards = childItems.filter(i => i.type === 'board').slice(0, 5)
  const noteCount = childItems.filter(i => i.type === 'note' || i.type === 'comment').length
  const boardCount = childItems.filter(i => i.type === 'board').length
  const docCount = childItems.filter(i => i.type === 'file' || i.type === 'image').length

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (childBoardId) navigate(`/b/${childBoardId}`)
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={100}
      onDoubleClick={onDoubleClick}
      className="overflow-hidden cursor-pointer"
    >
      {/* Color header */}
      <div
        className="h-8 flex items-center px-3 gap-2"
        style={{ background: childBoard?.color ?? '#2D7FF9' }}
      >
        <span className="text-white font-semibold text-sm truncate">
          {childBoard?.title ?? 'Board'}
        </span>
      </div>
      <div className="p-2 flex-1 overflow-hidden">
        <p className="text-xs text-text-muted mb-1">
          {boardCount} boards · {noteCount} cards · {docCount} docs
        </p>
        {childBoards.length > 0 && (
          <div className="space-y-0.5">
            {childBoards.map(cb => {
              const cbBoard = cb.childBoardId ? boards[cb.childBoardId] : null
              const cbItems = cb.childBoardId
                ? Object.values(items).filter(i => i.boardId === cb.childBoardId).length
                : 0
              return (
                <div key={cb.id} className="flex items-center gap-1 text-xs text-text-primary">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: cbBoard?.color ?? '#aaa' }}
                  />
                  <span className="truncate">{cbBoard?.title ?? '...'}</span>
                  <span className="text-text-muted ml-auto">{cbItems}</span>
                </div>
              )
            })}
          </div>
        )}
        {childBoards.length === 0 && (
          <p className="text-xs text-text-muted italic">Double-click to open</p>
        )}
      </div>
    </CardShell>
  )
}
