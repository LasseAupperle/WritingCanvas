import { create } from 'zustand'
import { type Board, type Item, type ItemType } from '../db/db'
import {
  saveBoard, saveItem, deleteItem, deleteBoard,
  debouncedSaveItem,
} from '../db/persistence'
import { newId } from '../lib/ids'
import { DEFAULT_ZOOM } from '../lib/constants'
import { pushHistory, undoHistory, redoHistory, getHistoryCounts, registerHistoryNotify } from './history'

export type ArmedTool = ItemType | 'line-start' | null

export interface ViewportState {
  panX: number
  panY: number
  zoom: number
}

export interface AppState {
  // data
  boards: Record<string, Board>
  items: Record<string, Item>

  // ui
  currentBoardId: string
  selectedIds: Set<string>
  armedTool: ArmedTool
  lineDrawState: null | { x1: number; y1: number }
  snapToGrid: boolean
  showGrid: boolean
  smartGuides: boolean
  unsortedOpen: boolean
  searchOpen: boolean
  inAppClipboard: Item[]
  dragOverTrash: boolean

  // actions
  setBoards: (boards: Board[]) => void
  setItems: (items: Item[]) => void
  setCurrentBoard: (id: string) => void
  setSelectedIds: (ids: Set<string>) => void
  addToSelection: (id: string) => void
  clearSelection: () => void

  createItem: (partial: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'z'> & { z?: number }) => Item
  updateItem: (id: string, patch: Partial<Item>, debounce?: boolean) => void
  removeItem: (id: string) => void
  removeItems: (ids: string[]) => void

  createBoard: (partial: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>) => Board
  updateBoard: (id: string, patch: Partial<Board>) => void
  removeBoard: (id: string) => void

  setViewport: (boardId: string, vp: ViewportState) => void
  setArmedTool: (tool: ArmedTool) => void
  setLineDrawState: (state: null | { x1: number; y1: number }) => void
  setSnapToGrid: (v: boolean) => void
  setShowGrid: (v: boolean) => void
  setSmartGuides: (v: boolean) => void
  setUnsortedOpen: (v: boolean) => void
  setSearchOpen: (v: boolean) => void
  setInAppClipboard: (items: Item[]) => void
  setDragOverTrash: (v: boolean) => void
  undoCount: number
  redoCount: number

  undo: () => void
  redo: () => void
  setHistoryCounts: (undo: number, redo: number) => void

  getBoardItems: (boardId: string) => Item[]
  getBoardAncestors: (boardId: string) => Board[]
  getMaxZ: (boardId: string) => number
}

