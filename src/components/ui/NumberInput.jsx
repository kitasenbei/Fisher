import { useState, useRef } from 'react'

export default function NumberInput({
  label,
  id,
  value: controlledValue,
  min,
  max,
  step = 1,
  onChange,
  className = '',
  ...props
}) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? 0)
  const value = isControlled ? controlledValue : internal
  const startRef = useRef({ x: 0, val: 0 })

  function clamp(v) {
    let n = v
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    return Math.round(n / step) * step
  }

  function emit(v) {
    const clamped = clamp(v)
    if (isControlled) {
      onChange({ target: { value: clamped, id } })
    } else {
      setInternal(clamped)
      onChange?.({ target: { value: clamped, id } })
    }
  }

  function onMouseDown(e) {
    e.preventDefault()
    startRef.current = { x: e.clientX, val: value }

    function onMove(ev) {
      const dx = ev.clientX - startRef.current.x
      emit(startRef.current.val + dx * step)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function handleInput(e) {
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) emit(v)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] text-[#999999]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInput}
          className="w-full bg-[#535353] text-[#cccccc] text-[12px] leading-tight px-2 py-1 border border-[#3b3b3b] rounded-[3px] outline-none focus:border-[#2d8ceb] transition-colors duration-100 cursor-ew-resize"
          {...props}
        />
        <div
          className="absolute inset-0 cursor-ew-resize"
          onMouseDown={onMouseDown}
          onDoubleClick={() => document.getElementById(id)?.focus()}
        />
      </div>
    </div>
  )
}
