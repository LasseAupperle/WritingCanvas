import React, { useRef, useCallback } from 'react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { pushHistory } from '../state/history'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
  minW?: number
  minH?: number
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onDoubleClick?: (e: React.MouseEvent) => void
}

const HANDLE_CURSORS: Record<string, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  w: 'w-resize', e: 'e-resize',
  sw: 'sw-resize', s: 's-resize', se: 'se-resize',
}

export function CardShell({
  item, isSelected, onPointerDown, onPointerMove, onPointerUp,
  zoom, minW = 80, minH = 40, children, style, className, onDoubleClick,
}: Props) {
  const updateItem = useStore(s => s.updateItem)
  const resizeState = useRef<{
    handle: string
    startMX: number; startMY: number
    origX: number; origY: number
    origW: number; origH: number
    before: Item
  } | null>(null)

  const onResizeDown = useCallback((e: React.PointerEvent, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    resizeState.current = {
      handle,
      startMX: e.clientX, startMY: e.clientY,
      origX: item.x, origY: item.y,
      origW: item.w, origH: item.h,
      before: { ...item },
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [item])

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeState.current) return
    const { handle, startMX, startMY, origX, origY, origW, origH } = resizeState.current
    const dx = (e.clientX - startMX) / zoom
    const dy = (e.clientY - startMY) / zoom
    let x = origX, y = origY, w = origW, h = origH

    if (handle.includes('e')) w = Math.max(minW, origW + dx)
    if (handle.includes('s')) h = Math.max(minH, origH + dy)
    if (handle.includes('w')) { w = Math.max(minW, origW - dx); x = origX + origW - w }
    if (handle.includes('n')) { h = Math.max(minH, origH - dy); y = origY + origH - h }

    updateItem(item.id, { x, y, w, h }, false)
  }, [item.id, zoom, minW, minH])

  const onResizeUp = useCallback((e: React.PointerEvent) => {
    if (resizeState.current) {
      const after = { ...item }
      pushHistory({ type: 'update', before: resizeState.current.before, after }, item.boardId)
    }
    resizeState.current = null
  }, [item])

  // Hit area is always at least 20px in screen space; visual dot is smaller
  const hitSize = Math.max(20, 20 / zoom)
  const visualSize = Math.max(6, 8 / zoom)

  return (
    <div
      data-item-id={item.id}
      className={`absolute rounded-card shadow-card border border-card-border ${className ?? ''}`}
      style={{
        left: item.x, top: item.y,
        width: item.w, height: item.h,
        zIndex: item.z,
        outline: isSelected ? '2px solid #2D7FF9' : undefined,
        outlineOffset: 1,
        cursor: 'default',
        boxSizing: 'border-box',
        background: (item.content?.cardColor as string | undefined) || 'var(--card-bg, #FFFFFF)',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {children}

      {/* Resize handles: large invisible hit area containing small visible dot */}
      {isSelected && Object.entries(HANDLE_CURSORS).map(([handle, cursor]) => (
        <div
          key={handle}
          className="absolute z-50 flex items-center justify-center"
          style={{
            width: hitSize, height: hitSize,
            cursor,
            ...getHandlePosition(handle, hitSize),
          }}
          onPointerDown={(e) => onResizeDown(e, handle)}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        >
          <div
            className="bg-white border border-accent rounded-sm pointer-events-none"
            style={{ width: visualSize, height: visualSize }}
          />
        </div>
      ))}
    </div>
  )
}

function getHandlePosition(handle: string, size: number): React.CSSProperties {
  const half = -size / 2
  const pos: React.CSSProperties = {}
  if (handle.includes('n')) pos.top = half
  if (handle.includes('s')) pos.bottom = half
  if (!handle.includes('n') && !handle.includes('s')) pos.top = `calc(50% - ${size / 2}px)`
  if (handle.includes('w')) pos.left = half
  if (handle.includes('e')) pos.right = half
  if (!handle.includes('w') && !handle.includes('e')) pos.left = `calc(50% - ${size / 2}px)`
  return pos
}
