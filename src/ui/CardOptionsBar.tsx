import React from 'react'
import { useStore } from '../state/store'

const CARD_COLORS = [
  { value: '', label: 'Default', bg: '#FFFFFF', border: '#E5E7EB' },
  { value: '#FFFDE7', label: 'Yellow', bg: '#FFFDE7', border: '#F9E79F' },
  { value: '#FFF8E1', label: 'Amber', bg: '#FFF8E1', border: '#FFE082' },
  { value: '#F1F8E9', label: 'Green', bg: '#F1F8E9', border: '#C5E1A5' },
  { value: '#E0F7FA', label: 'Teal', bg: '#E0F7FA', border: '#80DEEA' },
  { value: '#E3F2FD', label: 'Blue', bg: '#E3F2FD', border: '#90CAF9' },
  { value: '#EDE7F6', label: 'Indigo', bg: '#EDE7F6', border: '#B39DDB' },
  { value: '#F3E5F5', label: 'Purple', bg: '#F3E5F5', border: '#CE93D8' },
  { value: '#FCE4EC', label: 'Pink', bg: '#FCE4EC', border: '#F48FB1' },
  { value: '#FFEBEE', label: 'Red', bg: '#FFEBEE', border: '#EF9A9A' },
  { value: '#FFF3E0', label: 'Orange', bg: '#FFF3E0', border: '#FFCC80' },
  { value: '#FBE9E7', label: 'Coral', bg: '#FBE9E7', border: '#FFAB91' },
  { value: '#F5F5F5', label: 'Grey', bg: '#F5F5F5', border: '#BDBDBD' },
  { value: '#FDF6E3', label: 'Cream', bg: '#FDF6E3', border: '#E8D5A3' },
]

const BOARD_COLORS = [
  '#2D7FF9', '#0EA5E9', '#06B6D4', '#10B981',
  '#84CC16', '#F59E0B', '#F97316', '#EF4444',
  '#F43F5E', '#EC4899', '#8B5CF6', '#6B7280',
]

export function CardOptionsBar() {
  const selectedIds = useStore(s => s.selectedIds)
  const items = useStore(s => s.items)
  const boards = useStore(s => s.boards)
  const updateItem = useStore(s => s.updateItem)
  const updateBoard = useStore(s => s.updateBoard)

  if (selectedIds.size !== 1) return null
  const id = Array.from(selectedIds)[0]
  const item = items[id]
  if (!item) return null

  // Only show for types that support card color or board rename
  const isBoard = item.type === 'board'
  const supportsColor = ['note', 'comment', 'todo', 'table', 'column', 'image', 'file'].includes(item.type)
  if (!isBoard && !supportsColor) return null

  const childBoard = isBoard && item.childBoardId ? boards[item.childBoardId] : null
  const currentCardColor = (item.content?.cardColor as string | undefined) ?? ''
  const currentBoardColor = childBoard?.color ?? '#2D7FF9'

  return (
    <div
      className="absolute z-40 flex items-center gap-2 bg-white border border-card-border rounded-lg shadow-card px-2.5 py-1.5"
      style={{ bottom: 16, right: 16, pointerEvents: 'auto' }}
    >
      {isBoard && childBoard ? (
        <>
          <input
            className="text-xs border border-gray-200 rounded px-2 py-0.5 outline-none w-32"
            placeholder="Board name"
            value={childBoard.title}
            onChange={e => updateBoard(childBoard.id, { title: e.target.value })}
            onPointerDown={e => e.stopPropagation()}
          />
          <div className="w-px h-4 bg-card-border" />
          <div className="flex items-center gap-1">
            {BOARD_COLORS.map(c => (
              <button
                key={c}
                title={c}
                className="w-4 h-4 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                style={{
                  background: c,
                  outline: currentBoardColor === c ? '2px solid #2D7FF9' : 'none',
                  outlineOffset: 1,
                }}
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  updateBoard(childBoard.id, { color: c })
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-text-muted mr-1">Color</span>
          {CARD_COLORS.map(c => (
            <button
              key={c.value}
              title={c.label}
              className="w-4 h-4 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                outline: currentCardColor === c.value ? '2px solid #2D7FF9' : 'none',
                outlineOffset: 1,
              }}
              onMouseDown={e => {
                e.preventDefault()
                e.stopPropagation()
                updateItem(item.id, { content: { ...item.content, cardColor: c.value } }, true)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
