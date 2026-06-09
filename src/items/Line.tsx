import React, { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Item } from '../db/db'
import { useStore } from '../state/store'
import { pushHistory } from '../state/history'

const PAD = 20 // world-px padding around line bounding box

export type ArrowStyle = 'none' | 'end' | 'start' | 'both'

interface LineContent {
  x1: number; y1: number; x2: number; y2: number
  arrowStyle?: ArrowStyle
}

interface Props {
  item: Item
  isSelected: boolean
  zoom: number
}

export function LineCard({ item, isSelected, zoom }: Props) {
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const addToSelection = useStore(s => s.addToSelection)
  const updateItem = useStore(s => s.updateItem)
  const removeItems = useStore(s => s.removeItems)

  const c = item.content as unknown as LineContent
  const { x1, y1, x2, y2, arrowStyle = 'end' } = c

  type LineDragOrigin = {
    id: string; x: number; y: number
    lineX1?: number; lineY1?: number; lineX2?: number; lineY2?: number
    lineContent?: Record<string, unknown>
  }
  const dragRef = useRef<{
    mx: number; my: number; x1: number; y1: number; x2: number; y2: number
    origPositions: LineDragOrigin[]
  } | null>(null)
  const dragged = useRef(false)
  const endRef = useRef<{ endpoint: 'start' | 'end'; mx: number; my: number; ox: number; oy: number } | null>(null)

  // Bounding box with padding
  const bx = Math.min(x1, x2) - PAD
  const by = Math.min(y1, y2) - PAD
  const bw = Math.abs(x2 - x1) + PAD * 2
  const bh = Math.abs(y2 - y1) + PAD * 2

  // Local SVG coordinates
  const lx1 = x1 - bx
  const ly1 = y1 - by
  const lx2 = x2 - bx
  const ly2 = y2 - by

  const strokeW = Math.max(0.5, 1.5 / zoom)
  const hitW = Math.max(8, 20 / zoom)
  const handleR = Math.max(4, 8 / zoom)
  const mid = { x: (lx1 + lx2) / 2, y: (ly1 + ly2) / 2 }

  const stroke = isSelected ? '#2D7FF9' : '#374151'
  const mid_id = `m-${item.id}`

  const updateLine = (patch: Partial<LineContent>) => {
    const nc: LineContent = { ...c, ...patch }
    updateItem(item.id, {
      content: nc as unknown as Record<string, unknown>,
      x: Math.min(nc.x1, nc.x2),
      y: Math.min(nc.y1, nc.y2),
      w: Math.max(8, Math.abs(nc.x2 - nc.x1)),
      h: Math.max(8, Math.abs(nc.y2 - nc.y1)),
    })
  }

  // --- Whole-line drag ---
  const onHitDown = (e: React.PointerEvent<SVGElement>) => {
    if (e.button !== 0) return
    const armed = useStore.getState().armedTool
    if (armed) return // let viewport handle placement
    e.stopPropagation()
    if (e.shiftKey) addToSelection(item.id)
    else if (!isSelected) setSelectedIds(new Set([item.id]))

    const state = useStore.getState()
    const sel = state.selectedIds
    const allSelected = Array.from(sel.has(item.id) ? sel : new Set([item.id]))
    const origPositions: LineDragOrigin[] = allSelected
      .map(id => state.items[id])
      .filter(Boolean)
      .map(it => {
        if (it.type === 'line') {
          const lc = it.content as Record<string, unknown>
          return { id: it.id, x: it.x, y: it.y, lineX1: lc.x1 as number, lineY1: lc.y1 as number, lineX2: lc.x2 as number, lineY2: lc.y2 as number, lineContent: { ...lc } }
        }
        return { id: it.id, x: it.x, y: it.y }
      })

    dragRef.current = { mx: e.clientX, my: e.clientY, x1, y1, x2, y2, origPositions }
    dragged.current = false
    ;(e.target as SVGElement).setPointerCapture(e.pointerId)
  }

  const onHitMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.mx) / zoom
    const dy = (e.clientY - dragRef.current.my) / zoom
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragged.current = true
    if (!dragged.current) return

    for (const orig of dragRef.current.origPositions) {
      if (orig.lineX1 !== undefined) {
        const nx1 = orig.lineX1 + dx
        const ny1 = orig.lineY1! + dy
        const nx2 = orig.lineX2! + dx
        const ny2 = orig.lineY2! + dy
        if (orig.id === item.id) {
          updateLine({ x1: nx1, y1: ny1, x2: nx2, y2: ny2 })
        } else {
          const it = useStore.getState().items[orig.id]
          if (it) {
            const nc = { ...(it.content as unknown as LineContent), x1: nx1, y1: ny1, x2: nx2, y2: ny2 }
            updateItem(orig.id, {
              content: nc as unknown as Record<string, unknown>,
              x: Math.min(nx1, nx2),
              y: Math.min(ny1, ny2),
              w: Math.max(8, Math.abs(nx2 - nx1)),
              h: Math.max(8, Math.abs(ny2 - ny1)),
            })
          }
        }
      } else {
        updateItem(orig.id, { x: orig.x + dx, y: orig.y + dy }, false)
      }
    }
  }

  const onHitUp = (_e: React.PointerEvent<SVGElement>) => {
    if (dragRef.current && dragged.current) {
      const state = useStore.getState()
      const befores = dragRef.current.origPositions
        .map(orig => {
          const it = state.items[orig.id]
          if (!it) return null
          if (orig.lineContent !== undefined) {
            return { ...it, x: orig.x, y: orig.y, content: orig.lineContent }
          }
          return { ...it, x: orig.x, y: orig.y }
        })
        .filter(Boolean) as Item[]
      const afters = dragRef.current.origPositions
        .map(orig => state.items[orig.id])
        .filter(Boolean) as Item[]
      if (befores.length > 0) pushHistory({ type: 'move-multi', befores, afters }, item.boardId)
    }
    dragRef.current = null
  }

  // --- Endpoint drag ---
  const onEndDown = (e: React.PointerEvent<SVGElement>, endpoint: 'start' | 'end') => {
    e.stopPropagation()
    const ox = endpoint === 'start' ? x1 : x2
    const oy = endpoint === 'start' ? y1 : y2
    endRef.current = { endpoint, mx: e.clientX, my: e.clientY, ox, oy }
    ;(e.target as SVGElement).setPointerCapture(e.pointerId)
  }

  const onEndMove = (e: React.PointerEvent<SVGElement>) => {
    if (!endRef.current) return
    const dx = (e.clientX - endRef.current.mx) / zoom
    const dy = (e.clientY - endRef.current.my) / zoom
    const nx = endRef.current.ox + dx
    const ny = endRef.current.oy + dy
    if (endRef.current.endpoint === 'start') updateLine({ x1: nx, y1: ny })
    else updateLine({ x2: nx, y2: ny })
  }

  const onEndUp = () => { endRef.current = null }

  const markerEnd = (arrowStyle === 'end' || arrowStyle === 'both')
    ? `url(#${mid_id}-end)`
    : undefined
  const markerStart = (arrowStyle === 'start' || arrowStyle === 'both')
    ? `url(#${mid_id}-start)`
    : undefined

  return (
    <div
      data-item-id={item.id}
      className="absolute"
      style={{ left: bx, top: by, width: bw, height: bh, zIndex: item.z, pointerEvents: 'none' }}
    >
      <svg
        width={bw} height={bh}
        style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          <marker id={`${mid_id}-end`} markerWidth="10" markerHeight="10"
            refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
          </marker>
          <marker id={`${mid_id}-start`} markerWidth="10" markerHeight="10"
            refX="0" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
          </marker>
        </defs>

        {/* Wide transparent hit area */}
        <line
          x1={lx1} y1={ly1} x2={lx2} y2={ly2}
          stroke="transparent"
          strokeWidth={hitW}
          style={{ cursor: dragged.current ? 'grabbing' : 'grab', pointerEvents: 'all' }}
          onPointerDown={onHitDown}
          onPointerMove={onHitMove}
          onPointerUp={onHitUp}
        />
        {/* Visible line */}
        <line
          x1={lx1} y1={ly1} x2={lx2} y2={ly2}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinecap="round"
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={{ pointerEvents: 'none' }}
        />

        {/* Endpoint drag handles */}
        {isSelected && (
          <>
            <circle
              cx={lx1} cy={ly1} r={handleR}
              fill="white" stroke="#2D7FF9"
              strokeWidth={Math.max(0.5, 1.5 / zoom)}
              style={{ cursor: 'crosshair', pointerEvents: 'all' }}
              onPointerDown={e => onEndDown(e, 'start')}
              onPointerMove={onEndMove}
              onPointerUp={onEndUp}
            />
            <circle
              cx={lx2} cy={ly2} r={handleR}
              fill="white" stroke="#2D7FF9"
              strokeWidth={Math.max(0.5, 1.5 / zoom)}
              style={{ cursor: 'crosshair', pointerEvents: 'all' }}
              onPointerDown={e => onEndDown(e, 'end')}
              onPointerMove={onEndMove}
              onPointerUp={onEndUp}
            />
          </>
        )}
      </svg>

      {/* Arrow style toolbar — constant screen size via inverse scale */}
      {isSelected && (
        <div
          className="absolute flex items-center gap-0.5 bg-white border border-card-border rounded shadow-md px-1 py-0.5"
          style={{
            left: mid.x,
            top: mid.y,
            transform: `translate(-50%, calc(-100% - ${14 / zoom}px)) scale(${1 / zoom})`,
            transformOrigin: 'bottom center',
            pointerEvents: 'auto',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <StyleBtn active={arrowStyle === 'none'} title="No arrows" onClick={() => updateLine({ arrowStyle: 'none' })}>
            ——
          </StyleBtn>
          <StyleBtn active={arrowStyle === 'end'} title="Arrow at end" onClick={() => updateLine({ arrowStyle: 'end' })}>
            ——›
          </StyleBtn>
          <StyleBtn active={arrowStyle === 'start'} title="Arrow at start" onClick={() => updateLine({ arrowStyle: 'start' })}>
            ‹——
          </StyleBtn>
          <StyleBtn active={arrowStyle === 'both'} title="Arrow at both ends" onClick={() => updateLine({ arrowStyle: 'both' })}>
            ‹——›
          </StyleBtn>
          <div className="w-px h-3 bg-gray-200 mx-0.5 flex-shrink-0" />
          <button
            className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
            title="Delete line"
            onClick={() => removeItems([item.id])}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function StyleBtn({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      className={`text-xs px-1.5 py-0.5 rounded font-mono ${active ? 'bg-accent text-white' : 'hover:bg-gray-100 text-text-muted'}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
