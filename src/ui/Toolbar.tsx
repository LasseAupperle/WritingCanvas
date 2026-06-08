import React, { useRef } from 'react'
import {
  FileText, Link, CheckSquare, Minus, Layout, Columns,
  MessageSquare, Table, MoreHorizontal, ImageIcon, Upload,
  Trash2, PenTool,
} from 'lucide-react'
import { useStore, type ArmedTool } from '../state/store'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import type { ItemType } from '../db/db'

const TOOLS: Array<{
  type: ItemType | 'draw'
  icon: React.ReactNode
  label: string
  shortcut?: string
}> = [
  { type: 'note', icon: <FileText size={18} />, label: 'Note' },
  { type: 'link', icon: <Link size={18} />, label: 'Link' },
  { type: 'todo', icon: <CheckSquare size={18} />, label: 'To-do' },
  { type: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
  { type: 'board', icon: <Layout size={18} />, label: 'Board' },
  { type: 'column', icon: <Columns size={18} />, label: 'Column' },
  { type: 'comment', icon: <MessageSquare size={18} />, label: 'Comment' },
  { type: 'table', icon: <Table size={18} />, label: 'Table' },
  { type: 'draw', icon: <PenTool size={18} />, label: 'Draw' },
]

export function Toolbar() {
  const armedTool = useStore(s => s.armedTool)
  const setArmedTool = useStore(s => s.setArmedTool)
  const currentBoardId = useStore(s => s.currentBoardId)
  const createItem = useStore(s => s.createItem)
  const items = useStore(s => s.items)
  const createBoard = useStore(s => s.createBoard)
  const boards = useStore(s => s.boards)

  const dragToolRef = useRef<string | null>(null)

  const arm = (type: string) => {
    if (type === 'draw') return // Phase 2 no-op
    if (armedTool === type) setArmedTool(null)
    else setArmedTool(type as ArmedTool)
  }

  // Drag-out onto canvas
  const onDragStart = (e: React.DragEvent, type: string) => {
    dragToolRef.current = type
    e.dataTransfer.setData('tool-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const unsortedCount = Object.values(items).filter(
    i => i.boardId === currentBoardId && i.content?.['unsorted']
  ).length

  return (
    <div
      className="absolute left-0 bottom-0 bg-panel-bg border-r border-card-border flex flex-col items-center py-2 gap-1 z-20"
      style={{ top: TOPBAR_HEIGHT, width: TOOLBAR_WIDTH }}
    >
      {TOOLS.map(tool => {
        const isArmed = armedTool === tool.type
        return (
          <ToolButton
            key={tool.type}
            icon={tool.icon}
            label={tool.label}
            armed={isArmed}
            onClick={() => arm(tool.type)}
            onDragStart={e => onDragStart(e, tool.type)}
          />
        )
      })}

      <div className="border-t border-card-border w-10 my-1" />

      <ToolButton
        icon={<ImageIcon size={18} />}
        label="Image"
        armed={armedTool === 'image'}
        onClick={() => arm('image')}
        onDragStart={e => onDragStart(e, 'image')}
      />
      <ToolButton
        icon={<Upload size={18} />}
        label="Upload"
        armed={armedTool === 'file'}
        onClick={() => arm('file')}
        onDragStart={e => onDragStart(e, 'file')}
      />

      <div className="flex-1" />

      <ToolButton
        icon={<Trash2 size={18} />}
        label="Trash"
        armed={false}
        onClick={() => {}}
        className="text-red-400 hover:text-red-600"
      />
    </div>
  )
}

function ToolButton({
  icon, label, armed, onClick, onDragStart, className,
}: {
  icon: React.ReactNode
  label: string
  armed: boolean
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
  className?: string
}) {
  return (
    <button
      className={`flex flex-col items-center gap-0.5 w-12 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-gray-100 transition-colors ${
        armed ? 'bg-accent text-white hover:bg-accent hover:text-white' : ''
      } ${className ?? ''}`}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      title={label}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  )
}
