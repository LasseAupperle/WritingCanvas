import React, { useRef, useState } from 'react'
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
import FontFamily from '@tiptap/extension-font-family'
import { FontSize } from '../lib/FontSize'
import { Link as LinkIcon, ExternalLink, Unlink } from 'lucide-react'

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Dancing Script', value: "'Dancing Script', cursive" },
]

const FONT_SIZE_PRESETS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]

const TEXT_COLORS_DARK = [
  { value: '#111827', label: 'Black' },
  { value: '#7f1d1d', label: 'Dark Red' },
  { value: '#7c2d12', label: 'Dark Orange' },
  { value: '#78350f', label: 'Dark Amber' },
  { value: '#14532d', label: 'Dark Green' },
  { value: '#1e3a8a', label: 'Dark Blue' },
  { value: '#4c1d95', label: 'Dark Purple' },
  { value: '#831843', label: 'Dark Pink' },
]

const TEXT_COLORS_LIGHT = [
  { value: '#374151', label: 'Default' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
]

const HIGHLIGHT_COLORS_VIVID = [
  { value: '#fef08a', label: 'Yellow' },
  { value: '#bbf7d0', label: 'Green' },
  { value: '#bfdbfe', label: 'Blue' },
  { value: '#fbcfe8', label: 'Pink' },
  { value: '#fed7aa', label: 'Orange' },
  { value: '#e9d5ff', label: 'Purple' },
  { value: '#fecaca', label: 'Red' },
  { value: '#99f6e4', label: 'Teal' },
]

const HIGHLIGHT_COLORS_PALE = [
  { value: '#fef9c3', label: 'Light Yellow' },
  { value: '#dcfce7', label: 'Light Green' },
  { value: '#dbeafe', label: 'Light Blue' },
  { value: '#fce7f3', label: 'Light Pink' },
  { value: '#fff7ed', label: 'Light Orange' },
  { value: '#f5f3ff', label: 'Light Purple' },
  { value: '#fee2e2', label: 'Light Red' },
  { value: '#f0fdfa', label: 'Light Teal' },
]

interface Props {
  html: string
  onSave: (html: string) => void
  onFocus?: () => void
  className?: string
  style?: React.CSSProperties
}

export function RichTextEditor({ html, onSave, onFocus, className, style }: Props) {
  const [linkInput, setLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const storedSelection = useRef<{ from: number; to: number } | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: html ?? '',
    onFocus: () => { onFocus?.() },
    onBlur: ({ editor }) => { onSave(editor.getHTML()) },
  })

  const openLinkInput = () => {
    if (!editor) return
    storedSelection.current = { from: editor.state.selection.from, to: editor.state.selection.to }
    setLinkUrl(editor.isActive('link') ? editor.getAttributes('link').href ?? '' : '')
    setLinkInput(true)
  }

  const applyLink = () => {
    if (!editor) return
    const href = linkUrl.trim()
    if (!href) { setLinkInput(false); editor.commands.focus(); return }
    const normalised = /^https?:\/\//.test(href) ? href : `https://${href}`
    const { from, to } = storedSelection.current ?? { from: editor.state.selection.from, to: editor.state.selection.to }
    editor.chain().focus().setTextSelection({ from, to }).setLink({ href: normalised }).run()
    setLinkInput(false)
    storedSelection.current = null
  }

  const cancelLink = () => {
    setLinkInput(false)
    storedSelection.current = null
    editor?.commands.focus()
  }

  const currentFontSize = editor?.getAttributes('textStyle').fontSize?.replace('px', '') ?? ''
  const currentFontFamily = editor?.getAttributes('textStyle').fontFamily ?? ''

  const applyFontSize = (val: string) => {
    if (!editor) return
    const n = parseInt(val)
    if (!val || isNaN(n)) {
      editor.chain().focus().unsetFontSize().run()
    } else {
      editor.chain().focus().setFontSize(`${Math.min(200, Math.max(6, n))}px`).run()
    }
  }

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={linkInput ? () => true : null}
          tippyOptions={{
            duration: 100,
            appendTo: () => document.getElementById('root') ?? document.body,
            zIndex: 9999,
            maxWidth: 'none',
            popperOptions: { strategy: 'fixed' },
          }}
        >
          {linkInput ? (
            <div
              className="flex items-center gap-1 bg-white border border-card-border rounded-lg shadow-lg px-1.5 py-1"
              onPointerDown={e => e.stopPropagation()}
            >
              <LinkIcon size={11} className="text-text-muted flex-shrink-0" />
              <input
                autoFocus
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs outline-none w-44 bg-transparent"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); applyLink() }
                  if (e.key === 'Escape') cancelLink()
                }}
                onPointerDown={e => e.stopPropagation()}
              />
              <button
                className="text-xs text-white bg-accent px-1.5 py-0.5 rounded hover:bg-accent/90 flex-shrink-0"
                onMouseDown={e => { e.preventDefault(); applyLink() }}
              >
                Apply
              </button>
              <button
                className="text-xs text-text-muted px-1 py-0.5 rounded hover:bg-gray-100 flex-shrink-0"
                onMouseDown={e => { e.preventDefault(); cancelLink() }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div
              className="flex flex-col bg-white border border-card-border rounded-lg shadow-lg overflow-hidden"
              onPointerDown={e => e.stopPropagation()}
            >
              {/* Row 1: Typography */}
              <div className="flex items-center gap-0.5 px-1.5 pt-1 pb-0.5">
                <select
                  title="Font family"
                  className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none cursor-pointer max-w-[110px]"
                  value={currentFontFamily}
                  style={{ fontFamily: currentFontFamily || 'inherit' }}
                  onChange={e => {
                    const val = e.target.value
                    if (val) editor.chain().focus().setFontFamily(val).run()
                    else editor.chain().focus().unsetFontFamily().run()
                  }}
                  onPointerDown={e => e.stopPropagation()}
                >
                  {FONT_FAMILIES.map(f => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value || 'inherit' }}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <Sep />

                <div className="flex items-center">
                  <input
                    type="number"
                    title="Font size (px)"
                    value={currentFontSize}
                    onChange={e => applyFontSize(e.target.value)}
                    placeholder="px"
                    min={6} max={200}
                    className="w-10 text-xs text-center border border-gray-200 rounded-l py-0.5 outline-none"
                    onPointerDown={e => e.stopPropagation()}
                  />
                  <select
                    title="Font size presets"
                    className="border border-l-0 border-gray-200 rounded-r text-[10px] text-text-muted outline-none cursor-pointer bg-white py-0.5 pr-1 pl-0.5 leading-none"
                    value=""
                    onChange={e => {
                      const val = e.target.value
                      if (val) editor.chain().focus().setFontSize(`${val}px`).run()
                    }}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <option value="">▾</option>
                    {FONT_SIZE_PRESETS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <Sep />

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
              </div>

              {/* Row 2: Text colors + links + clear */}
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 border-t border-gray-100">
                {TEXT_COLORS_DARK.map(c => (
                  <button
                    key={c.value}
                    title={`Text: ${c.label}`}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                    style={{
                      background: c.value,
                      border: editor.isActive('textStyle', { color: c.value }) ? '2px solid #2D7FF9' : '1px solid rgba(0,0,0,0.15)',
                    }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run() }}
                  />
                ))}
                <Sep />
                {TEXT_COLORS_LIGHT.map(c => (
                  <button
                    key={c.value}
                    title={`Text: ${c.label}`}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                    style={{
                      background: c.value,
                      border: editor.isActive('textStyle', { color: c.value }) ? '2px solid #2D7FF9' : '1px solid rgba(0,0,0,0.15)',
                    }}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c.value).run() }}
                  />
                ))}
                <Sep />
                {editor.isActive('link') ? (
                  <>
                    <button title="Edit link" className="p-0.5 rounded hover:bg-gray-100 text-accent" onMouseDown={e => { e.preventDefault(); openLinkInput() }}>
                      <LinkIcon size={11} />
                    </button>
                    <button
                      title="Open link"
                      className="p-0.5 rounded hover:bg-gray-100 text-text-muted"
                      onMouseDown={e => {
                        e.preventDefault()
                        const href = editor.getAttributes('link').href
                        if (href) window.open(href, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      <ExternalLink size={11} />
                    </button>
                    <button title="Remove link" className="p-0.5 rounded hover:bg-gray-100 text-text-muted" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run() }}>
                      <Unlink size={11} />
                    </button>
                  </>
                ) : (
                  <button title="Add link" className="p-0.5 rounded hover:bg-gray-100 text-text-muted" onMouseDown={e => { e.preventDefault(); openLinkInput() }}>
                    <LinkIcon size={11} />
                  </button>
                )}
                <Sep />
                <button
                  title="Clear formatting"
                  className="text-[10px] px-1 py-0.5 rounded hover:bg-gray-100 text-text-muted leading-none"
                  onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().clearNodes().run() }}
                >
                  ✕
                </button>
              </div>

              {/* Row 3: Highlight / background colors */}
              <div className="flex items-center gap-0.5 px-1.5 pb-1 pt-0.5 border-t border-gray-100">
                {HIGHLIGHT_COLORS_VIVID.map(c => (
                  <button
                    key={c.value}
                    title={`Highlight: ${c.label}`}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                    style={{
                      background: c.value,
                      border: editor.isActive('highlight', { color: c.value }) ? '2px solid #2D7FF9' : '1px solid rgba(0,0,0,0.15)',
                    }}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (editor.isActive('highlight', { color: c.value })) {
                        editor.chain().focus().unsetHighlight().run()
                      } else {
                        editor.chain().focus().setHighlight({ color: c.value }).run()
                      }
                    }}
                  />
                ))}
                <Sep />
                {HIGHLIGHT_COLORS_PALE.map(c => (
                  <button
                    key={c.value}
                    title={`Highlight: ${c.label}`}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-transform hover:scale-125"
                    style={{
                      background: c.value,
                      border: editor.isActive('highlight', { color: c.value }) ? '2px solid #2D7FF9' : '1px solid rgba(0,0,0,0.15)',
                    }}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (editor.isActive('highlight', { color: c.value })) {
                        editor.chain().focus().unsetHighlight().run()
                      } else {
                        editor.chain().focus().setHighlight({ color: c.value }).run()
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        className={className}
        style={style}
        onPointerDown={e => {
          // Only block drag when clicking inside the editor text area,
          // not on the padding around it (which should allow card drag)
          if ((e.target as HTMLElement).closest('[contenteditable]')) {
            e.stopPropagation()
          }
        }}
      />
    </>
  )
}

function FmtBtn({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      className={`text-xs px-1.5 py-0.5 rounded font-mono leading-none ${active ? 'bg-accent text-white' : 'hover:bg-gray-100 text-text-primary'}`}
      onMouseDown={e => { e.preventDefault(); onClick() }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-3.5 bg-gray-200 mx-0.5 flex-shrink-0" />
}
