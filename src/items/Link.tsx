import React, { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function LinkCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { url: string; title?: string }
  const [editing, setEditing] = useState(!content?.url)

  const domain = (() => {
    try { return new URL(content.url).hostname } catch { return '' }
  })()

  const setUrl = (url: string) => {
    updateItem(item.id, { content: { ...content, url } }, true)
  }
  const setTitle = (title: string) => {
    updateItem(item.id, { content: { ...content, title } }, true)
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={60}
      className="overflow-hidden flex flex-col"
    >
      <div className="p-2 flex flex-col gap-1 h-full">
        {editing || !content?.url ? (
          <input
            autoFocus
            className="text-sm w-full outline-none border border-card-border rounded px-1 py-0.5"
            placeholder="Paste URL…"
            defaultValue={content?.url}
            onBlur={e => { setUrl(e.target.value); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { setUrl((e.target as HTMLInputElement).value); setEditing(false) } }}
            onPointerDown={e => e.stopPropagation()}
          />
        ) : (
          <>
            <div className="flex items-start gap-1">
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex-1 break-all"
                onPointerDown={e => e.stopPropagation()}
              >
                {content.title || content.url}
              </a>
            </div>
            {domain && <p className="text-xs text-text-muted">{domain}</p>}
            <button
              className="text-xs text-text-muted hover:text-text-primary self-start"
              onClick={() => setEditing(true)}
              onPointerDown={e => e.stopPropagation()}
            >
              Edit URL
            </button>
          </>
        )}
      </div>
    </CardShell>
  )
}
