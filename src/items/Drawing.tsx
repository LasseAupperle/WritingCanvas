import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Eraser, Check, Trash2 } from 'lucide-react'
import type { Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'

const COLORS = [
  '#1a1a1a', '#6b7280', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ffffff',
]

const SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 5 },
  { label: 'Thick', value: 12 },
  { label: 'Brush', value: 24 },
]

interface SharedProps {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function DrawingCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: SharedProps) {
  const content = item.content as { dataUrl?: string } | undefined
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditing, setIsEditing] = useState(!content?.dataUrl)
  const [color, setColor] = useState('#1a1a1a')
  const [size, setSize] = useState(5)
  const [isEraser, setIsEraser] = useState(false)
  const lastRaw = useRef<{ x: number; y: number } | null>(null)
  const lastMid = useRef<{ x: number; y: number } | null>(null)
  const drawing = useRef(false)
  const isEditingRef = useRef(isEditing)
  isEditingRef.current = isEditing
  const wasEverSelected = useRef(false)

  // Initialize/reload canvas when size or saved content changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (content?.dataUrl) {
      const img = new Image()
      img.onload = () => {
        const c = canvasRef.current
        if (c) c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      }
      img.src = content.dataUrl
    }
  }, [item.w, item.h, content?.dataUrl])

  const doSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const existingContent = useStore.getState().items[item.id]?.content ?? {}
    useStore.getState().updateItem(item.id, { content: { ...existingContent, dataUrl } })
    setIsEditing(false)
  }, [item.id])

  // Auto-save only when transitioning from selected → deselected (not on mount)
  useEffect(() => {
    if (isSelected) {
      wasEverSelected.current = true
    } else if (wasEverSelected.current && isEditingRef.current) {
      doSave()
      wasEverSelected.current = false
    }
  }, [isSelected, doSave])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isEditingRef.current) return
    e.stopPropagation()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pt = getPoint(e)
    drawing.current = true
    lastRaw.current = pt
    lastMid.current = pt
    const effectiveSize = isEraser ? size * 3 : size
    ctx.fillStyle = isEraser ? '#ffffff' : color
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, effectiveSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const doDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !isEditingRef.current || !lastRaw.current || !lastMid.current) return
    e.stopPropagation()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pt = getPoint(e)
    const mid = { x: (lastRaw.current.x + pt.x) / 2, y: (lastRaw.current.y + pt.y) / 2 }
    const effectiveSize = isEraser ? size * 3 : size
    ctx.strokeStyle = isEraser ? '#ffffff' : color
    ctx.lineWidth = effectiveSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastMid.current.x, lastMid.current.y)
    ctx.quadraticCurveTo(lastRaw.current.x, lastRaw.current.y, mid.x, mid.y)
    ctx.stroke()
    lastMid.current = mid
    lastRaw.current = pt
  }

  const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation()
    drawing.current = false
    lastRaw.current = null
    lastMid.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const stopProp = (e: React.PointerEvent) => e.stopPropagation()

  return (
    <CardShell
      item={item}
      isSelected={isSelected}
      onPointerDown={isEditing ? stopProp : onPointerDown}
      onPointerMove={isEditing ? stopProp : onPointerMove}
      onPointerUp={isEditing ? stopProp : onPointerUp}
      zoom={zoom}
      minW={80}
      minH={60}
      className="overflow-hidden p-0 relative"
      onDoubleClick={isEditing ? undefined : () => setIsEditing(true)}
    >
      {isEditing && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center gap-1 px-1.5 bg-white/95 border-b border-card-border"
          style={{ height: 28 }}
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          {COLORS.map(c => (
            <button
              key={c}
              title={c}
              className="flex-shrink-0 rounded-full"
              style={{
                width: 14, height: 14,
                background: c,
                outline: c === '#ffffff' ? '1px solid #ccc' : 'none',
                boxShadow: !isEraser && color === c
                  ? '0 0 0 2px #fff, 0 0 0 3.5px #2D7FF9'
                  : 'none',
                transform: !isEraser && color === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.1s',
              }}
              onClick={() => { setColor(c); setIsEraser(false) }}
            />
          ))}
          <div className="w-px h-3 bg-gray-200 mx-0.5 flex-shrink-0" />
          <select
            className="text-[10px] border border-gray-200 rounded bg-white px-0.5 flex-shrink-0"
            style={{ height: 18 }}
            value={size}
            onChange={e => setSize(Number(e.target.value))}
          >
            {SIZES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            title="Eraser"
            className={`flex-shrink-0 flex items-center px-1 rounded text-[10px] ${isEraser ? 'bg-accent text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
            style={{ height: 18 }}
            onClick={() => setIsEraser(v => !v)}
          >
            <Eraser size={10} />
          </button>
          <button
            title="Clear canvas"
            className="flex-shrink-0 flex items-center px-1 rounded text-[10px] bg-gray-100 text-text-muted hover:bg-red-100 hover:text-red-500"
            style={{ height: 18 }}
            onClick={clearCanvas}
          >
            <Trash2 size={10} />
          </button>
          <div className="flex-1" />
          <button
            title="Done — save drawing"
            className="flex-shrink-0 flex items-center gap-0.5 px-1.5 rounded text-[10px] bg-accent text-white hover:bg-accent/90"
            style={{ height: 18 }}
            onClick={doSave}
          >
            <Check size={10} /> Done
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={item.w}
        height={item.h}
        className="block"
        style={{
          width: '100%',
          height: '100%',
          cursor: isEditing ? (isEraser ? 'cell' : 'crosshair') : 'default',
        }}
        onPointerDown={startDraw}
        onPointerMove={doDraw}
        onPointerUp={stopDraw}
        onPointerLeave={stopDraw}
      />
    </CardShell>
  )
}
