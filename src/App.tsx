import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './state/store'
import { seedHomeBoard, loadAllBoards, loadAllItems } from './db/persistence'
import { HOME_BOARD_ID } from './lib/ids'
import { BoardView } from './routes/BoardView'

export default function App() {
  const setBoards = useStore(s => s.setBoards)
  const setItems = useStore(s => s.setItems)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      await seedHomeBoard()
      const [boards, items] = await Promise.all([loadAllBoards(), loadAllItems()])
      setBoards(boards)
      setItems(items)
      setReady(true)
    }
    init()
  }, [])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas-bg">
        <div className="text-text-muted text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/b/${HOME_BOARD_ID}`} replace />} />
        <Route path="/b/:boardId" element={<BoardView />} />
      </Routes>
    </BrowserRouter>
  )
}
