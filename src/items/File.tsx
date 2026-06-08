import React from 'react'
import { FileIcon, DownloadIcon } from 'lucide-react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'
import { loadBlob, saveBlob } from '../db/persistence'
import { newId } from '../lib/ids'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function FileCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { blobKey?: string; filename?: string; size?: number }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = newId()
    await saveBlob(key, file)
    updateItem(item.id, { content: { blobKey: key, filename: file.name, size: file.size } })
  }

  const onDownload = async () => {
    if (!content?.blobKey) return
    const blob = await loadBlob(content.blobKey)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = content.filename ?? 'file'
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n: number) => n < 1024 ? `${n}B` : n < 1048576 ? `${(n / 1024).toFixed(1)}KB` : `${(n / 1048576).toFixed(1)}MB`

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={140} minH={50}
      className="overflow-hidden"
    >
      <div className="p-2 flex items-center gap-2 h-full" onPointerDown={e => e.stopPropagation()}>
        {content?.filename ? (
          <>
            <FileIcon size={20} className="text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-text-primary">{content.filename}</p>
              {content.size != null && <p className="text-xs text-text-muted">{fmt(content.size)}</p>}
            </div>
            <button onClick={onDownload} className="text-text-muted hover:text-text-primary">
              <DownloadIcon size={16} />
            </button>
          </>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-primary w-full">
            <FileIcon size={20} />
            <span className="text-sm">Upload file</span>
            <input type="file" className="hidden" onChange={onFile} />
          </label>
        )}
      </div>
    </CardShell>
  )
}
