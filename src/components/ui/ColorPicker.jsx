import { useState, useRef } from 'react'

function hsvToHex(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r, g, b
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function ColorPicker({ label, value = '#ff0000', onChange, className = '' }) {
  const [hue, setHue] = useState(0)
  const [sat, setSat] = useState(1)
  const [val, setVal] = useState(1)
  const [open, setOpen] = useState(false)
  const areaRef = useRef(null)
  const hueRef = useRef(null)

  function emitColor(h, s, v) {
    const hex = hsvToHex(h, s, v)
    onChange?.({ target: { value: hex } })
  }

  function handleArea(e) {
    const rect = areaRef.current.getBoundingClientRect()
    function update(ev) {
      const s = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0), 1)
      const v = 1 - Math.min(Math.max((ev.clientY - rect.top) / rect.height, 0), 1)
      setSat(s)
      setVal(v)
      emitColor(hue, s, v)
    }
    update(e)
    function onMove(ev) {
      update(ev)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function handleHue(e) {
    const rect = hueRef.current.getBoundingClientRect()
    function update(ev) {
      const h = Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 360, 0), 360)
      setHue(h)
      emitColor(h, sat, val)
    }
    update(e)
    function onMove(ev) {
      update(ev)
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
      {label && <span className="block text-[11px] text-[#999999]">{label}</span>}
      <div className="relative inline-block">
        <button
          type="button"
          className="w-6 h-4 rounded-[3px] border border-[#3b3b3b] cursor-default"
          style={{ backgroundColor: value }}
          onClick={() => setOpen((o) => !o)}
        />
        {open && (
          <div className="absolute z-50 top-6 left-0 bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] p-2 shadow-lg shadow-black/40 space-y-1.5">
            <div
              ref={areaRef}
              className="w-36 h-28 relative rounded-[3px] cursor-crosshair"
              style={{ background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%))` }}
              onMouseDown={handleArea}
            >
              <div
                className="absolute inset-0 rounded-[3px]"
                style={{ background: 'linear-gradient(to bottom, transparent, black)' }}
              />
              <div
                className="absolute w-2 h-2 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }}
              />
            </div>
            <div
              ref={hueRef}
              className="w-36 h-2.5 rounded-[3px] cursor-default relative"
              style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
              onMouseDown={handleHue}
            >
              <div
                className="absolute top-0 w-0.5 h-full bg-white rounded-full -translate-x-1/2 pointer-events-none"
                style={{ left: `${(hue / 360) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-[#999999] text-center">{value}</div>
          </div>
        )}
      </div>
    </div>
  )
}
