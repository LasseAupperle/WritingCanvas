import { type Item } from '../db/db'
import { type ViewportState } from '../state/store'
import { rectsOverlap } from '../lib/coords'

export interface RubberBand {
  startX: number
  startY: number
  endX: number
  endY: number
}

export function getItemsInRubberBand(
  items: Item[],
  band: RubberBand,
  vp: ViewportState,
): string[] {
  const { panX, panY, zoom } = vp
  // Convert rubber band from screen to world
  const x1 = (Math.min(band.startX, band.endX) - panX) / zoom
  const y1 = (Math.min(band.startY, band.endY) - panY) / zoom
  const x2 = (Math.max(band.startX, band.endX) - panX) / zoom
  const y2 = (Math.max(band.startY, band.endY) - panY) / zoom

  return items
    .filter(item => rectsOverlap(
      { x: item.x, y: item.y, w: item.w, h: item.h },
      { x: x1, y: y1, w: x2 - x1, h: y2 - y1 },
    ))
    .map(i => i.id)
}

export function computeAlignmentGuides(
  movingItems: Item[],
  allItems: Item[],
  snapThresholdWorld: number,
): { lines: Array<{ axis: 'h' | 'v'; value: number }>; snapX?: number; snapY?: number } {
  const staticItems = allItems.filter(
    i => !movingItems.find(m => m.id === i.id),
  )
  if (!staticItems.length || !movingItems.length) return { lines: [] }

  const moving = {
    x: Math.min(...movingItems.map(i => i.x)),
    y: Math.min(...movingItems.map(i => i.y)),
    x2: Math.max(...movingItems.map(i => i.x + i.w)),
    y2: Math.max(...movingItems.map(i => i.y + i.h)),
    cx: 0, cy: 0,
  }
  moving.cx = (moving.x + moving.x2) / 2
  moving.cy = (moving.y + moving.y2) / 2

  const lines: Array<{ axis: 'h' | 'v'; value: number }> = []
  let snapX: number | undefined
  let snapY: number | undefined

  const checkX = (movVal: number, snapTarget: number, delta: number) => {
    if (Math.abs(delta) < snapThresholdWorld) {
      if (snapX === undefined || Math.abs(delta) < Math.abs(movVal - (snapX ?? 0))) {
        snapX = snapTarget - (movVal - movingItems[0].x)
      }
      lines.push({ axis: 'v', value: snapTarget })
    }
  }
  const checkY = (movVal: number, snapTarget: number, delta: number) => {
    if (Math.abs(delta) < snapThresholdWorld) {
      if (snapY === undefined || Math.abs(delta) < Math.abs(movVal - (snapY ?? 0))) {
        snapY = snapTarget - (movVal - movingItems[0].y)
      }
      lines.push({ axis: 'h', value: snapTarget })
    }
  }

  for (const s of staticItems) {
    const sx2 = s.x + s.w
    const sy2 = s.y + s.h
    const scx = s.x + s.w / 2
    const scy = s.y + s.h / 2

    checkX(moving.x, s.x, moving.x - s.x)
    checkX(moving.x, sx2, moving.x - sx2)
    checkX(moving.x2, s.x, moving.x2 - s.x)
    checkX(moving.x2, sx2, moving.x2 - sx2)
    checkX(moving.cx, scx, moving.cx - scx)

    checkY(moving.y, s.y, moving.y - s.y)
    checkY(moving.y, sy2, moving.y - sy2)
    checkY(moving.y2, s.y, moving.y2 - s.y)
    checkY(moving.y2, sy2, moving.y2 - sy2)
    checkY(moving.cy, scy, moving.cy - scy)
  }

  return { lines, snapX, snapY }
}
