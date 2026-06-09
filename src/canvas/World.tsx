import React, { useMemo } from 'react'
import { useStore } from '../state/store'
import { ItemRenderer } from '../items/ItemRenderer'
import { getLOD } from './lod'
import { CULL_MARGIN, TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import { rectsOverlap } from '../lib/coords'

interface Props {
  panX: number
  panY: number
  zoom: number
  guides: Array<{ axis: 'h' | 'v'; value: number }>
  viewportRef: React.RefObject<HTMLDivElement>
}

export function World({ panX, panY, zoom, guides, viewportRef }: Props) {
  const currentBoardId = useStore(s => s.currentBoardId)
  const items = useStore(s => s.items)
  const lod = getLOD(zoom)

  const boardItems = useMemo(
    () => Object.values(items)
      .filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])
      .sort((a, b) => a.z - b.z),
    [items, currentBoardId],
  )

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
