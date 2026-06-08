import React, { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store'
import { HOME_BOARD_ID } from '../lib/ids'
import type { Board, Item } from '../db/db'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getItemText(item: Item): string {
  const c = item.content as Record<string, unknown> | undefined
  if (!c) return ''
  const parts: string[] = []
  if (c['html']) parts.push(stripHtml(c['html'] as string))
  if (c['title']) parts.push(String(c['title']))
  if (c['url']) parts.push(String(c['url']))
  if (c['text']) parts.push(String(c['text']))
  if (c['caption']) parts.push(String(c['caption']))
  if (c['filename']) parts.push(String(c['filename']))
  if (Array.isArray(c['tasks'])) {
    for (const t of c['tasks'] as Array<{ text: string }>) {
      if (t.text) parts.push(t.text)
    }
  }
  if (Array.isArray(c['rows'])) {
    for (const row of c['rows'] as string[][]) {
      parts.push(...row)
    }
  }
  return parts.join(' ')
}

function getBoardPath(boardId: string, boards: Record<string, Board>): string {
  const path: string[] = []
  let cur = boards[boardId]
  while (cur) {
    path.unshift(cur.title || 'Untitled')
    if (!cur.parentId) break
    cur = boards[cur.parentId]
  }
  return path.join(' / ')
}

interface Result {
  type: 'board' | 'item'
  id: string
  boardId?: string
  title: string
  snippet: string
  path: string
}

export function SearchOverlay() {
  const searchOpen = useStore(s => s.searchOpen)
  const setSearchOpen = useStore(s => s.setSearchOpen)
  const boards = useStore(s => s.boards)
  const items = useStore(s => s.items)
  const setSelectedIds = useStore(s => s.setSelectedIds)
  const setViewport = useStore(s => s.setViewport)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    const lq = q.toLowerCase()
    const found: Result[] = []

    for (const board of Object.values(boards)) {
      if (board.title.toLowerCase().includes(lq)) {
        found.push({
          type: 'board',
          id: board.id,
          title: board.title || 'Untitled',
          snippet: 'Board',
          path: getBoardPath(board.id, boards),
        })
      }
    }

    for (const item of Object.values(items)) {
      const text = getItemText(item)
      const combined = text.toLowerCase()
      if (combined.includes(lq)) {
        const board = boards[item.boardId]
        found.push({
          type: 'item',
          id: item.id,
          boardId: item.boardId,
          title: text.slice(0, 60) || item.type,
          snippet: item.type,
          path: board ? getBoardPath(item.boardId, boards) : '',
        })
      }
    }
    setResults(found.slice(0, 50))
  }, [boards, items])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 150)
    return () => clearTimeout(timer)
  }, [query, search])

  const activate = (result: Result) => {
    if (result.type === 'board') {
      navigate(result.id === HOME_BOARD_ID ? '/' : `/b/${result.id}`)
    } else if (result.boardId) {
      navigate(result.boardId === HOME_BOARD_ID ? '/' : `/b/${result.boardId}`)
      setTimeout(() => {
        const item = items[result.id]
        if (!item) return
        const cx = item.x + item.w / 2
        const cy = item.y + item.h / 2
        const vpW = window.innerWidth - 64
        const vpH = window.innerHeight - 52
        setViewport(result.boardId!, {
          panX: vpW / 2 - cx,
          panY: vpH / 2 - cy,
          zoom: 1,
        })
        setSelectedIds(new Set([result.id]))
      }, 100)
    }
    setSearchOpen(false)
    setQuery('')
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/20"
      onClick={() => setSearchOpen(false)}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-card-border">
          <Search size={16} className="text-text-muted" />
          <input
            autoFocus
            className="flex-1 outline-none text-sm text-text-primary"
            placeholder="Search all boards…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter' && results.length > 0) activate(results[0])
            }}
          />
          <button onClick={() => setSearchOpen(false)} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-80 overflow-auto">
          {results.length === 0 && query && (
            <p className="text-sm text-text-muted p-4 text-center">No results</p>
          )}
          {results.map(r => (
            <button
              key={r.type + r.id}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col gap-0.5"
              onClick={() => activate(r)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted capitalize bg-gray-100 px-1.5 py-0.5 rounded">{r.snippet}</span>
                <span className="text-sm text-text-primary truncate">{r.title}</span>
              </div>
              {r.path && <span className="text-xs text-text-muted">{r.path}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
