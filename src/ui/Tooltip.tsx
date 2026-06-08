import React, { useState, useRef, useCallback } from 'react'

interface Props {
  content: React.ReactNode
  children: React.ReactElement
  delay?: number
  side?: 'right' | 'top' | 'bottom'
}

export function Tooltip({ content, children, delay = 600, side = 'right' }: Props) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }, [])

  const sideStyle: React.CSSProperties =
    side === 'right'
      ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
      : side === 'top'
        ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
        : { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className="absolute z-[100] pointer-events-none"
          style={sideStyle}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-2.5 min-w-[160px] max-w-[220px] text-left">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

interface ToolTipContentProps {
  name: string
  description: string
  shortcut?: string
  tip?: string
}

export function ToolTooltipContent({ name, description, shortcut, tip }: ToolTipContentProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-xs text-white">{name}</span>
        {shortcut && (
          <kbd className="text-[10px] bg-white/20 px-1 py-0.5 rounded font-mono text-white/80">{shortcut}</kbd>
        )}
      </div>
      <p className="text-[11px] text-white/75 leading-snug">{description}</p>
      {tip && <p className="text-[11px] text-white/50 leading-snug italic">{tip}</p>}
    </div>
  )
}
