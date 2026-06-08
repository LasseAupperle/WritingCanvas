import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useViewport } from '../canvas/useViewport'
import { MIN_ZOOM, MAX_ZOOM, TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import { useStore } from '../state/store'

export function ZoomControl() {
  const { vp, setZoom } = useViewport()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentBoardId = useStore(s => s.currentBoardId)
  const items = useStore(s => s.items)
  const setViewport = useStore(s => s.setViewport)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const vpW = window.innerWidth - TOOLBAR_WIDTH
  const vpH = window.innerHeight - TOPBAR_HEIGHT

  const zoomToFit = () => {
    const boardItems = Object.values(items).filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])
    if (!boardItems.length) {
      setViewport(currentBoardId, { panX: 0, panY: 0, zoom: 1 })
      return
    }
    const minX = Math.min(...boardItems.map(i => i.x))
    const minY = Math.min(...boardItems.map(i => i.y))
    const maxX = Math.max(...boardItems.map(i => i.x + i.w))
    const maxY = Math.max(...boardItems.map(i => i.y + i.h))
    const contentW = maxX - minX + 80
    const contentH = maxY - minY + 80
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(vpW / contentW, vpH / contentH)))
    const panX = (vpW - contentW * zoom) / 2 - minX * zoom + 40 * zoom
    const panY = (vpH - contentH * zoom) / 2 - minY * zoom + 40 * zoom
    setViewport(currentBoardId, { panX, panY, zoom })
    setOpen(false)
  }

  const presets = [50, 100, 200]

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 text-sm text-text-primary hover:bg-gray-100 rounded px-2 py-1"
        onClick={() => setOpen(o => !o)}
      >
        {Math.round(vp.zoom * 100)}%
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-card-border rounded shadow-lg z-50 w-44 py-1">
          <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setZoom(vp.zoom * 1.2, window.innerWidth / 2, window.innerHeight / 2); setOpen(false) }}>
            <ZoomIn size={14} /> Zoom in
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { setZoom(vp.zoom / 1.2, window.innerWidth / 2, window.innerHeight / 2); setOpen(false) }}>
            <ZoomOut size={14} /> Zoom out
          </button>
          <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={zoomToFit}>
            <Maximize2 size={14} /> Zoom to fit
          </button>
          <div className="border-t border-card-border my-1" />
          {presets.map(p => (
            <button key={p} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => { setZoom(p / 100, window.innerWidth / 2, window.innerHeight / 2); setOpen(false) }}>
              {p}%
            </button>
          ))}
          <div className="border-t border-card-border my-1 px-3">
            <input
              type="range"
              min={Math.log(MIN_ZOOM)}
              max={Math.log(MAX_ZOOM)}
              step={0.01}
              value={Math.log(vp.zoom)}
              className="w-full"
              onChange={e => setZoom(Math.exp(Number(e.target.value)), window.innerWidth / 2, window.innerHeight / 2)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
