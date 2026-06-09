import { type Item } from '../db/db'
import { saveItem, deleteItem } from '../db/persistence'

type HistoryEntry =
  | { type: 'create'; item: Item }
  | { type: 'delete'; item: Item }
  | { type: 'delete-multi'; items: Item[] }
  | { type: 'update'; before: Item; after: Item }
  | { type: 'update-multi'; befores: Item[]; afters: Item[] }
  | { type: 'move-multi'; befores: Item[]; afters: Item[] }

const LS_KEY = 'canvas:history-v2'
const MAX_ENTRIES = 50
const MAX_BYTES = 512 * 1024

const undoStacks = new Map<string, HistoryEntry[]>()
const redoStacks = new Map<string, HistoryEntry[]>()

function getUndoStack(boardId: string): HistoryEntry[] {
  if (!undoStacks.has(boardId)) undoStacks.set(boardId, [])
  return undoStacks.get(boardId)!
}

function getRedoStack(boardId: string): HistoryEntry[] {
  if (!redoStacks.has(boardId)) redoStacks.set(boardId, [])
  return redoStacks.get(boardId)!
}

// Load persisted history on module init
try {
  const raw = localStorage.getItem(LS_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as Record<string, { undo: HistoryEntry[]; redo: HistoryEntry[] }>
    for (const [boardId, stacks] of Object.entries(parsed)) {
      if (Array.isArray(stacks.undo)) undoStacks.set(boardId, stacks.undo)
      if (Array.isArray(stacks.redo)) redoStacks.set(boardId, stacks.redo)
    }
  }
} catch {
  // corrupt or missing — start fresh
}

let notifyFn: ((boardId: string, undo: number, redo: number) => void) | null = null

export function registerHistoryNotify(fn: (boardId: string, undo: number, redo: number) => void) {
  notifyFn = fn
}

export function getHistoryCounts(boardId: string) {
  return {
    undo: undoStacks.get(boardId)?.length ?? 0,
    redo: redoStacks.get(boardId)?.length ?? 0,
  }
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
    const data: Record<string, { undo: HistoryEntry[]; redo: HistoryEntry[] }> = {}
    const allBoardIds = new Set([...undoStacks.keys(), ...redoStacks.keys()])
    for (const boardId of allBoardIds) {
      const undo = (undoStacks.get(boardId) ?? []).filter(isEntryStorable).slice(-MAX_ENTRIES)
      const redo = (redoStacks.get(boardId) ?? []).filter(isEntryStorable).slice(-MAX_ENTRIES)
      if (undo.length > 0 || redo.length > 0) data[boardId] = { undo, redo }
    }
    const json = JSON.stringify(data)
    if (json.length > MAX_BYTES) {
      for (const boardId of Object.keys(data)) {
        data[boardId] = { undo: data[boardId].undo.slice(-10), redo: data[boardId].redo.slice(-10) }
      }
      localStorage.setItem(LS_KEY, JSON.stringify(data))
    } else {
      localStorage.setItem(LS_KEY, json)
    }
  } catch {
    // quota exceeded or private mode — ignore
  }
}

function notify(boardId: string) {
  notifyFn?.(boardId, getUndoStack(boardId).length, getRedoStack(boardId).length)
  persist()
}

export function pushHistory(entry: HistoryEntry, boardId: string) {
  const stack = getUndoStack(boardId)
  stack.push(entry)
  if (stack.length > MAX_ENTRIES) stack.shift()
  getRedoStack(boardId).length = 0
  notify(boardId)
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

export function undoHistory(boardId: string, get: GetFn, set: SetFn) {
  const undoStack = getUndoStack(boardId)
  const redoStack = getRedoStack(boardId)
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

export function redoHistory(boardId: string, get: GetFn, set: SetFn) {
  const undoStack = getUndoStack(boardId)
  const redoStack = getRedoStack(boardId)
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
