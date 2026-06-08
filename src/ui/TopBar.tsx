import React from 'react'
import { Search } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb'
import { ZoomControl } from './ZoomControl'
import { ViewMenu } from './ViewMenu'
import { useStore } from '../state/store'
import { HOME_BOARD_ID } from '../lib/ids'
import { TOPBAR_HEIGHT } from '../lib/constants'

export function TopBar() {
  const currentBoardId = useStore(s => s.currentBoardId)
  const boards = useStore(s => s.boards)
  const updateBoard = useStore(s => s.updateBoard)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const board = boards[currentBoardId]
  const isHome = currentBoardId === HOME_BOARD_ID

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

      {/* Right: search, zoom, share, export */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-text-muted"
          onClick={() => setSearchOpen(true)}
          title="Search (Ctrl+F)"
        >
          <Search size={16} />
        </button>
        <ZoomControl />
        <ViewMenu />
        <button className="text-xs text-text-muted px-2 py-1 rounded hover:bg-gray-100" title="Phase 2">
          Share
        </button>
        <button className="text-xs text-text-muted px-2 py-1 rounded hover:bg-gray-100" title="Phase 2">
          Export ▾
        </button>
      </div>
    </div>
  )
}
