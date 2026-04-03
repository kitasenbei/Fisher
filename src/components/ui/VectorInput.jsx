import { useState, useRef } from 'react'

const axisColors = {
  x: '#e05555',
  y: '#55b855',
  z: '#5588ee',
  w: '#cc8833',
}

function AxisField({ axis, value, step, onChange }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const startRef = useRef({ x: 0, val: 0 })
  const inputRef = useRef(null)

  function onMouseDown(e) {
    e.preventDefault()
    startRef.current = { x: e.clientX, val: value }

    function onMove(ev) {
      const dx = ev.clientX - startRef.current.x
      onChange(parseFloat((startRef.current.val + dx * step).toFixed(4)))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function startEdit() {
    setEditValue(String(value))
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  function commitEdit() {
    const v = parseFloat(editValue)
    if (!isNaN(v)) onChange(v)
    setEditing(false)
  }

  return (
    <div className="flex flex-1 min-w-0">
      {/* Axis tag */}
      <div
        className="flex items-center justify-center w-4 shrink-0 text-[8px] font-bold uppercase text-white select-none rounded-l-[2px]"
        style={{ backgroundColor: axisColors[axis] }}
      >
        {axis}
      </div>
      {/* Value */}
      <div className="relative flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full h-full bg-[#1e1e1e] text-[#cccccc] text-[11px] text-center px-1 py-[2px] outline-none border border-[#2d8ceb] rounded-r-[2px]"
          />
        ) : (
          <div
            className="bg-[#484848] text-[#cccccc] text-[11px] text-center px-1 py-[2px] cursor-ew-resize select-none truncate rounded-r-[2px] hover:bg-[#505050] transition-colors duration-75"
            onMouseDown={onMouseDown}
            onDoubleClick={startEdit}
          >
            {typeof value === 'number' ? value.toFixed(2) : value}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VectorInput({
  label,
  value: controlledValue = {},
  axes = ['x', 'y', 'z'],
  step = 0.1,
  onChange,
  className = '',
}) {
  const isControlled = onChange !== undefined
  const [internal, setInternal] = useState(controlledValue)
  const value = isControlled ? controlledValue : internal

  function handleAxis(axis, val) {
    const next = { ...value, [axis]: val }
    if (isControlled) {
      onChange(next)
    } else {
      setInternal(next)
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <span className="block text-[11px] text-[#999999]">{label}</span>}
      <div className="flex gap-[2px]">
        {axes.map((axis) => (
          <AxisField
            key={axis}
            axis={axis}
            value={value[axis] ?? 0}
            step={step}
            onChange={(v) => handleAxis(axis, v)}
          />
        ))}
      </div>
    </div>
  )
}
