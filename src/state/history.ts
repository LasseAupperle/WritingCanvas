import { type Item } from '../db/db'
import { saveItem, deleteItem } from '../db/persistence'

type HistoryEntry =
  | { type: 'create'; item: Item }
  | { type: 'delete'; item: Item }
  | { type: 'delete-multi'; items: Item[] }
  | { type: 'update'; before: Item; after: Item }
  | { type: 'update-multi'; befores: Item[]; afters: Item[] }
  | { type: 'move-multi'; befores: Item[]; afters: Item[] }

const LS_KEY = 'canvas:history'
const MAX_ENTRIES = 50
const MAX_BYTES = 512 * 1024 // 512 KB cap before giving up on persist

let undoStack: HistoryEntry[] = []
let redoStack: HistoryEntry[] = []

// Load persisted history on module init
try {
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as { undo: HistoryEntry[]; redo: HistoryEntry[] }
    undoStack = parsed.undo ?? []
    redoStack = parsed.redo ?? []
  }
} catch {
  // corrupt or missing — start fresh
}

let notifyFn: ((undo: number, redo: number) => void) | null = null

export function registerHistoryNotify(fn: (undo: number, redo: number) => void) {
  notifyFn = fn
}

export function getHistoryCounts() {
  return { undo: undoStack.length, redo: redoStack.length }
}

function hasLargeContent(item: Item) {
  const c = item.content
  if (!c) return false
  // Skip drawing dataUrls (can be hundreds of KB each)
  if (typeof c['dataUrl'] === 'string' && (c['dataUrl'] as string).length > 10_000) return true
  return false
}

function isEntryStorable(entry: HistoryEntry): boolean {
  const items: Item[] = []
  if ('item' in entry) items.push(entry.item)
  if ('items' in entry) items.push(...(entry as { items: Item[] }).items)
  if ('before' in entry) items.push((entry as { before: Item }).before)
  if ('after' in entry) items.push((entry as { after: Item }).after)
  if ('befores' in entry) items.push(...(entry as { befores: Item[] }).befores)
  if ('afters' in entry) items.push(...(entry as { afters: Item[] }).afters)
  return !items.some(hasLargeContent)
}

function persist() {
  try {
    const storableUndo = undoStack.filter(isEntryStorable).slice(-MAX_ENTRIES)
    const storableRedo = redoStack.filter(isEntryStorable).slice(-MAX_ENTRIES)
    const json = JSON.stringify({ undo: storableUndo, redo: storableRedo })
    if (json.length > MAX_BYTES) {
      // Too large — trim further
      const trimmed = JSON.stringify({ undo: storableUndo.slice(-10), redo: storableRedo.slice(-10) })
      localStorage.setItem(LS_KEY, trimmed)
    } else {
      localStorage.setItem(LS_KEY, json)
    }
  } catch {
    // quota exceeded or private mode — ignore
  }
}

function notify() {
  notifyFn?.(undoStack.length, redoStack.length)
  persist()
}

export function pushHistory(entry: HistoryEntry) {
  undoStack.push(entry)
  redoStack.length = 0
  notify()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetFn = (fn: (state: any) => any) => void
type GetFn = () => { items: Record<string, Item> }

function applyItems(items: Item[], set: SetFn) {
  set(state => ({
    ...state,
    items: {
      ...state.items,
      ...Object.fromEntries(items.map(i => [i.id, i])),
    },
  }))
  for (const item of items) saveItem(item)
}

function removeItems(ids: string[], set: SetFn) {
  set(state => {
    const newItems = { ...state.items }
    for (const id of ids) delete newItems[id]
    return { ...state, items: newItems }
  })
  for (const id of ids) deleteItem(id)
}

export function undoHistory(get: GetFn, set: SetFn) {
  const entry = undoStack.pop()
  if (!entry) return
  redoStack.push(entry)

  if (entry.type === 'create') {
    removeItems([entry.item.id], set)
  } else if (entry.type === 'delete') {
    applyItems([entry.item], set)
  } else if (entry.type === 'delete-multi') {
    applyItems(entry.items, set)
  } else if (entry.type === 'update') {
    applyItems([entry.before], set)
  } else if (entry.type === 'update-multi' || entry.type === 'move-multi') {
    applyItems(entry.befores, set)
  }
  // notify called by store after this returns
}

export function redoHistory(get: GetFn, set: SetFn) {
  const entry = redoStack.pop()
  if (!entry) return
  undoStack.push(entry)

  if (entry.type === 'create') {
    applyItems([entry.item], set)
  } else if (entry.type === 'delete') {
    removeItems([entry.item.id], set)
  } else if (entry.type === 'delete-multi') {
    removeItems(entry.items.map(i => i.id), set)
  } else if (entry.type === 'update') {
    applyItems([entry.after], set)
  } else if (entry.type === 'update-multi' || entry.type === 'move-multi') {
    applyItems(entry.afters, set)
  }
  // notify called by store after this returns
}
