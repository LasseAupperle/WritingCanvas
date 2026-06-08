export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export function screenToWorld(
  sx: number, sy: number,
  panX: number, panY: number,
  zoom: number,
): Point {
  return { x: (sx - panX) / zoom, y: (sy - panY) / zoom }
}

export function worldToScreen(
  wx: number, wy: number,
  panX: number, panY: number,
  zoom: number,
): Point {
  return { x: wx * zoom + panX, y: wy * zoom + panY }
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}
