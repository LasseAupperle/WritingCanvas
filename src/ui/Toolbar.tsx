import React, { useState } from 'react'
import {
  FileText, Link, CheckSquare, Minus, Layout, Columns,
  MessageSquare, Table, ImageIcon, Upload, Trash2, PenTool, Keyboard,
} from 'lucide-react'
import { useStore, type ArmedTool } from '../state/store'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import { Tooltip, ToolTooltipContent } from './Tooltip'
import { HotkeyPanel } from './HotkeyPanel'
import { saveBlob } from '../db/persistence'
import { newId } from '../lib/ids'
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

  const placeAtCenter = (type: ItemType, extra?: Record<string, unknown>) => {
    const { currentBoardId, boards, createItem } = useStore.getState()
    const vp = boards[currentBoardId]?.viewport ?? { panX: 0, panY: 0, zoom: 1 }
    const vpW = window.innerWidth - TOOLBAR_WIDTH
    const vpH = window.innerHeight - TOPBAR_HEIGHT
    const defaults: Record<string, { w: number; h: number }> = {
      image: { w: 240, h: 180 },
      file: { w: 220, h: 60 },
    }
    const { w, h } = defaults[type] ?? { w: 240, h: 120 }
    const wx = Math.round((-vp.panX + vpW / 2) / vp.zoom - w / 2)
    const wy = Math.round((-vp.panY + vpH / 2) / vp.zoom - h / 2)
    createItem({ boardId: currentBoardId, type, x: wx, y: wy, w, h, content: extra ?? {} })
  }

  const arm = (type: string) => {
    if (type === 'draw') return

    if (type === 'image') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const key = newId()
        await saveBlob(key, file)
        const dataUrl = await new Promise<string>(resolve => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(file)
        })
        placeAtCenter('image', { blobKey: key, dataUrl, caption: '' })
      }
      input.click()
      return
    }

    if (type === 'file') {
      const input = document.createElement('input')
      input.type = 'file'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const key = newId()
        await saveBlob(key, file)
        placeAtCenter('file', { blobKey: key, filename: file.name, size: file.size })
      }
      input.click()
      return
    }

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
          const isDisabled = tool.type === 'draw'
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
                  tip={isDisabled ? 'Coming in a future update' : tool.tip}
                />
              }
            >
              <ToolButton
                icon={tool.icon}
                label={tool.label}
                armed={isArmed}
                disabled={isDisabled}
                onClick={() => arm(tool.type)}
                onDragStart={tool.dragDisabled || isDisabled ? undefined : e => onDragStart(e, tool.type)}
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
  icon, label, armed, disabled, onClick, onDragStart, className,
}: {
  icon: React.ReactNode
  label: string
  armed: boolean
  disabled?: boolean
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
  className?: string
}) {
  return (
    <button
      className={`flex flex-col items-center gap-0.5 w-12 py-1.5 rounded-lg transition-all ${
        disabled
          ? 'opacity-35 cursor-not-allowed text-text-muted'
          : armed
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
