import Dexie, { type Table } from 'dexie'

export type BoardId = string
export type ItemId = string

export interface Board {
  id: BoardId
  title: string
  color: string
  parentId: BoardId | null
  viewport: { panX: number; panY: number; zoom: number }
  createdAt: number
  updatedAt: number
}

export type ItemType =
  | 'note' | 'board' | 'todo' | 'link' | 'image' | 'file'
  | 'table' | 'column' | 'line' | 'comment'

export interface Item {
  id: ItemId
  boardId: BoardId
  type: ItemType
  x: number
  y: number
  w: number
  h: number
  z: number
  childBoardId?: BoardId
  content?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface BlobEntry {
  key: string
  data: Blob
}

class CanvasDB extends Dexie {
  boards!: Table<Board>
  items!: Table<Item>
  blobs!: Table<BlobEntry>

  constructor() {
    super('CanvasDB')
    this.version(1).stores({
      boards: 'id, parentId',
      items: 'id, boardId, type',
      blobs: 'key',
    })
  }
}

export const db = new CanvasDB()
