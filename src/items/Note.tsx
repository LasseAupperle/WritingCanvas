import React, { useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'
import { pushHistory } from '../state/history'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function NoteCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { html: string } | undefined
  const before = React.useRef<Item>({ ...item })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content?.html ?? '',
    onFocus: () => { before.current = { ...item } },
    onBlur: ({ editor }) => {
      const html = editor.getHTML()
      updateItem(item.id, { content: { ...item.content, html } }, true)
      pushHistory({ type: 'update', before: before.current, after: { ...item, content: { ...item.content, html } } })
    },
  })

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={120} minH={60}
      className="overflow-auto"
    >
      <div
        className="p-2 h-full"
        onPointerDown={e => e.stopPropagation()}
      >
        <EditorContent
          editor={editor}
          className="tiptap-note h-full outline-none text-sm text-text-primary"
        />
      </div>
    </CardShell>
  )
}
