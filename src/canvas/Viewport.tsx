import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useStore } from '../state/store'
import { useViewport } from './useViewport'
import { World } from './World'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT, SNAP_THRESHOLD } from '../lib/constants'
import { screenToWorld } from '../lib/coords'
import { getItemsInRubberBand, computeAlignmentGuides } from './selection'
import type { RubberBand } from './selection'
import { pushHistory } from '../state/history'

export function Viewport() {
  const { vp, setPan, setZoom, screenToWorldCoord } = useViewport()
  const currentBoardId = useStore(s => s.currentBoardId)
  const armedTool = useStore(s => s.armedTool)
  const lineDrawState = useStore(s => s.lineDrawState)
  const setArmedTool = useStore(s => s.setArmedTool)
  const setLineDrawState = useStore(s => s.setLineDrawState)
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const clearSelection = useStore(s => s.clearSelection)
  const createItem = useStore(s => s.createItem)
  const updateItem = useStore(s => s.updateItem)
  const selectedIds = useStore(s => s.selectedIds)
  const items = useStore(s => s.items)
  const snapToGrid = useStore(s => s.snapToGrid)
  const smartGuides = useStore(s => s.smartGuides)
  const showGrid = useStore(s => s.showGrid)
  const boardItems = Object.values(items).filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])

  const ref = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const spaceDown = useRef(false)
  const isDraggingItem = useRef(false)
  const dragStart = useRef<{ wx: number; wy: number; items: Array<{ id: string; x: number; y: number }> } | null>(null)

  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null)
  const [guides, setGuides] = useState<Array<{ axis: 'h' | 'v'; value: number }>>([])

  const snapToGridVal = (val: number) => {
    if (!snapToGrid) return val
    return Math.round(val / 32) * 32
  }

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom or Ctrl+scroll → zoom around cursor
      const rect = ref.current!.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom(vp.zoom * factor, cx, cy)
    } else {
      // Regular scroll → pan
      setPan(vp.panX - e.deltaX, vp.panY - e.deltaY)
    }
  }, [vp, setZoom, setPan])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceDown.current) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault()
          spaceDown.current = true
          setCursorStyle('grab')
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false
        setCursorStyle('default')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    const rect = ref.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const isMiddle = e.button === 1
    if (spaceDown.current || isMiddle) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, panX: vp.panX, panY: vp.panY }
      setCursorStyle('grabbing')
      ref.current?.setPointerCapture(e.pointerId)
      return
    }

    // Handle line tool two-click
    if (armedTool === 'line' || armedTool === 'line-start') {
      const wp = screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
      if (!lineDrawState) {
        setLineDrawState({ x1: wp.x, y1: wp.y })
        setArmedTool('line-start' as never)
        setLinePreview({ x: wp.x, y: wp.y })
      } else {
        const x1 = lineDrawState.x1
        const y1 = lineDrawState.y1
        createItem({
          boardId: currentBoardId,
          type: 'line',
          x: Math.min(x1, wp.x),
          y: Math.min(y1, wp.y),
          w: Math.abs(wp.x - x1) || 10,
          h: Math.abs(wp.y - y1) || 10,
          content: { x1, y1, x2: wp.x, y2: wp.y, arrowEnd: true },
        })
        setLineDrawState(null)
        setArmedTool(null)
        setLinePreview(null)
      }
      return
    }

    // Armed tool click-to-place (non-line)
    if (armedTool && (armedTool as string) !== 'line-start') {
      const wp = screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
      placeItem(armedTool as string, snapToGridVal(wp.x), snapToGridVal(wp.y))
      setArmedTool(null)
      return
    }

    // Rubber band on empty canvas
    const target = e.target as HTMLElement
    const isItem = target.closest('[data-item-id]')
    if (!isItem) {
      clearSelection()
      setRubberBand({ startX: sx, startY: sy, endX: sx, endY: sy })
      ref.current?.setPointerCapture(e.pointerId)
    }
  }, [vp, armedTool, lineDrawState, currentBoardId, snapToGrid])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setPan(panStart.current.panX + dx, panStart.current.panY + dy)
    }
    if (rubberBand) {
      const rect = ref.current!.getBoundingClientRect()
      setRubberBand(r => r ? { ...r, endX: e.clientX - rect.left, endY: e.clientY - rect.top } : null)
    }
    if (lineDrawState) {
      const rect = ref.current!.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const wp = screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
      setLinePreview({ x: wp.x, y: wp.y })
    }
  }, [isPanning, rubberBand, lineDrawState, vp, setPan])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      isPanning.current = false
      setCursorStyle(spaceDown.current ? 'grab' : 'default')
    }
    if (rubberBand) {
      const selected = getItemsInRubberBand(boardItems, rubberBand, vp)
      setSelectedIds(new Set(selected))
      setRubberBand(null)
    }
  }, [isPanning, rubberBand, boardItems, vp])

  const placeItem = (type: string, wx: number, wy: number) => {
    const defaults: Record<string, { w: number; h: number; content?: Record<string, unknown> }> = {
      note: { w: 240, h: 120, content: { html: '' } },
      board: { w: 240, h: 160 },
      todo: { w: 240, h: 140, content: { title: 'To-do', tasks: [] } },
      link: { w: 240, h: 80, content: { url: '', title: '' } },
      image: { w: 240, h: 180, content: { caption: '' } },
      file: { w: 220, h: 60, content: { filename: '', size: 0 } },
      table: { w: 300, h: 160, content: { columns: ['Column 1', 'Column 2'], rows: [['', '']] } },
      column: { w: 220, h: 300, content: { title: 'Column', childIds: [] } },
      comment: { w: 200, h: 100, content: { text: '' } },
      line: { w: 100, h: 1, content: { x1: wx, y1: wy, x2: wx + 100, y2: wy, arrowEnd: true } },
    }
    const d = defaults[type] ?? { w: 200, h: 100 }

    if (type === 'board') {
      const childBoard = useStore.getState().createBoard({
        title: 'New Board',
        color: '#2D7FF9',
        parentId: currentBoardId,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
      createItem({
        boardId: currentBoardId,
        type: 'board',
        x: wx, y: wy,
        w: d.w, h: d.h,
        childBoardId: childBoard.id,
        content: {},
      })
    } else {
      createItem({
        boardId: currentBoardId,
        type: type as never,
        x: wx, y: wy,
        w: d.w, h: d.h,
        content: d.content ?? {},
      })
    }
  }

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-item-id]')) return
    const rect = ref.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wp = screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
    const item = createItem({
      boardId: currentBoardId,
      type: 'note',
      x: snapToGridVal(wp.x) - 120,
      y: snapToGridVal(wp.y) - 60,
      w: 240,
      h: 120,
      content: { html: '' },
    })
    setSelectedIds(new Set([item.id]))
  }, [vp, currentBoardId, snapToGrid])

  // Compute rubber-band rect for rendering
  const rbRect = rubberBand ? {
    left: Math.min(rubberBand.startX, rubberBand.endX),
    top: Math.min(rubberBand.startY, rubberBand.endY),
    width: Math.abs(rubberBand.endX - rubberBand.startX),
    height: Math.abs(rubberBand.endY - rubberBand.startY),
  } : null

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('tool-type')
    if (!type) return
    const rect = ref.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wp = screenToWorld(sx, sy, vp.panX, vp.panY, vp.zoom)
    placeItem(type, snapToGridVal(wp.x), snapToGridVal(wp.y))
  }, [vp, currentBoardId, snapToGrid])

  return (
    <div
      ref={ref}
      className="absolute overflow-hidden select-none"
      style={{
        left: TOOLBAR_WIDTH,
        top: TOPBAR_HEIGHT,
        right: 0,
        bottom: 0,
        cursor: cursorStyle,
        background: 'var(--bg-canvas)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Grid backgrounds — rendered here, outside World's CSS transform */}
      {!showGrid && <CanvasDotGrid zoom={vp.zoom} panX={vp.panX} panY={vp.panY} />}
      {showGrid && <CanvasGridOverlay zoom={vp.zoom} panX={vp.panX} panY={vp.panY} />}

      <World
        panX={vp.panX}
        panY={vp.panY}
        zoom={vp.zoom}
        guides={guides}
        linePreview={lineDrawState && linePreview ? { ...lineDrawState, x2: linePreview.x, y2: linePreview.y } : null}
        viewportRef={ref}
      />
      {/* Rubber band selection */}
      {rbRect && rbRect.width > 2 && rbRect.height > 2 && (
        <div
          className="absolute pointer-events-none border border-accent"
          style={{
            left: rbRect.left,
            top: rbRect.top,
            width: rbRect.width,
            height: rbRect.height,
            background: 'rgba(45,127,249,0.08)',
          }}
        />
      )}
    </div>
  )
}

function CanvasDotGrid({ zoom, panX, panY }: { zoom: number; panX: number; panY: number }) {
  const spacing = 24
  const screenSpacing = spacing * zoom
  const dotSize = Math.max(0.5, zoom * 1.5)
  const offsetX = ((panX % screenSpacing) + screenSpacing) % screenSpacing
  const offsetY = ((panY % screenSpacing) + screenSpacing) % screenSpacing
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, #D0D0D0 ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${screenSpacing}px ${screenSpacing}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  )
}

function CanvasGridOverlay({ zoom, panX, panY }: { zoom: number; panX: number; panY: number }) {
  const step = 32
  const screenStep = step * zoom
  const offsetX = ((panX % screenStep) + screenStep) % screenStep
  const offsetY = ((panY % screenStep) + screenStep) % screenStep
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)
        `,
        backgroundSize: `${screenStep}px ${screenStep}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  )
}
