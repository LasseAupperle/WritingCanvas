import React, { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../state/store'
import { HOME_BOARD_ID } from '../lib/ids'
import { Viewport } from '../canvas/Viewport'
import { TopBar } from '../ui/TopBar'
import { Toolbar } from '../ui/Toolbar'
import { UnsortedPill, UnsortedPanel } from '../ui/UnsortedPanel'
import { SearchOverlay } from '../ui/SearchOverlay'
import { AlignToolbar } from '../ui/AlignToolbar'
import { TOOLBAR_WIDTH, TOPBAR_HEIGHT } from '../lib/constants'
import type { Item } from '../db/db'
import { newId } from '../lib/ids'

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const resolvedId = boardId ?? HOME_BOARD_ID

  const setCurrentBoard = useStore(s => s.setCurrentBoard)
  const boards = useStore(s => s.boards)
  const selectedIds = useStore(s => s.selectedIds)
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const clearSelection = useStore(s => s.clearSelection)
  const removeItems = useStore(s => s.removeItems)
  const items = useStore(s => s.items)
  const setArmedTool = useStore(s => s.setArmedTool)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const updateItem = useStore(s => s.updateItem)
  const createItem = useStore(s => s.createItem)
  const setInAppClipboard = useStore(s => s.setInAppClipboard)
  const inAppClipboard = useStore(s => s.inAppClipboard)
  const currentBoardId = useStore(s => s.currentBoardId)
  const getMaxZ = useStore(s => s.getMaxZ)

  useEffect(() => {
    setCurrentBoard(resolvedId)
    document.title = boards[resolvedId]?.title || 'Canvas'
  }, [resolvedId, boards[resolvedId]?.title])

  useEffect(() => {
    document.title = boards[resolvedId]?.title || 'Canvas'
  }, [boards[resolvedId]?.title])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const inText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Arm line tool
    if (e.key === 'l' || e.key === 'L') {
      if (!inText) { e.preventDefault(); setArmedTool('line') }
      return
    }

    // Global search
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault()
      setSearchOpen(true)
      return
    }

    // Undo/redo
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault(); redo(); return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault(); undo(); return
    }

    // Navigation
    if ((e.metaKey || e.ctrlKey) && e.key === '[') {
      e.preventDefault(); navigate(-1); return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === ']') {
      e.preventDefault(); navigate(1); return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      const board = boards[resolvedId]
      if (board?.parentId) navigate(`/b/${board.parentId}`)
      else navigate('/')
      return
    }

    // Select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      if (!inText) {
        e.preventDefault()
        const boardItems = Object.values(items).filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])
        setSelectedIds(new Set(boardItems.map(i => i.id)))
      }
      return
    }

    // Copy
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !inText) {
      const sel = Array.from(selectedIds).map(id => items[id]).filter(Boolean) as Item[]
      if (sel.length) setInAppClipboard(sel)
      return
    }

    // Cut
    if ((e.metaKey || e.ctrlKey) && e.key === 'x' && !inText) {
      const sel = Array.from(selectedIds).map(id => items[id]).filter(Boolean) as Item[]
      if (sel.length) {
        setInAppClipboard(sel)
        removeItems(sel.map(i => i.id))
      }
      return
    }

    // Paste
    if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !inText) {
      if (inAppClipboard.length > 0) {
        // Paste in-app clipboard
        const offset = 20
        const newItems = inAppClipboard.map(orig => ({
          ...orig,
          id: newId(),
          boardId: currentBoardId,
          x: orig.x + offset,
          y: orig.y + offset,
          z: getMaxZ(currentBoardId) + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }))
        for (const it of newItems) {
          createItem({
            boardId: it.boardId,
            type: it.type,
            x: it.x, y: it.y,
            w: it.w, h: it.h,
            z: it.z,
            content: it.content,
          })
        }
      }
      // External paste handled in the paste event below
      return
    }

    // Escape
    if (e.key === 'Escape') {
      clearSelection()
      setArmedTool(null)
      return
    }

    // Delete / Backspace
    if ((e.key === 'Delete' || e.key === 'Backspace') && !inText && selectedIds.size > 0) {
      e.preventDefault()
      removeItems(Array.from(selectedIds))
      return
    }

    // Nudge
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !inText) {
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      for (const id of selectedIds) {
        const it = items[id]
        if (it) updateItem(id, { x: it.x + dx, y: it.y + dy })
      }
      return
    }

    // Z-order
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowUp') {
      for (const id of selectedIds) {
        const it = items[id]; if (it) updateItem(id, { z: it.z + 1 })
      }
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'ArrowDown') {
      for (const id of selectedIds) {
        const it = items[id]; if (it) updateItem(id, { z: Math.max(0, it.z - 1) })
      }
      return
    }

    // Zoom to fit: Shift+1
    if (e.shiftKey && e.key === '1') {
      e.preventDefault()
      const boardItems = Object.values(items).filter(i => i.boardId === currentBoardId && !i.content?.['unsorted'])
      const setViewport = useStore.getState().setViewport
      if (!boardItems.length) { setViewport(currentBoardId, { panX: 0, panY: 0, zoom: 1 }); return }
      const minX = Math.min(...boardItems.map(i => i.x))
      const minY = Math.min(...boardItems.map(i => i.y))
      const maxX = Math.max(...boardItems.map(i => i.x + i.w))
      const maxY = Math.max(...boardItems.map(i => i.y + i.h))
      const vpW = window.innerWidth - 64
      const vpH = window.innerHeight - 52
      const zoom = Math.min(4, Math.max(0.005, Math.min(vpW / (maxX - minX + 80), vpH / (maxY - minY + 80))))
      const panX = (vpW - (maxX - minX) * zoom) / 2 - minX * zoom + 40 * zoom
      const panY = (vpH - (maxY - minY) * zoom) / 2 - minY * zoom + 40 * zoom
      setViewport(currentBoardId, { panX, panY, zoom })
    }
  }, [selectedIds, items, currentBoardId, inAppClipboard, boards, resolvedId])

  // External paste event (text/image → Unsorted)
  const onPaste = useCallback(async (e: ClipboardEvent) => {
    const target = e.target as HTMLElement
    if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    if (inAppClipboard.length > 0) return // in-app paste takes precedence

    const items2 = e.clipboardData?.items
    if (!items2) return
    for (const ci of Array.from(items2)) {
      if (ci.type.startsWith('image/')) {
        const blob = ci.getAsFile()
        if (!blob) continue
        const { saveBlob } = await import('../db/persistence')
        const key = newId()
        await saveBlob(key, blob)
        createItem({
          boardId: currentBoardId,
          type: 'image',
          x: 0, y: 0, w: 240, h: 180,
          content: { blobKey: key, caption: '', unsorted: true },
        })
        return
      }
    }
    const text = e.clipboardData?.getData('text/plain')
    if (text) {
      createItem({
        boardId: currentBoardId,
        type: 'note',
        x: 0, y: 0, w: 240, h: 120,
        content: { html: `<p>${text}</p>`, unsorted: true },
      })
    }
  }, [currentBoardId, inAppClipboard, createItem])

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('paste', onPaste as unknown as EventListener)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('paste', onPaste as unknown as EventListener)
    }
  }, [onKeyDown, onPaste])

  if (!boards[resolvedId]) {
    return (
      <div className="flex items-center justify-center h-screen text-text-muted">
        Board not found
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#ECECEC' }}>
      <TopBar />
      <Toolbar />
      <Viewport />

      {/* Overlay UI (not transformed) */}
      <div
        className="absolute overflow-hidden"
        style={{ left: TOOLBAR_WIDTH, top: TOPBAR_HEIGHT, right: 0, bottom: 0, pointerEvents: 'none' }}
      >
        <div style={{ pointerEvents: 'auto', position: 'absolute', top: 0, right: 0, left: 0, bottom: 0 }}>
          <UnsortedPill />
          <UnsortedPanel />
          <AlignToolbar />
        </div>
      </div>

      <SearchOverlay />
    </div>
  )
}
