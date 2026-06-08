import React, { useMemo, useRef } from 'react'
import { useStore } from '../state/store'
import { ItemRenderer } from '../items/ItemRenderer'
import { SvgConnectorLayer } from './SvgConnectorLayer'
import { getLOD } from './lod'
import { CULL_MARGIN, TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import { rectsOverlap } from '../lib/coords'

interface Props {
  panX: number
  panY: number
  zoom: number
  guides: Array<{ axis: 'h' | 'v'; value: number }>
  linePreview: { x1: number; y1: number; x2: number; y2: number } | null
  onPlaceItem: (type: string, wx: number, wy: number) => void
  viewportRef: React.RefObject<HTMLDivElement>
}

export function World({ panX, panY, zoom, guides, linePreview, onPlaceItem, viewportRef }: Props) {
  const currentBoardId = useStore(s => s.currentBoardId)
  const items = useStore(s => s.items)
  const showGrid = useStore(s => s.showGrid)
  const lod = getLOD(zoom)

  const boardItems = useMemo(
    () => Object.values(items)
      .filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])
      .sort((a, b) => a.z - b.z),
    [items, currentBoardId],
  )

  // Viewport culling: compute visible world rect
  const vpW = (viewportRef.current?.clientWidth ?? window.innerWidth - TOOLBAR_WIDTH)
  const vpH = (viewportRef.current?.clientHeight ?? window.innerHeight - TOPBAR_HEIGHT)
  const margin = CULL_MARGIN / zoom
  const viewRect = {
    x: (-panX / zoom) - margin,
    y: (-panY / zoom) - margin,
    w: (vpW / zoom) + margin * 2,
    h: (vpH / zoom) + margin * 2,
  }

  const visibleItems = useMemo(
    () => boardItems.filter(item =>
      rectsOverlap({ x: item.x, y: item.y, w: item.w, h: item.h }, viewRect),
    ),
    [boardItems, panX, panY, zoom],
  )

  return (
    <div
      className="absolute top-0 left-0 origin-top-left"
      style={{
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        willChange: 'transform',
        width: 1,
        height: 1,
      }}
    >
      {/* Dot grid background */}
      <DotGrid zoom={zoom} panX={panX} panY={panY} show={!showGrid} />
      {/* Strong grid overlay */}
      {showGrid && <GridOverlay zoom={zoom} panX={panX} panY={panY} />}

      <SvgConnectorLayer items={visibleItems} linePreview={linePreview} zoom={zoom} />

      {visibleItems.map(item => (
        <ItemRenderer
          key={item.id}
          item={item}
          lod={lod}
          zoom={zoom}
        />
      ))}

      {/* Alignment guides */}
      {guides.map((g, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            background: '#2D7FF9',
            opacity: 0.7,
            ...(g.axis === 'v'
              ? { left: g.value, top: -50000, width: 1 / zoom, height: 100000 }
              : { top: g.value, left: -50000, height: 1 / zoom, width: 100000 }),
          }}
        />
      ))}
    </div>
  )
}

function DotGrid({ zoom, panX, panY, show }: { zoom: number; panX: number; panY: number; show: boolean }) {
  if (!show) return null
  const spacing = 24 // world px
  const screenSpacing = spacing * zoom
  const dotSize = Math.max(1, zoom * 1.5)
  const offsetX = ((panX % (screenSpacing)) + screenSpacing) % screenSpacing
  const offsetY = ((panY % (screenSpacing)) + screenSpacing) % screenSpacing

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: TOOLBAR_WIDTH,
        top: TOPBAR_HEIGHT,
        right: 0,
        bottom: 0,
        backgroundImage: `radial-gradient(circle, #D6D6D6 ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${screenSpacing}px ${screenSpacing}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        zIndex: -1,
      }}
    />
  )
}

function GridOverlay({ zoom, panX, panY }: { zoom: number; panX: number; panY: number }) {
  const step = 64 // world px
  const screenStep = step * zoom
  const offsetX = ((panX % screenStep) + screenStep) % screenStep
  const offsetY = ((panY % screenStep) + screenStep) % screenStep
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: TOOLBAR_WIDTH,
        top: TOPBAR_HEIGHT,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)
        `,
        backgroundSize: `${screenStep}px ${screenStep}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        zIndex: -1,
      }}
    />
  )
}
