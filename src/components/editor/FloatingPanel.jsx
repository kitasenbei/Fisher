import { useRef, useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function FloatingPanel({
  children,
  title = '',
  onClose,
  defaultX = 100,
  defaultY = 100,
  defaultWidth = 640,
  defaultHeight = 480,
}) {
  const panelRef = useRef(null)
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight })
  const dragRef = useRef(null)
  const resizeRef = useRef(null)

  useEffect(() => {
    function onMove(e) {
      if (dragRef.current) {
        setPos({
          x: e.clientX - dragRef.current.ox,
          y: e.clientY - dragRef.current.oy,
        })
      }
      if (resizeRef.current) {
        setSize({
          w: Math.max(200, resizeRef.current.ow + (e.clientX - resizeRef.current.sx)),
          h: Math.max(120, resizeRef.current.oh + (e.clientY - resizeRef.current.sy)),
        })
      }
    }
    function onUp() {
      dragRef.current = null
      resizeRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex flex-col bg-[#2b2b2b] border border-[#1e1e1e] rounded-[4px] shadow-xl shadow-black/50 overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Title bar / drag handle */}
      <div
        className="h-6 flex items-center px-2 bg-[#353535] border-b border-[#1e1e1e] cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={(e) => {
          dragRef.current = { ox: e.clientX - pos.x, oy: e.clientY - pos.y }
        }}
      >
        <span className="text-[10px] text-[#999999] flex-1 truncate">{title}</span>
        <button
          className="w-4 h-4 flex items-center justify-center text-[#666666] hover:text-[#cccccc] cursor-default"
          onClick={onClose}
        >
          <X size={10} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">{children}</div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize"
        onMouseDown={(e) => {
          resizeRef.current = { sx: e.clientX, sy: e.clientY, ow: size.w, oh: size.h }
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="absolute bottom-0.5 right-0.5 text-[#555555]">
          <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
