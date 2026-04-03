import { useState, useRef } from 'react'

export default function Tooltip({ children, content, shortcut, description, position = 'top', className = '' }) {
  const [show, setShow] = useState(false)
  const timeout = useRef(null)

  function handleEnter() {
    timeout.current = setTimeout(() => setShow(true), 400)
  }

  function handleLeave() {
    clearTimeout(timeout.current)
    setShow(false)
  }

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  const isRich = description || shortcut

  return (
    <div className={`relative inline-flex ${className}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div
          className={`absolute z-50 bg-[#1e1e1e] border border-[#3b3b3b] rounded-[3px] shadow-lg shadow-black/40 pointer-events-none ${isRich ? 'px-2.5 py-1.5 min-w-[140px]' : 'px-2 py-1'} ${posClasses[position]}`}
        >
          <div className="text-[11px] text-[#cccccc] whitespace-nowrap">{content}</div>
          {description && <div className="text-[10px] text-[#999999] mt-0.5">{description}</div>}
          {shortcut && <div className="text-[10px] text-[#666666] mt-0.5">{shortcut}</div>}
        </div>
      )}
    </div>
  )
}
