import { useState, useRef, useEffect } from 'react'

export default function MenuBar({ menus = [], className = '' }) {
  const [openIndex, setOpenIndex] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpenIndex(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={`flex items-center bg-[#3c3c3c] border-b border-[#2b2b2b] h-6 select-none ${className}`}>
      {menus.map((menu, i) => (
        <div key={i} className="relative">
          <button
            type="button"
            className={`px-2.5 h-6 text-[11px] cursor-default ${
              openIndex === i ? 'bg-[#505050] text-white' : 'text-[#cccccc] hover:bg-[#505050]'
            }`}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onMouseEnter={() => openIndex !== null && setOpenIndex(i)}
          >
            {menu.label}
          </button>
          {openIndex === i && menu.items && (
            <div className="absolute z-50 left-0 top-6 bg-[#2b2b2b] border border-[#3b3b3b] rounded-b-[3px] py-0.5 shadow-lg shadow-black/40 min-w-[180px]">
              {menu.items.map((item, j) =>
                item.separator ? (
                  <div key={j} className="my-0.5 h-px bg-[#3b3b3b]" />
                ) : (
                  <button
                    key={j}
                    type="button"
                    className={`w-full text-left px-2.5 py-[3px] text-[11px] cursor-default flex justify-between items-center ${
                      item.disabled ? 'text-[#666666] pointer-events-none' : 'text-[#cccccc] hover:bg-[#404040]'
                    }`}
                    onClick={() => {
                      item.action?.()
                      setOpenIndex(null)
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-[#666666] text-[10px]">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
