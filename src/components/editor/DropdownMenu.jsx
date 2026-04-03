import { useState, useRef, useEffect } from 'react'

export default function DropdownMenu({ trigger, items = [], align = 'down', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={`absolute z-50 bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] py-0.5 shadow-lg shadow-black/40 min-w-[150px] ${
          align === 'up' ? 'bottom-full mb-0.5 right-0' : 'left-0 mt-0.5'
        }`}>
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="my-0.5 h-px bg-[#3b3b3b]" />
            ) : (
              <button
                key={i}
                type="button"
                className={`w-full text-left px-2.5 py-[3px] text-[11px] cursor-default select-none flex justify-between items-center ${
                  item.disabled
                    ? 'text-[#666666] pointer-events-none'
                    : 'text-[#cccccc] hover:bg-[#404040]'
                }`}
                onClick={() => { item.action?.(); setOpen(false) }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="text-[#666666] text-[10px] ml-4">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
