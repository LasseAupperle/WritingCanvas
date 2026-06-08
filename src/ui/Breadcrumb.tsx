import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store'
import { HOME_BOARD_ID } from '../lib/ids'
import { ChevronRight } from 'lucide-react'

interface Props { boardId: string }

export function Breadcrumb({ boardId }: Props) {
  const navigate = useNavigate()
  const getBoardAncestors = useStore(s => s.getBoardAncestors)
  const ancestors = getBoardAncestors(boardId)

  return (
    <div className="flex items-center gap-1 text-sm text-text-muted overflow-hidden">
      {ancestors.map((board, i) => (
        <React.Fragment key={board.id}>
          {i > 0 && <ChevronRight size={12} className="flex-shrink-0 opacity-50" />}
          <button
            className={`flex items-center gap-1 hover:text-text-primary truncate max-w-[120px] ${
              i === ancestors.length - 1 ? 'text-text-primary font-semibold' : ''
            }`}
            onClick={() => navigate(board.id === HOME_BOARD_ID ? '/' : `/b/${board.id}`)}
          >
            {board.parentId !== null && (
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: board.color }}
              />
            )}
            <span className="truncate">{board.title || 'Untitled'}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}
