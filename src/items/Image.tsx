import React, { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
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

export function ImageCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { blobKey?: string; dataUrl?: string; caption?: string }
  const [src, setSrc] = useState<string | null>(content?.dataUrl ?? null)

  useEffect(() => {
    if (!content?.blobKey || content?.dataUrl) return
    loadBlob(content.blobKey).then(blob => {
      if (blob) setSrc(URL.createObjectURL(blob))
    })
  }, [content?.blobKey])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = newId()
    await saveBlob(key, file)
    const dataUrl = await new Promise<string>(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.readAsDataURL(file)
    })
    updateItem(item.id, { content: { ...content, blobKey: key, dataUrl } })
    setSrc(dataUrl)
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={80} minH={60}
      className="overflow-hidden flex flex-col"
    >
      <div className="flex-1 relative" onPointerDown={e => { if (src) e.stopPropagation() }}>
        {src ? (
          <img src={src} className="w-full h-full object-contain" alt={content?.caption ?? ''} />
        ) : (
          <label
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-text-muted hover:bg-gray-50"
            onPointerDown={e => e.stopPropagation()}
          >
            <ImageIcon size={24} />
            <span className="text-xs mt-1">Click to add image</span>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
        )}
      </div>
      {(src || content?.caption !== undefined) && (
        <input
          className="text-xs text-text-muted text-center border-t border-card-border px-2 py-1 bg-transparent outline-none w-full"
          placeholder="Add a caption"
          value={content?.caption ?? ''}
          onChange={e => updateItem(item.id, { content: { ...content, caption: e.target.value } }, true)}
          onPointerDown={e => e.stopPropagation()}
        />
      )}
    </CardShell>
  )
}
