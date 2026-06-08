import React from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function TableCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { columns: string[]; rows: string[][] }
  const cols = content?.columns ?? ['Col 1', 'Col 2']
  const rows = content?.rows ?? [['']]

  const update = (c: string[], r: string[][]) => {
    updateItem(item.id, { content: { columns: c, rows: r } }, true)
  }

  const setCol = (i: number, val: string) => {
    const nc = [...cols]; nc[i] = val; update(nc, rows)
  }
  const setCell = (ri: number, ci: number, val: string) => {
    const nr = rows.map(r => [...r]); nr[ri][ci] = val; update(cols, nr)
  }
  const addCol = () => {
    update([...cols, `Col ${cols.length + 1}`], rows.map(r => [...r, '']))
  }
  const addRow = () => {
    update(cols, [...rows, cols.map(() => '')])
  }
  const delRow = (i: number) => {
    update(cols, rows.filter((_, idx) => idx !== i))
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={200} minH={100}
      className="overflow-auto"
    >
      <div onPointerDown={e => e.stopPropagation()} className="p-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {cols.map((col, ci) => (
                <th key={ci} className="border border-card-border p-1">
                  <input
                    className="w-full font-semibold bg-transparent outline-none text-text-primary"
                    value={col}
                    onChange={e => setCol(ci, e.target.value)}
                  />
                </th>
              ))}
              <th className="w-6">
                <button onClick={addCol} className="text-text-muted hover:text-text-primary">
                  <PlusIcon size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group">
                {cols.map((_, ci) => (
                  <td key={ci} className="border border-card-border p-1">
                    <input
                      className="w-full bg-transparent outline-none text-text-primary"
                      value={row[ci] ?? ''}
                      onChange={e => setCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="w-6 opacity-0 group-hover:opacity-100">
                  <button onClick={() => delRow(ri)} className="text-text-muted hover:text-red-500">
                    <Trash2Icon size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="mt-1 text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
        >
          <PlusIcon size={12} /> Add row
        </button>
      </div>
    </CardShell>
  )
}
