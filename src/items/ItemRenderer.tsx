import React, { useRef, useState, useCallback } from 'react'
import { type Item } from '../db/db'
import { type LODLevel } from '../canvas/lod'
import { useStore } from '../state/store'
import { pushHistory } from '../state/history'
import { NoteCard } from './Note'
import { BoardCard } from './Board'
import { TodoCard } from './Todo'
import { LinkCard } from './Link'
import { ImageCard } from './Image'
import { FileCard } from './File'
import { TableCard } from './Table'
import { ColumnCard } from './Column'
import { CommentCard } from './Comment'
import { SNAP_THRESHOLD } from '../lib/constants'

const LOD_COLORS: Record<string, string> = {
  note: '#FFFFFF',
  board: '#EEF4FF',
  todo: '#FFF8EE',
  link: '#F0FFF4',
  image: '#FFF0F0',
  file: '#F5F5F5',
  table: '#F0F0FF',
  column: '#F8F8F8',
  comment: '#FFFBEA',
  line: 'transparent',
}

interface Props {
  item: Item
  lod: LODLevel
  zoom: number
}

export function ItemRenderer({ item, lod, zoom }: Props) {
  const selectedIds = useStore(s => s.selectedIds)
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const addToSelection = useStore(s => s.addToSelection)
  const updateItem = useStore(s => s.updateItem)
  const removeItems = useStore(s => s.removeItems)
  const snapToGrid = useStore(s => s.snapToGrid)
  const smartGuides = useStore(s => s.smartGuides)
  const setDragOverTrash = useStore(s => s.setDragOverTrash)
  const items = useStore(s => s.items)
  const allBoardItems = Object.values(items).filter(i => i.boardId === item.boardId)

  const isSelected = selectedIds.has(item.id)
  const dragState = useRef<{
    startMX: number; startMY: number
    origPositions: Array<{ id: string; x: number; y: number }>
    isAltDuplicate: boolean
    duplicateIds: string[] | null
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [localGuides, setLocalGuides] = useState<Array<{ axis: 'h' | 'v'; value: number }>>([])

  if (item.type === 'line') return null // lines rendered in SVG layer

  const snapVal = (v: number) => {
    if (!snapToGrid) return v
    return Math.round(v / 8) * 8
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return

    const armedTool = useStore.getState().armedTool
    if (armedTool) return // let viewport handle it

    e.stopPropagation()

    if (e.shiftKey) {
      addToSelection(item.id)
    } else if (!selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]))
    }

    const sel = useStore.getState().selectedIds
    const allSelected = Array.from(sel.has(item.id) ? sel : new Set([item.id]))
    const origPositions = allSelected
      .map(id => useStore.getState().items[id])
      .filter(Boolean)
      .map(i => ({ id: i.id, x: i.x, y: i.y }))

    dragState.current = {
      startMX: e.clientX,
      startMY: e.clientY,
      origPositions,
      isAltDuplicate: e.altKey,
      duplicateIds: null,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [item.id, selectedIds])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return
    const dx = (e.clientX - dragState.current.startMX) / zoom
    const dy = (e.clientY - dragState.current.startMY) / zoom

    if (!isDragging && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      setIsDragging(true)
      // Alt+drag: spawn clones, move those instead
      if (dragState.current.isAltDuplicate && !dragState.current.duplicateIds) {
        const ids: string[] = []
        const storeItems = useStore.getState().items
        for (const { id } of dragState.current.origPositions) {
          const orig = storeItems[id]
          if (!orig) continue
          const clone = useStore.getState().createItem({
            boardId: orig.boardId,
            type: orig.type,
            x: orig.x + 20, y: orig.y + 20,
            w: orig.w, h: orig.h,
            content: JSON.parse(JSON.stringify(orig.content ?? {})),
          })
          ids.push(clone.id)
        }
        dragState.current.duplicateIds = ids
        // Switch drag to move the clones
        const newPositions = ids.map((id, i) => {
          const orig = dragState.current!.origPositions[i]
          return { id, x: orig.x + 20, y: orig.y + 20 }
        })
        dragState.current.origPositions = newPositions
      }
    }
    if (!isDragging && Math.abs(dx) < 2 && Math.abs(dy) < 2) return

    const current = useStore.getState()
    let finalDx = dx
    let finalDy = dy
    const freeMove = e.altKey || e.ctrlKey // modifier disables snapping

    if (!freeMove && smartGuides && dragState.current.origPositions.length > 0) {
      const threshold = SNAP_THRESHOLD / zoom
      const staticItems = allBoardItems.filter(i => !dragState.current!.origPositions.find(p => p.id === i.id))
      const movingItems = dragState.current.origPositions.map(p => {
        const orig = current.items[p.id]
        return { ...orig, x: p.x + dx, y: p.y + dy }
      })
      for (const s of staticItems) {
        for (const m of movingItems) {
          const origPos = dragState.current!.origPositions.find(p => p.id === m.id)
          if (!origPos) continue
          if (Math.abs(m.x - s.x) < threshold) finalDx = s.x - origPos.x
          if (Math.abs(m.y - s.y) < threshold) finalDy = s.y - origPos.y
        }
      }
    }

    for (const { id, x, y } of dragState.current.origPositions) {
      const nx = freeMove ? x + finalDx : snapVal(x + finalDx)
      const ny = freeMove ? y + finalDy : snapVal(y + finalDy)
      updateItem(id, { x: nx, y: ny }, false)
    }

    // Detect if pointer is over trash zone (bottom of toolbar)
    const trashEl = document.querySelector('[data-trash-zone]')
    if (trashEl) {
      const r = trashEl.getBoundingClientRect()
      const over = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      setDragOverTrash(over)
    }
  }, [zoom, isDragging, snapToGrid, smartGuides, allBoardItems])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragState.current && isDragging) {
      // Check trash zone
      const trashEl = document.querySelector('[data-trash-zone]')
      const overTrash = trashEl ? (() => {
        const r = trashEl.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      })() : false

      if (overTrash) {
        const ids = dragState.current.origPositions.map(p => p.id)
        removeItems(ids)
      } else {
        const current = useStore.getState()
        const afters = dragState.current.origPositions
          .map(p => current.items[p.id])
          .filter(Boolean)
        const befores = dragState.current.origPositions
          .map(({ id, x, y }) => ({ ...current.items[id], x, y }))
          .filter(Boolean)
        pushHistory({ type: 'move-multi', befores, afters })
      }
      setDragOverTrash(false)
    }
    dragState.current = null
    setIsDragging(false)
    setLocalGuides([])
  }, [isDragging, removeItems, setDragOverTrash])

  // LOD: simplified or rect
  if (lod === 'rect') {
    return (
      <div
        data-item-id={item.id}
        className="absolute rounded"
        style={{
          left: item.x, top: item.y,
          width: item.w, height: item.h,
          background: LOD_COLORS[item.type] ?? '#eee',
          border: isSelected ? '2px solid #2D7FF9' : '1px solid #ccc',
          zIndex: item.z,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    )
  }

  if (lod === 'simplified') {
    const content = item.content as Record<string, unknown> | undefined
    const title =
      (content?.['title'] as string) ||
      (content?.['html'] ? stripHtml(content['html'] as string) : '') ||
      item.type
    return (
      <div
        data-item-id={item.id}
        className="absolute rounded overflow-hidden"
        style={{
          left: item.x, top: item.y,
          width: item.w, height: item.h,
          background: LOD_COLORS[item.type] ?? '#eee',
          border: isSelected ? '2px solid #2D7FF9' : '1px solid #E2E2E2',
          zIndex: item.z,
          fontSize: 12 / zoom < 8 ? 8 : 12 / zoom,
          padding: 4 / zoom,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="truncate block">{title}</span>
      </div>
    )
  }

  // full LOD
  const sharedProps = {
    item,
    isSelected,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoom,
  }

  return (
    <>
      {item.type === 'note' && <NoteCard {...sharedProps} />}
      {item.type === 'board' && <BoardCard {...sharedProps} />}
      {item.type === 'todo' && <TodoCard {...sharedProps} />}
      {item.type === 'link' && <LinkCard {...sharedProps} />}
      {item.type === 'image' && <ImageCard {...sharedProps} />}
      {item.type === 'file' && <FileCard {...sharedProps} />}
      {item.type === 'table' && <TableCard {...sharedProps} />}
      {item.type === 'column' && <ColumnCard {...sharedProps} />}
      {item.type === 'comment' && <CommentCard {...sharedProps} />}
    </>
  )
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim().slice(0, 80)
}
