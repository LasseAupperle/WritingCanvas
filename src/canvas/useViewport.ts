import { useCallback, useRef } from 'react'
import { useStore } from '../state/store'
import { MIN_ZOOM, MAX_ZOOM } from '../lib/constants'
import { screenToWorld } from '../lib/coords'

export function useViewport() {
  const currentBoardId = useStore(s => s.currentBoardId)
  const board = useStore(s => s.boards[s.currentBoardId])
  const setViewport = useStore(s => s.setViewport)

  const vp = board?.viewport ?? { panX: 0, panY: 0, zoom: 1 }

  const setPan = useCallback((panX: number, panY: number) => {
    setViewport(currentBoardId, { ...vp, panX, panY })
  }, [currentBoardId, vp, setViewport])

  const setZoom = useCallback((zoom: number, cx: number, cy: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
    // Keep world point under cursor fixed
    const wx = (cx - vp.panX) / vp.zoom
    const wy = (cy - vp.panY) / vp.zoom
    const panX = cx - wx * clamped
    const panY = cy - wy * clamped
    setViewport(currentBoardId, { panX, panY, zoom: clamped })
  }, [currentBoardId, vp, setViewport])

  const screenToWorldCoord = useCallback((sx: number, sy: number) => {
    return screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
  }, [vp])

  return { vp, setPan, setZoom, screenToWorldCoord }
}
