import { useRef, useState } from 'react'

export default function Slider({
  label,
  id,
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  onChange,
  className = '',
}) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? 0)
  const value = isControlled ? controlledValue : internal
  const trackRef = useRef(null)
  const pct = ((value - min) / (max - min)) * 100

  function emit(v) {
    if (isControlled) {
      onChange({ target: { value: v, id } })
    } else {
      setInternal(v)
      onChange?.({ target: { value: v, id } })
    }
  }

  function handlePointer(e) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()

    function update(clientX) {
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      const raw = min + ratio * (max - min)
      const stepped = Math.round(raw / step) * step
      emit(stepped)
    }

    update(e.clientX)

    function onMove(ev) {
      update(ev.clientX)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[11px] text-[#999999]">
          {label}
        </label>
      )}
      <div
        ref={trackRef}
        className="relative h-[18px] bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] cursor-ew-resize select-none overflow-hidden"
        onMouseDown={handlePointer}
        onWheel={(e) => {
          e.stopPropagation()
          const dir = e.deltaY < 0 ? 1 : -1
          const next = Math.min(max, Math.max(min, Math.round((value + dir * step) / step) * step))
          if (next !== value) emit(next)
        }}
      >
        {/* Fill */}
        <div className="absolute inset-y-0 left-0 bg-[#2d8ceb]/20" style={{ width: `${pct}%` }}>
          <div className="absolute right-0 top-0 bottom-0 w-px bg-[#2d8ceb]/60" />
        </div>
        {/* Value text */}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#cccccc] pointer-events-none">
          {value}
        </span>
      </div>
    </div>
  )
}
