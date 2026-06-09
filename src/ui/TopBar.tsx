import React, { useState, useRef, useEffect } from 'react'
import { Search, Upload, Download, ChevronDown, LayoutGrid, Undo2, Redo2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'
import { ZoomControl } from './ZoomControl'
import { ViewMenu } from './ViewMenu'
import { useStore } from '../state/store'
import { HOME_BOARD_ID } from '../lib/ids'
import { TOPBAR_HEIGHT } from '../lib/constants'
import { exportBoard, importCanvas, type CanvasFile } from '../lib/exportImport'

export function TopBar() {
  const navigate = useNavigate()
  const currentBoardId = useStore(s => s.currentBoardId)
  const boards = useStore(s => s.boards)
  const items = useStore(s => s.items)
  const updateBoard = useStore(s => s.updateBoard)
  const setBoards = useStore(s => s.setBoards)
  const setItems = useStore(s => s.setItems)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)
  const undoCount = useStore(s => s.undoCount)
  const redoCount = useStore(s => s.redoCount)
  const board = boards[currentBoardId]
  const isHome = currentBoardId === HOME_BOARD_ID

  const [toast, setToast] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [boardsOpen, setBoardsOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const boardsRef = useRef<HTMLDivElement>(null)

  // Only show boards that have a live board-card item (filters out pre-fix orphans in IndexedDB)
  const liveChildBoardIds = new Set(Object.values(items).filter(i => i.type === 'board' && i.childBoardId).map(i => i.childBoardId!))
  const allBoards = Object.values(boards)
    .filter(b => b.id !== HOME_BOARD_ID && liveChildBoardIds.has(b.id))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
      if (boardsRef.current && !boardsRef.current.contains(e.target as Node)) {
        setBoardsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = async (includeChildren: boolean) => {
    setExportOpen(false)
    if (!board) return
    try {
      await exportBoard(
        board,
        Object.values(items),
        boards,
        includeChildren,
      )
      showToast('Board exported successfully')
    } catch {
      showToast('Export failed — try again')
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.canvas'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const data = JSON.parse(text) as CanvasFile
        if (data.version !== 1 || !data.board || !data.items) {
          showToast('Invalid .canvas file')
          return
        }
        const existingBoards = Object.values(boards)
        const existingItems = Object.values(items)
        const result = await importCanvas(data, existingBoards, existingItems, currentBoardId)
        setBoards([...existingBoards, ...result.newBoards])
        setItems([...existingItems, ...result.newItems])
        showToast(`Imported "${data.board.title}" successfully`)
      } catch {
        showToast('Import failed — invalid file')
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 bg-panel-bg border-b border-card-border flex items-center px-3 gap-3 z-30"
      style={{ height: TOPBAR_HEIGHT }}
    >
      {/* Left: logo + breadcrumb */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          C
        </div>
        <Breadcrumb boardId={currentBoardId} />
      </div>

      {/* Center: board title (not on home) */}
      {!isHome && board && (
        <div className="flex-1 flex justify-center">
          <input
            className="font-semibold text-sm text-text-primary bg-transparent border-none outline-none text-center w-48 hover:bg-gray-50 rounded px-2 py-0.5"
            value={board.title}
            onChange={e => updateBoard(currentBoardId, { title: e.target.value })}
            placeholder="Board title"
          />
        </div>
      )}

      {/* Right: search, zoom, view, import, export */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-text-muted"
          onClick={() => setSearchOpen(true)}
          title="Search (Ctrl+F)"
        >
          <Search size={16} />
        </button>
        <button
          className={`p-1.5 rounded transition-colors ${undoCount > 0 ? 'hover:bg-gray-100 text-text-muted hover:text-text-primary' : 'text-gray-300 cursor-not-allowed'}`}
          onClick={undoCount > 0 ? undo : undefined}
          title={`Undo (Ctrl+Z)${undoCount > 0 ? ` — ${undoCount} step${undoCount !== 1 ? 's' : ''}` : ''}`}
          disabled={undoCount === 0}
        >
          <Undo2 size={16} />
        </button>
        <button
          className={`p-1.5 rounded transition-colors ${redoCount > 0 ? 'hover:bg-gray-100 text-text-muted hover:text-text-primary' : 'text-gray-300 cursor-not-allowed'}`}
          onClick={redoCount > 0 ? redo : undefined}
          title={`Redo (Ctrl+Y)${redoCount > 0 ? ` — ${redoCount} step${redoCount !== 1 ? 's' : ''}` : ''}`}
          disabled={redoCount === 0}
        >
          <Redo2 size={16} />
        </button>
        <ZoomControl />
        <ViewMenu />

        {/* Boards switcher */}
        <div ref={boardsRef} className="relative">
          <button
            className="flex items-center gap-1 text-xs text-text-muted px-2 py-1 rounded hover:bg-gray-100"
            title="Switch board"
            onClick={() => setBoardsOpen(o => !o)}
          >
            <LayoutGrid size={13} />
            Boards
            <ChevronDown size={11} className={`transition-transform ${boardsOpen ? 'rotate-180' : ''}`} />
          </button>
          {boardsOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-card-border rounded shadow-lg z-50 w-56 py-1 max-h-80 overflow-y-auto">
              {allBoards.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-muted">No boards yet</div>
              ) : (
                allBoards.map(b => (
                  <button
                    key={b.id}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${b.id === currentBoardId ? 'text-accent font-medium' : 'text-text-primary'}`}
                    onClick={() => { navigate(`/b/${b.id}`); setBoardsOpen(false) }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: b.color || '#2D7FF9' }}
                    />
                    <span className="truncate">{b.title || 'Untitled'}</span>
                    {b.id === currentBoardId && (
                      <span className="ml-auto text-[10px] text-accent">current</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Import */}
        <button
          className="flex items-center gap-1 text-xs text-text-muted px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
          title="Import a .canvas file"
          disabled={importing}
          onClick={handleImport}
        >
          <Upload size={13} />
          {importing ? 'Importing…' : 'Import'}
        </button>

        {/* Export dropdown */}
        <div ref={exportRef} className="relative">
          <button
            className="flex items-center gap-1 text-xs text-text-muted px-2 py-1 rounded hover:bg-gray-100"
            title="Export current board"
            onClick={() => setExportOpen(o => !o)}
          >
            <Download size={13} />
            Export
            <ChevronDown size={11} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-card-border rounded shadow-lg z-50 w-52 py-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => handleExport(false)}
              >
                Export this board
                <div className="text-xs text-text-muted mt-0.5">Items on current board only</div>
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => handleExport(true)}
              >
                Export with sub-boards
                <div className="text-xs text-text-muted mt-0.5">Include all nested boards</div>
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-lg z-50 shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
