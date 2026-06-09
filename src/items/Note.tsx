import React, { useCallback } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
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

const BUBBLE_COLORS = [
  { value: '#374151', label: 'Default' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
]

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
      TextStyle,
      Color,
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
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            appendTo: () => document.getElementById('root') ?? document.body,
            zIndex: 9999,
            popperOptions: { strategy: 'fixed' },
          }}
        >
          <div
            className="flex items-center gap-0.5 bg-white border border-card-border rounded-lg shadow-lg px-1.5 py-1"
            onPointerDown={e => e.stopPropagation()}
          >
            <FmtBtn active={editor.isActive('bold')} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
              <strong>B</strong>
            </FmtBtn>
            <FmtBtn active={editor.isActive('italic')} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
              <em>I</em>
            </FmtBtn>
            <FmtBtn active={editor.isActive('underline')} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <u>U</u>
            </FmtBtn>
            <FmtBtn active={editor.isActive('strike')} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
              <s>S</s>
            </FmtBtn>

            <Sep />

            <FmtBtn active={editor.isActive('heading', { level: 1 })} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              H1
            </FmtBtn>
            <FmtBtn active={editor.isActive('heading', { level: 2 })} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              H2
            </FmtBtn>
            <FmtBtn active={editor.isActive('heading', { level: 3 })} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              H3
            </FmtBtn>

            <Sep />

            {BUBBLE_COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                style={{
                  background: c.value,
                  border: editor.isActive('textStyle', { color: c.value })
                    ? '2px solid #2D7FF9'
                    : '1px solid rgba(0,0,0,0.15)',
                }}
                onMouseDown={e => {
                  e.preventDefault()
                  editor.chain().focus().setColor(c.value).run()
                }}
              />
            ))}

            <Sep />

            <button
              title="Clear formatting"
              className="text-[10px] px-1 py-0.5 rounded hover:bg-gray-100 text-text-muted leading-none"
              onMouseDown={e => {
                e.preventDefault()
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }}
            >
              ✕
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* stopPropagation only on the editor itself — card padding remains draggable */}
      <div className="p-2 h-full">
        <EditorContent
          editor={editor}
          className="tiptap-note h-full outline-none text-sm text-text-primary"
          onPointerDown={e => e.stopPropagation()}
        />
      </div>
    </CardShell>
  )
}

function FmtBtn({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      className={`text-xs px-1.5 py-0.5 rounded font-mono leading-none ${active ? 'bg-accent text-white' : 'hover:bg-gray-100 text-text-primary'}`}
      onMouseDown={e => {
        e.preventDefault()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-3.5 bg-gray-200 mx-0.5 flex-shrink-0" />
}
