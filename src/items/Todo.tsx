import React, { useState, useRef } from 'react'
import { type Item } from '../db/db'
import { useStore } from '../state/store'
import { CardShell } from './CardShell'
import { newId } from '../lib/ids'

interface Task { id: string; done: boolean; text: string }

interface Props {
  item: Item
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  zoom: number
}

export function TodoCard({ item, isSelected, onPointerDown, onPointerMove, onPointerUp, zoom }: Props) {
  const updateItem = useStore(s => s.updateItem)
  const content = item.content as { title: string; tasks: Task[] }
  const tasks: Task[] = content?.tasks ?? []

  const setTasks = (next: Task[]) => {
    updateItem(item.id, { content: { ...content, tasks: next } }, true)
  }
  const setTitle = (title: string) => {
    updateItem(item.id, { content: { ...content, title } }, true)
  }

  const toggleDone = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const setText = (id: string, text: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text } : t))
  }
  const addTask = () => {
    setTasks([...tasks, { id: newId(), done: false, text: '' }])
  }

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const newTasks = [...tasks]
      newTasks.splice(idx + 1, 0, { id: newId(), done: false, text: '' })
      setTasks(newTasks)
    }
  }

  return (
    <CardShell
      item={item} isSelected={isSelected}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      zoom={zoom} minW={160} minH={80}
      className="overflow-hidden flex flex-col"
    >
      <div onPointerDown={e => e.stopPropagation()} className="p-2 flex flex-col h-full">
        <input
          className="font-semibold text-sm text-text-primary bg-transparent border-none outline-none mb-1 w-full"
          value={content?.title ?? 'To-do'}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
        />
        <div className="flex-1 overflow-auto space-y-0.5">
          {tasks.map((task, idx) => (
            <div key={task.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task.id)}
                className="flex-shrink-0 accent-accent"
              />
              <input
                className={`flex-1 text-sm bg-transparent outline-none border-none ${task.done ? 'line-through text-text-muted' : 'text-text-primary'}`}
                value={task.text}
                onChange={e => setText(task.id, e.target.value)}
                onKeyDown={e => onKeyDown(e, idx)}
                placeholder="Add a task…"
              />
            </div>
          ))}
          <button
            className="text-xs text-text-muted hover:text-text-primary mt-1"
            onClick={addTask}
          >
            + Add a task
          </button>
        </div>
      </div>
    </CardShell>
  )
}
