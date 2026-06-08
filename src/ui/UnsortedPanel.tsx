import React, { useEffect, useRef } from 'react'
import { X, Inbox } from 'lucide-react'
import { useStore } from '../state/store'

export function UnsortedPill() {
  const unsortedOpen = useStore(s => s.unsortedOpen)
  const setUnsortedOpen = useStore(s => s.setUnsortedOpen)
  const currentBoardId = useStore(s => s.currentBoardId)
  const items = useStore(s => s.items)
  const flashRef = useRef(false)
  const [flash, setFlash] = React.useState(false)

  const unsorted = Object.values(items).filter(
    i => i.boardId === currentBoardId && i.content?.['unsorted']
  )

  useEffect(() => {
    if (unsorted.length > 0 && !flashRef.current) {
      flashRef.current = true
      setFlash(true)
      setTimeout(() => { setFlash(false); flashRef.current = false }, 1200)
    }
  }, [unsorted.length])

  return (
    <button
      className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shadow-card border border-card-border transition-colors ${
        flash ? 'bg-accent text-white' : 'bg-white text-text-primary'
      }`}
      onClick={() => setUnsortedOpen(!unsortedOpen)}
    >
      <Inbox size={14} />
      {unsorted.length} Unsorted
    </button>
  )
}

export function UnsortedPanel() {
  const unsortedOpen = useStore(s => s.unsortedOpen)
  const setUnsortedOpen = useStore(s => s.setUnsortedOpen)
  const currentBoardId = useStore(s => s.currentBoardId)
  const items = useStore(s => s.items)
  const updateItem = useStore(s => s.updateItem)
  const removeItem = useStore(s => s.removeItem)

  if (!unsortedOpen) return null

  const unsorted = Object.values(items).filter(
    i => i.boardId === currentBoardId && i.content?.['unsorted']
  )

  const placeOnCanvas = (id: string) => {
    const item = items[id]
    if (!item) return
    const { unsorted: _, ...rest } = item.content as Record<string, unknown>
    updateItem(id, { content: rest, x: 100, y: 100 })
  }

  const getLabel = (item: typeof unsorted[0]) => {
    const c = item.content as Record<string, unknown>
    if (c?.['title']) return String(c['title'])
    if (c?.['html']) return String(c['html']).replace(/<[^>]*>/g, '').slice(0, 60)
    if (c?.['url']) return String(c['url'])
    if (c?.['filename']) return String(c['filename'])
    return item.type
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-64 bg-white border-l border-card-border z-20 flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border">
        <span className="font-semibold text-sm text-text-primary">Unsorted ({unsorted.length})</span>
        <button onClick={() => setUnsortedOpen(false)} className="text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {unsorted.length === 0 && (
          <p className="text-xs text-text-muted p-2 italic">No unsorted items.</p>
        )}
        {unsorted.map(item => (
          <div key={item.id} className="bg-gray-50 rounded border border-card-border p-2 text-xs">
            <div className="flex justify-between items-start mb-1">
              <span className="text-text-muted capitalize">{item.type}</span>
              <button
                className="text-red-400 hover:text-red-600 ml-1"
                onClick={() => removeItem(item.id)}
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-text-primary truncate">{getLabel(item)}</p>
            <button
              className="mt-1 text-accent hover:underline text-xs"
              onClick={() => placeOnCanvas(item.id)}
            >
              Place on canvas
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
