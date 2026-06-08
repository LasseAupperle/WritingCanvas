import React from 'react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'

interface Props {
  items: Item[]
  linePreview: { x1: number; y1: number; x2: number; y2: number } | null
  zoom: number
}

export function SvgConnectorLayer({ items, linePreview, zoom }: Props) {
  const lineItems = items.filter(i => i.type === 'line')
  const selectedIds = useStore(s => s.selectedIds)
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const updateItem = useStore(s => s.updateItem)

  if (!lineItems.length && !linePreview) return null

  const strokeW = Math.max(0.5, 1.5 / zoom)
  const hitW = Math.max(4, 12 / zoom)

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left: -50000, top: -50000, width: 100000, height: 100000, overflow: 'visible' }}
    >
      {linePreview && (
        <line
          x1={linePreview.x1 + 50000}
          y1={linePreview.y1 + 50000}
          x2={linePreview.x2 + 50000}
          y2={linePreview.y2 + 50000}
          stroke="#2D7FF9"
          strokeWidth={strokeW}
          strokeDasharray={`${4 / zoom},${4 / zoom}`}
          markerEnd="url(#arrow-preview)"
        />
      )}
      <defs>
        <marker id="arrow-preview" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#2D7FF9" />
        </marker>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#2B2F36" />
        </marker>
        <marker id="arrow-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#2D7FF9" />
        </marker>
      </defs>
      {lineItems.map(item => {
        const c = item.content as { x1: number; y1: number; x2: number; y2: number; arrowEnd: boolean }
        const isSelected = selectedIds.has(item.id)
        return (
          <g key={item.id} style={{ pointerEvents: 'all' }}>
            {/* Hit area */}
            <line
              x1={c.x1 + 50000} y1={c.y1 + 50000}
              x2={c.x2 + 50000} y2={c.y2 + 50000}
              stroke="transparent"
              strokeWidth={hitW}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIds(new Set([item.id]))
              }}
            />
            {/* Visible line */}
            <line
              x1={c.x1 + 50000} y1={c.y1 + 50000}
              x2={c.x2 + 50000} y2={c.y2 + 50000}
              stroke={isSelected ? '#2D7FF9' : '#2B2F36'}
              strokeWidth={strokeW}
              markerEnd={c.arrowEnd ? (isSelected ? 'url(#arrow-selected)' : 'url(#arrow)') : undefined}
            />
            {/* Endpoint handles when selected */}
            {isSelected && (
              <>
                <DragHandle
                  cx={c.x1 + 50000} cy={c.y1 + 50000}
                  zoom={zoom}
                  onDrag={(nx, ny) => updateItem(item.id, {
                    content: { ...c, x1: nx - 50000, y1: ny - 50000 },
                    x: Math.min(nx - 50000, c.x2),
                    y: Math.min(ny - 50000, c.y2),
                    w: Math.abs((nx - 50000) - c.x2) || 1,
                    h: Math.abs((ny - 50000) - c.y2) || 1,
                  })}
                />
                <DragHandle
                  cx={c.x2 + 50000} cy={c.y2 + 50000}
                  zoom={zoom}
                  onDrag={(nx, ny) => updateItem(item.id, {
                    content: { ...c, x2: nx - 50000, y2: ny - 50000 },
                    x: Math.min(c.x1, nx - 50000),
                    y: Math.min(c.y1, ny - 50000),
                    w: Math.abs(c.x1 - (nx - 50000)) || 1,
                    h: Math.abs(c.y1 - (ny - 50000)) || 1,
                  })}
                />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function DragHandle({ cx, cy, zoom, onDrag }: {
  cx: number; cy: number; zoom: number
  onDrag: (x: number, y: number) => void
}) {
  const r = Math.max(3, 6 / zoom)
  const dragStart = React.useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null)

  return (
    <circle
      cx={cx} cy={cy} r={r}
      fill="white" stroke="#2D7FF9" strokeWidth={Math.max(0.5, 1.5 / zoom)}
      style={{ cursor: 'crosshair', pointerEvents: 'all' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        dragStart.current = { mx: e.clientX, my: e.clientY, cx, cy }
        ;(e.target as SVGElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!dragStart.current) return
        const dx = (e.clientX - dragStart.current.mx) / zoom
        const dy = (e.clientY - dragStart.current.my) / zoom
        onDrag(dragStart.current.cx + dx, dragStart.current.cy + dy)
      }}
      onPointerUp={() => { dragStart.current = null }}
    />
  )
}
