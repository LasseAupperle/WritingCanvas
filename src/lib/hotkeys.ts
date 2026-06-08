export interface HotkeyDef {
  id: string
  label: string
  description: string
  defaultKey: string
  category: 'canvas' | 'tools' | 'selection' | 'text' | 'navigation'
}

export const HOTKEY_DEFS: HotkeyDef[] = [
  // Canvas
  { id: 'pan', label: 'Pan canvas', description: 'Hold Space and drag to pan the canvas', defaultKey: 'Space+Drag', category: 'canvas' },
  { id: 'zoom-fit', label: 'Zoom to fit', description: 'Fit all items in view', defaultKey: 'Shift+1', category: 'canvas' },
  { id: 'zoom-in', label: 'Zoom in', description: 'Zoom in', defaultKey: 'Ctrl++', category: 'canvas' },
  { id: 'zoom-out', label: 'Zoom out', description: 'Zoom out', defaultKey: 'Ctrl+-', category: 'canvas' },
  { id: 'new-note', label: 'New note', description: 'Double-click empty canvas to create a note', defaultKey: 'Double-click', category: 'canvas' },

  // Tools
  { id: 'tool-line', label: 'Line tool', description: 'Arm the line tool, then click twice to draw a connector', defaultKey: 'L', category: 'tools' },
  { id: 'search', label: 'Global search', description: 'Search all boards and items', defaultKey: 'Ctrl+F', category: 'tools' },
  { id: 'escape', label: 'Deselect / cancel', description: 'Deselect all, disarm tool, or cancel line drawing', defaultKey: 'Escape', category: 'tools' },

  // Selection
  { id: 'select-all', label: 'Select all', description: 'Select every item on the current board', defaultKey: 'Ctrl+A', category: 'selection' },
  { id: 'delete', label: 'Delete', description: 'Delete selected items', defaultKey: 'Delete', category: 'selection' },
  { id: 'duplicate', label: 'Duplicate', description: 'Hold Alt and drag to clone selected items', defaultKey: 'Alt+Drag', category: 'selection' },
  { id: 'copy', label: 'Copy', description: 'Copy selected items to clipboard', defaultKey: 'Ctrl+C', category: 'selection' },
  { id: 'cut', label: 'Cut', description: 'Cut selected items', defaultKey: 'Ctrl+X', category: 'selection' },
  { id: 'paste', label: 'Paste', description: 'Paste items or create note from external text', defaultKey: 'Ctrl+V', category: 'selection' },
  { id: 'undo', label: 'Undo', description: 'Undo last action', defaultKey: 'Ctrl+Z', category: 'selection' },
  { id: 'redo', label: 'Redo', description: 'Redo last undone action', defaultKey: 'Ctrl+Shift+Z', category: 'selection' },
  { id: 'nudge', label: 'Nudge', description: 'Move selected items 1px with arrow keys, 10px with Shift+arrow', defaultKey: 'Arrows', category: 'selection' },
  { id: 'z-forward', label: 'Bring forward', description: 'Move selected items forward in stack order', defaultKey: 'Ctrl+Shift+↑', category: 'selection' },
  { id: 'z-back', label: 'Send backward', description: 'Move selected items backward in stack order', defaultKey: 'Ctrl+Shift+↓', category: 'selection' },
  { id: 'free-move', label: 'Free move (no snap)', description: 'Hold Alt or Ctrl while dragging to disable snapping', defaultKey: 'Alt+Drag / Ctrl+Drag', category: 'selection' },

  // Text (inside Note editor)
  { id: 'bold', label: 'Bold', description: 'Toggle bold text', defaultKey: 'Ctrl+B', category: 'text' },
  { id: 'italic', label: 'Italic', description: 'Toggle italic text', defaultKey: 'Ctrl+I', category: 'text' },
  { id: 'underline', label: 'Underline', description: 'Toggle underline', defaultKey: 'Ctrl+U', category: 'text' },
  { id: 'link', label: 'Insert link', description: 'Insert or edit a hyperlink', defaultKey: 'Ctrl+K', category: 'text' },
  { id: 'h1', label: 'Heading 1', description: 'Large heading', defaultKey: 'Ctrl+Shift+1', category: 'text' },
  { id: 'h2', label: 'Heading 2', description: 'Normal heading', defaultKey: 'Ctrl+Shift+2', category: 'text' },

  // Navigation
  { id: 'nav-back', label: 'Navigate back', description: 'Go to the previous board', defaultKey: 'Ctrl+[', category: 'navigation' },
  { id: 'nav-forward', label: 'Navigate forward', description: 'Go to the next board', defaultKey: 'Ctrl+]', category: 'navigation' },
  { id: 'nav-parent', label: 'Go to parent', description: 'Navigate up to the parent board', defaultKey: 'Ctrl+U', category: 'navigation' },
]

const STORAGE_KEY = 'canvas-hotkey-overrides'

export function loadHotkeyOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveHotkeyOverride(id: string, key: string) {
  const overrides = loadHotkeyOverrides()
  overrides[id] = key
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function resetHotkeyOverride(id: string) {
  const overrides = loadHotkeyOverrides()
  delete overrides[id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function getEffectiveKey(def: HotkeyDef, overrides: Record<string, string>): string {
  return overrides[def.id] ?? def.defaultKey
}

export const CATEGORY_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  tools: 'Tools',
  selection: 'Selection & editing',
  text: 'Text editing (inside notes)',
  navigation: 'Navigation',
}
