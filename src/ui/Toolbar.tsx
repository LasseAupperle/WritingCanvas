import React, { useState } from 'react'
import {
  FileText, Link, CheckSquare, Minus, Layout, Columns,
  MessageSquare, Table, ImageIcon, Upload, Trash2, PenTool, Keyboard,
} from 'lucide-react'
import { useStore, type ArmedTool } from '../state/store'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import { Tooltip, ToolTooltipContent } from './Tooltip'
import { HotkeyPanel } from './HotkeyPanel'
import type { ItemType } from '../db/db'

interface ToolDef {
  type: ItemType | 'draw'
  icon: React.ReactNode
  label: string
  description: string
  shortcut?: string
  tip?: string
  dragDisabled?: boolean
}

const TOOLS: ToolDef[] = [
  {
    type: 'note',
    icon: <FileText size={18} />,
    label: 'Note',
    description: 'Rich text card. Supports headings, lists, bold, italic, links, checkboxes and more.',
    tip: 'Tip: Double-click empty canvas to create a note instantly',
  },
  {
    type: 'link',
    icon: <Link size={18} />,
    label: 'Link',
    description: 'Paste a URL to save as a clickable link card with favicon and domain.',
  },
  {
    type: 'todo',
    icon: <CheckSquare size={18} />,
    label: 'To-do',
    description: 'Checklist card. Add tasks, check them off, and track progress.',
    tip: 'Press Enter inside a task to add a new one',
  },
  {
    type: 'line',
    icon: <Minus size={18} />,
    label: 'Line',
    description: 'Draw a connector between two points. Click once for the start, click again for the end.',
    shortcut: 'L',
    tip: 'Press L to arm, then click twice on the canvas',
    dragDisabled: true,
  },
  {
    type: 'board',
    icon: <Layout size={18} />,
    label: 'Board',
    description: 'A nested board inside the current board. Double-click the card to navigate inside it.',
    tip: 'Boards can be nested infinitely deep',
  },
  {
    type: 'column',
    icon: <Columns size={18} />,
    label: 'Column',
    description: 'A vertical container. Drag other items onto it to group them in a list.',
    tip: 'Drop items on the column to add them',
  },
  {
    type: 'comment',
    icon: <MessageSquare size={18} />,
    label: 'Comment',
    description: 'A sticky-note style comment card with a yellow tint.',
  },
  {
    type: 'table',
    icon: <Table size={18} />,
    label: 'Table',
    description: 'Editable grid with rows and columns. Click a cell to edit. Add or remove rows.',
  },
  {
    type: 'draw',
    icon: <PenTool size={18} />,
    label: 'Draw',
    description: 'Freehand drawing. Coming in a future update.',
    tip: 'Not available yet',
  },
]

const MEDIA_TOOLS: ToolDef[] = [
  {
    type: 'image',
    icon: <ImageIcon size={18} />,
    label: 'Image',
    description: 'Upload an image from your computer. Stored locally — no cloud upload.',
    tip: 'You can also drag an image file directly onto the canvas',
  },
  {
    type: 'file',
    icon: <Upload size={18} />,
    label: 'Upload',
    description: 'Upload any file. Stored in the browser. Click to download.',
  },
]

export function Toolbar() {
  const armedTool = useStore(s => s.armedTool)
  const setArmedTool = useStore(s => s.setArmedTool)
  const dragOverTrash = useStore(s => s.dragOverTrash)
  const [showHotkeys, setShowHotkeys] = useState(false)

  React.useEffect(() => {
    const handler = () => setShowHotkeys(true)
    window.addEventListener('canvas:open-hotkeys', handler)
    return () => window.removeEventListener('canvas:open-hotkeys', handler)
  }, [])

  const arm = (type: string) => {
    if (type === 'draw') return
    if (armedTool === type) setArmedTool(null)
    else setArmedTool(type as ArmedTool)
  }

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('tool-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <>
      <div
        className="absolute left-0 bottom-0 bg-panel-bg border-r border-card-border flex flex-col items-center py-2 gap-0.5 z-20"
        style={{ top: TOPBAR_HEIGHT, width: TOOLBAR_WIDTH }}
      >
        {TOOLS.map(tool => {
          const isArmed = armedTool === tool.type
          return (
            <Tooltip
              key={tool.type}
              side="right"
              content={
                <ToolTooltipContent
                  name={tool.label}
                  description={tool.description}
                  shortcut={tool.shortcut}
                  tip={tool.tip}
                />
              }
            >
              <ToolButton
                icon={tool.icon}
                label={tool.label}
                armed={isArmed}
                onClick={() => arm(tool.type)}
                onDragStart={tool.dragDisabled ? undefined : e => onDragStart(e, tool.type)}
              />
            </Tooltip>
          )
        })}

        <div className="border-t border-card-border w-10 my-1" />

        {MEDIA_TOOLS.map(tool => (
          <Tooltip
            key={tool.type}
            side="right"
            content={
              <ToolTooltipContent
                name={tool.label}
                description={tool.description}
                tip={tool.tip}
              />
            }
          >
            <ToolButton
              icon={tool.icon}
              label={tool.label}
              armed={armedTool === tool.type}
              onClick={() => arm(tool.type)}
              onDragStart={e => onDragStart(e, tool.type)}
            />
          </Tooltip>
        ))}

        <div className="flex-1" />

        {/* Hotkeys button */}
        <Tooltip
          side="right"
          content={
            <ToolTooltipContent
              name="Keyboard shortcuts"
              description="View and customize all keyboard shortcuts"
              shortcut="?"
            />
          }
        >
          <ToolButton
            icon={<Keyboard size={18} />}
            label="Hotkeys"
            armed={false}
            onClick={() => setShowHotkeys(true)}
            className="text-text-muted hover:text-text-primary"
          />
        </Tooltip>

        {/* Trash */}
        <Tooltip
          side="right"
          content={
            <ToolTooltipContent
              name="Trash"
              description="Drag any item here to delete it, or click to clear."
              tip="Drag items onto this button to delete them"
            />
          }
        >
          <div data-trash-zone className="w-full flex justify-center">
            <ToolButton
              icon={<Trash2 size={18} />}
              label="Trash"
              armed={false}
              onClick={() => {}}
              className={dragOverTrash
                ? 'bg-red-100 !text-red-600 scale-110'
                : 'text-red-400 hover:text-red-600'
              }
            />
          </div>
        </Tooltip>
      </div>

      {showHotkeys && <HotkeyPanel onClose={() => setShowHotkeys(false)} />}
    </>
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
      className={`flex flex-col items-center gap-0.5 w-12 py-1.5 rounded-lg transition-all ${
        armed
          ? 'bg-accent text-white hover:bg-accent hover:text-white'
          : `text-text-muted hover:text-text-primary hover:bg-gray-100 ${className ?? ''}`
      }`}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  )
}
