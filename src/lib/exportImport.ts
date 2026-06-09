import type { Board, Item } from '../db/db'
import { loadBlob, saveBlob, saveBoard, saveItem } from '../db/persistence'
import { newId } from './ids'

export interface CanvasFile {
  version: 1
  exportedAt: number
  board: Board
  items: Item[]
  blobs: Record<string, string> // blobKey -> dataUrl string
  children?: CanvasFile[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream'
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

async function collectBoardBlobs(items: Item[]): Promise<Record<string, string>> {
  const blobs: Record<string, string> = {}
  for (const item of items) {
    const blobKey = (item.content as Record<string, unknown>)?.['blobKey'] as string | undefined
    if (blobKey) {
      const blob = await loadBlob(blobKey)
      if (blob) blobs[blobKey] = await blobToDataUrl(blob)
    }
  }
  return blobs
}

async function buildCanvasFile(
  board: Board,
  allItems: Item[],
  allBoards: Record<string, Board>,
  includeChildren: boolean,
): Promise<CanvasFile> {
  const boardItems = allItems.filter(i => i.boardId === board.id)
  const blobs = await collectBoardBlobs(boardItems)

  const file: CanvasFile = {
    version: 1,
    exportedAt: Date.now(),
    board,
    items: boardItems,
    blobs,
  }

  if (includeChildren) {
    const children: CanvasFile[] = []
    for (const item of boardItems) {
      if (item.type === 'board' && item.childBoardId) {
        const childBoard = allBoards[item.childBoardId]
        if (childBoard) {
          children.push(await buildCanvasFile(childBoard, allItems, allBoards, true))
        }
      }
    }
    if (children.length > 0) file.children = children
  }

  return file
}

export async function exportBoard(
  board: Board,
  allItems: Item[],
  allBoards: Record<string, Board>,
  includeChildren: boolean,
): Promise<void> {
  const file = await buildCanvasFile(board, allItems, allBoards, includeChildren)
  const json = JSON.stringify(file, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = board.title.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'board'
  a.download = `${safeName}.canvas`
  a.click()
  URL.revokeObjectURL(url)
}

interface RemapContext {
  boardIdMap: Record<string, string>
  itemIdMap: Record<string, string>
  blobKeyMap: Record<string, string>
}

function remapBoard(ctx: RemapContext, oldId: string): string {
  if (!ctx.boardIdMap[oldId]) ctx.boardIdMap[oldId] = newId()
  return ctx.boardIdMap[oldId]
}

function remapItem(ctx: RemapContext, oldId: string): string {
  if (!ctx.itemIdMap[oldId]) ctx.itemIdMap[oldId] = newId()
  return ctx.itemIdMap[oldId]
}

function remapBlob(ctx: RemapContext, oldKey: string): string {
  if (!ctx.blobKeyMap[oldKey]) ctx.blobKeyMap[oldKey] = newId()
  return ctx.blobKeyMap[oldKey]
}

async function importCanvasFile(
  file: CanvasFile,
  ctx: RemapContext,
  parentBoardId: string,
): Promise<{ board: Board; items: Item[] }> {
  const now = Date.now()
  const newBoardId = remapBoard(ctx, file.board.id)

  const newBoard: Board = {
    ...file.board,
    id: newBoardId,
    parentId: parentBoardId,
    createdAt: now,
    updatedAt: now,
  }

  // Save blobs
  for (const [oldKey, dataUrl] of Object.entries(file.blobs)) {
    const newKey = remapBlob(ctx, oldKey)
    const blob = dataUrlToBlob(dataUrl)
    await saveBlob(newKey, blob)
  }

  // Remap items
  const newItems: Item[] = file.items.map(item => {
    const newItemId = remapItem(ctx, item.id)
    const content = { ...(item.content as Record<string, unknown>) }

    // Remap blobKey in content
    if (content['blobKey']) {
      content['blobKey'] = remapBlob(ctx, content['blobKey'] as string)
    }

    // Remap childBoardId for board items
    const newChildBoardId = item.childBoardId ? remapBoard(ctx, item.childBoardId) : undefined

    return {
      ...item,
      id: newItemId,
      boardId: newBoardId,
      childBoardId: newChildBoardId,
      content,
      createdAt: now,
      updatedAt: now,
    }
  })

  // Save board and items
  await saveBoard(newBoard)
  for (const item of newItems) await saveItem(item)

  // Recurse into children
  const allNewItems = [...newItems]
  if (file.children) {
    for (const child of file.children) {
      const result = await importCanvasFile(child, ctx, newBoardId)
      allNewItems.push(...result.items)
    }
  }

  return { board: newBoard, items: allNewItems }
}

export async function importCanvas(
  file: CanvasFile,
  existingBoards: Board[],
  existingItems: Item[],
  targetBoardId: string,
): Promise<{
  newBoards: Board[]
  newItems: Item[]
  rootBoardId: string
  boardItemId: string
}> {
  const ctx: RemapContext = { boardIdMap: {}, itemIdMap: {}, blobKeyMap: {} }

  // We want the imported root board to live under the target board
  const { board: rootBoard, items: importedItems } = await importCanvasFile(file, ctx, targetBoardId)

  // Collect all newly created boards from the remapped IDs
  const newBoardIds = new Set(Object.values(ctx.boardIdMap))
  const allNewBoards: Board[] = []

  // Load all remapped boards from IndexedDB is complex; we track them in importCanvasFile instead
  // Re-derive from ctx: all boards that got new IDs
  // Actually we only have rootBoard returned; for children we need to query or return differently
  // Simpler: reload all boards after import
  // But for store update we need the list. Let's collect boards recursively.

  async function collectBoards(f: CanvasFile, parentId: string): Promise<Board[]> {
    const bid = ctx.boardIdMap[f.board.id]
    const b: Board = { ...f.board, id: bid, parentId, createdAt: Date.now(), updatedAt: Date.now() }
    const result = [b]
    if (f.children) {
      for (const child of f.children) {
        result.push(...(await collectBoards(child, bid)))
      }
    }
    return result
  }

  const newBoards = await collectBoards(file, targetBoardId)

  // Create a Board item on the target board that links to the imported root board
  const boardItemId = newId()
  const now = Date.now()
  const boardItem: Item = {
    id: boardItemId,
    boardId: targetBoardId,
    type: 'board',
    x: 100,
    y: 100,
    w: 240,
    h: 160,
    z: (existingItems.filter(i => i.boardId === targetBoardId).length + 1),
    childBoardId: rootBoard.id,
    content: {},
    createdAt: now,
    updatedAt: now,
  }
  await saveItem(boardItem)

  return {
    newBoards,
    newItems: [...importedItems, boardItem],
    rootBoardId: rootBoard.id,
    boardItemId,
  }
}
