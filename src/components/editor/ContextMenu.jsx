import { useState, useEffect, useRef } from 'react'

export function useContextMenu() {
  const [pos, setPos] = useState(null)

  function onContextMenu(e) {
    e.preventDefault()
    setPos({ x: e.clientX, y: e.clientY })
  }

  function close() {
    setPos(null)
  }

  return { pos, onContextMenu, close, isOpen: pos !== null }
}

export default function ContextMenu({ pos, items = [], onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (!pos) return null

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] py-0.5 shadow-lg shadow-black/40 min-w-[150px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-0.5 h-px bg-[#3b3b3b]" />
        ) : (
          <button
            key={i}
            type="button"
            className={`w-full text-left px-2.5 py-[3px] text-[11px] cursor-default select-none flex justify-between items-center ${
              item.disabled ? 'text-[#666666] pointer-events-none' : 'text-[#cccccc] hover:bg-[#404040]'
            }`}
            onClick={() => {
              item.action?.()
              onClose()
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[#666666] text-[10px] ml-4">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  )
}