export const useStore = create<AppState>((set, get) => ({
  boards: {},
  items: {},
  currentBoardId: '',
  selectedIds: new Set(),
  armedTool: null,
  lineDrawState: null,
  snapToGrid: false,
  showGrid: false,
  smartGuides: true,
  unsortedOpen: false,
  searchOpen: false,
  inAppClipboard: [],
  dragOverTrash: false,
  undoCount: 0,
  redoCount: 0,

  setHistoryCounts: (undo, redo) => set({ undoCount: undo, redoCount: redo }),

  setBoards: (boards) =>
    set({ boards: Object.fromEntries(boards.map(b => [b.id, b])) }),

  setItems: (items) =>
    set({ items: Object.fromEntries(items.map(i => [i.id, i])) }),

  setCurrentBoard: (id) => {
    const counts = getHistoryCounts(id)
    set({ currentBoardId: id, selectedIds: new Set(), undoCount: counts.undo, redoCount: counts.redo })
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  addToSelection: (id) => {
    const ids = new Set(get().selectedIds)
    ids.add(id)
    set({ selectedIds: ids })
  },
  clearSelection: () => set({ selectedIds: new Set() }),

  createItem: (partial) => {
    const id = newId()
    const now = Date.now()
    const maxZ = get().getMaxZ(partial.boardId)
    const item: Item = {
      id,
      z: maxZ + 1,
      createdAt: now,
      updatedAt: now,
      ...partial,
    } as Item
    set(state => ({ items: { ...state.items, [id]: item } }))
    saveItem(item)
    pushHistory({ type: 'create', item }, item.boardId)
    return item
  },

  updateItem: (id, patch, debounce = false) => {
    const existing = get().items[id]
    if (!existing) return
    const updated = { ...existing, ...patch, updatedAt: Date.now() }
    set(state => ({ items: { ...state.items, [id]: updated } }))
    if (debounce) debouncedSaveItem(updated)
    else saveItem(updated)
  },

  removeItem: (id) => {
    const item = get().items[id]
    if (!item) return
    set(state => {
      const items = { ...state.items }
      delete items[id]
      const boards = item.type === 'board' && item.childBoardId
        ? (() => { const b = { ...state.boards }; delete b[item.childBoardId!]; return b })()
        : state.boards
      return { items, boards }
    })
    deleteItem(id)
    if (item.type === 'board' && item.childBoardId) deleteBoard(item.childBoardId)
    pushHistory({ type: 'delete', item }, item.boardId)
  },

  removeItems: (ids) => {
    const items = ids.map(id => get().items[id]).filter(Boolean) as Item[]
    const boardChildIds = items
      .filter(i => i.type === 'board' && i.childBoardId)
      .map(i => i.childBoardId!)
    set(state => {
      const newItems = { ...state.items }
      const newBoards = { ...state.boards }
      for (const id of ids) delete newItems[id]
      for (const boardId of boardChildIds) delete newBoards[boardId]
      return { items: newItems, boards: newBoards, selectedIds: new Set() }
    })
    for (const id of ids) deleteItem(id)
    for (const boardId of boardChildIds) deleteBoard(boardId)
    if (items.length > 0) pushHistory({ type: 'delete-multi', items }, items[0].boardId)
  },

  createBoard: (partial) => {
    const id = newId()
    const now = Date.now()
    const board: Board = { id, createdAt: now, updatedAt: now, ...partial }
    set(state => ({ boards: { ...state.boards, [id]: board } }))
    saveBoard(board)
    return board
  },

  updateBoard: (id, patch) => {
    const existing = get().boards[id]
    if (!existing) return
    const updated = { ...existing, ...patch, updatedAt: Date.now() }
    set(state => ({ boards: { ...state.boards, [id]: updated } }))
    saveBoard(updated)
  },

  removeBoard: (id) => {
    set(state => {
      const boards = { ...state.boards }
      delete boards[id]
      return { boards }
    })
    deleteBoard(id)
  },

  setViewport: (boardId, vp) => {
    const board = get().boards[boardId]
    if (!board) return
    const updated = { ...board, viewport: vp, updatedAt: Date.now() }
    set(state => ({ boards: { ...state.boards, [boardId]: updated } }))
    saveBoard(updated)
  },

  setArmedTool: (tool) => set({ armedTool: tool, lineDrawState: null }),
  setLineDrawState: (state) => set({ lineDrawState: state }),
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setSmartGuides: (v) => set({ smartGuides: v }),
  setUnsortedOpen: (v) => set({ unsortedOpen: v }),
  setSearchOpen: (v) => set({ searchOpen: v }),
  setInAppClipboard: (items) => set({ inAppClipboard: items }),
  setDragOverTrash: (v) => set({ dragOverTrash: v }),

  undo: () => {
    const { currentBoardId } = get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    undoHistory(currentBoardId, get as any, set as any)
    const counts = getHistoryCounts(currentBoardId)
    set({ undoCount: counts.undo, redoCount: counts.redo })
  },
  redo: () => {
    const { currentBoardId } = get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redoHistory(currentBoardId, get as any, set as any)
    const counts = getHistoryCounts(currentBoardId)
    set({ undoCount: counts.undo, redoCount: counts.redo })
  },

  getBoardItems: (boardId) =>
    Object.values(get().items).filter(i => i.boardId === boardId),

  getBoardAncestors: (boardId) => {
    const { boards } = get()
    const path: Board[] = []
    let current = boards[boardId]
    while (current) {
      path.unshift(current)
      if (!current.parentId) break
      current = boards[current.parentId]
    }
    return path
  },

  getMaxZ: (boardId) => {
    const items = Object.values(get().items).filter(i => i.boardId === boardId)
    return items.length ? Math.max(...items.map(i => i.z)) : 0
  },
}))

// Keep undoCount/redoCount in sync whenever pushHistory is called from outside store actions
registerHistoryNotify((boardId, undo, redo) => {
  if (boardId === useStore.getState().currentBoardId) {
    useStore.getState().setHistoryCounts(undo, redo)
  }
})

export const getViewport = (state: AppState): ViewportState => {
  const board = state.boards[state.currentBoardId]
  return board?.viewport ?? { panX: 0, panY: 0, zoom: DEFAULT_ZOOM }
}
