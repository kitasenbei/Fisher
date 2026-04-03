import { useState, useRef, useEffect } from 'react'
import Scrollbar from './Scrollbar'

export default function Select({ label, id, icon, options = [], value, onChange, className = '', ...props }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(value ?? options[0]?.value)
  const ref = useRef(null)

  const selectedOption = options.find((o) => o.value === selected)
  const selectedLabel = selectedOption?.label ?? ''
  const selectedIcon = selectedOption?.icon ?? icon

  useEffect(() => {
    if (value !== undefined) setSelected(value)
  }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(opt) {
    setSelected(opt.value)
    setOpen(false)
    onChange?.({ target: { value: opt.value, id } })
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((o) => !o)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const idx = options.findIndex((o) => o.value === selected)
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, options.length - 1) : Math.max(idx - 1, 0)
      handleSelect(options[next])
    }
  }

  return (
    <div className="space-y-1" ref={ref}>
      {label && (
        <label htmlFor={id} className="block text-[11px] text-[#999999]">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={id}
          className={`w-full text-left bg-[#535353] text-[#cccccc] text-[12px] leading-tight px-2.5 py-1 pr-7 border border-[#3b3b3b] rounded-[3px] cursor-default outline-none focus:border-[#2d8ceb] transition-colors duration-100 ${selectedIcon ? 'pl-6' : ''} ${className}`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          {...props}
        >
          {selectedIcon && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center text-[#999999]">
              {selectedIcon}
            </span>
          )}
          {selectedLabel}
        </button>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#999999]"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M2 4.5L6 8.5L10 4.5H2Z" />
        </svg>

        {open && (
          <div className="absolute z-50 left-0 right-0 mt-0.5 bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] shadow-lg shadow-black/40 overflow-hidden">
            <Scrollbar maxHeight={200}>
              <ul role="listbox" className="py-0.5">
                {options.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === selected}
                    className={`px-2.5 py-1 text-[12px] cursor-default select-none flex items-center gap-1.5 ${
                      opt.value === selected ? 'bg-[#2d8ceb] text-white' : 'text-[#cccccc] hover:bg-[#404040]'
                    }`}
                    onMouseDown={() => handleSelect(opt)}
                  >
                    {opt.icon && <span className="flex items-center text-[#999999] shrink-0">{opt.icon}</span>}
                    {opt.label}
                  </li>
                ))}
              </ul>
            </Scrollbar>
          </div>
        )}
      </div>
    </div>
  )
}
