import { type Item } from '../db/db'
import { saveItem, deleteItem } from '../db/persistence'

type HistoryEntry =
  | { type: 'create'; item: Item }
  | { type: 'delete'; item: Item }
  | { type: 'delete-multi'; items: Item[] }
  | { type: 'update'; before: Item; after: Item }
  | { type: 'update-multi'; befores: Item[]; afters: Item[] }
  | { type: 'move-multi'; befores: Item[]; afters: Item[] }

const undoStack: HistoryEntry[] = []
const redoStack: HistoryEntry[] = []

export function pushHistory(entry: HistoryEntry) {
  undoStack.push(entry)
  redoStack.length = 0
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
}
