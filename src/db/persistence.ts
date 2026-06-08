import { db, type Board, type Item } from './db'
import { HOME_BOARD_ID } from '../lib/ids'

export async function seedHomeBoard(): Promise<void> {
  const existing = await db.boards.get(HOME_BOARD_ID)
  if (existing) return
  const now = Date.now()
  await db.boards.add({
    id: HOME_BOARD_ID,
    title: 'Home',
    color: '#2D7FF9',
    parentId: null,
    viewport: { panX: 0, panY: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  })
}

export async function loadBoard(boardId: string): Promise<Board | undefined> {
  return db.boards.get(boardId)
}

export async function loadItems(boardId: string): Promise<Item[]> {
  return db.items.where('boardId').equals(boardId).toArray()
}

export async function loadAllBoards(): Promise<Board[]> {
  return db.boards.toArray()
}

export async function loadAllItems(): Promise<Item[]> {
  return db.items.toArray()
}

export async function saveBoard(board: Board): Promise<void> {
  await db.boards.put({ ...board, updatedAt: Date.now() })
}

export async function saveItem(item: Item): Promise<void> {
  await db.items.put({ ...item, updatedAt: Date.now() })
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id)
}

export async function deleteBoard(id: string): Promise<void> {
  await db.boards.delete(id)
}

export async function saveBlob(key: string, data: Blob): Promise<void> {
  await db.blobs.put({ key, data })
}

export async function loadBlob(key: string): Promise<Blob | undefined> {
  const entry = await db.blobs.get(key)
  return entry?.data
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function debouncedSaveItem(item: Item, ms = 300): void {
  const existing = debounceTimers.get(item.id)
  if (existing) clearTimeout(existing)
  debounceTimers.set(item.id, setTimeout(() => {
    debounceTimers.delete(item.id)
    saveItem(item)
  }, ms))
}
