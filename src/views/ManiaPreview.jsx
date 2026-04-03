import { useRef, useEffect, useState } from 'react'
import { Upload, Palette } from 'lucide-react'
import JSZip from 'jszip'
import { useEditor } from '../stores/editorStore'
import { Slider, GizmoStrip } from '../components'
import { msPerBeatAtTime } from '../lib/svMath'

// --- Color modes ---

// Normal: column-based colors
const COL_COLORS_4 = ['#cc44cc', '#4488ff', '#4488ff', '#cc44cc']
const COL_COLORS_7 = ['#cc44cc', '#4488ff', '#cc44cc', '#ffcc22', '#cc44cc', '#4488ff', '#cc44cc']

function colColor(col, keyCount) {
  if (keyCount === 4) return COL_COLORS_4[col] || '#4488ff'
  if (keyCount === 7) return COL_COLORS_7[col] || '#4488ff'
  return col % 2 === 0 ? '#cc44cc' : '#4488ff'
}

// StepMania quantization colors
const QUANT_COLORS = [
  { div: 4, color: '#ff0000' },   // 1/4 — red
  { div: 8, color: '#0066ff' },   // 1/8 — blue
  { div: 12, color: '#cc00cc' },  // 1/12 — purple
  { div: 16, color: '#ccaa00' },  // 1/16 — yellow
  { div: 24, color: '#ff66cc' },  // 1/24 — pink
  { div: 32, color: '#ff8800' },  // 1/32 — orange
  { div: 48, color: '#00cccc' },  // 1/48 — cyan
  { div: 64, color: '#00cc00' },  // 1/64 — green
]

function quantColor(noteTimeMs, timingPoints) {
  const mpb = msPerBeatAtTime(timingPoints, noteTimeMs)
  // Find the BPM point origin
  let origin = 0
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    if (timingPoints[i].uninherited && timingPoints[i].offset <= noteTimeMs) {
      origin = timingPoints[i].offset
      break
    }
  }

  const relative = noteTimeMs - origin
  for (const { div, color } of QUANT_COLORS) {
    const interval = (mpb * 4) / div
    if (interval > 0 && Math.abs(relative % interval) < 1) return color
  }
  return '#888888' // unsnapped
}

function noteColor(col, keyCount, mode, noteTimeMs, timingPoints) {
  if (mode === 'quant') return quantColor(noteTimeMs, timingPoints)
  return colColor(col, keyCount)
}

// --- SV scroll position ---

function calculateScrollPosition(time, timingPoints) {
  if (!timingPoints || timingPoints.length === 0) return time

  let position = 0
  let currentSv = 1.0
  let lastTime = 0

  for (const tp of timingPoints) {
    if (tp.offset > time) {
      position += (time - lastTime) * currentSv
      return position
    }
    position += (tp.offset - lastTime) * currentSv
    lastTime = tp.offset

    if (!tp.uninherited && tp.svMultiplier != null) {
      currentSv = tp.svMultiplier
    }
  }

  position += (time - lastTime) * currentSv
  return position
}

// --- Skin loading ---

async function loadSkinZip(file) {
  return JSZip.loadAsync(file).then(async (zip) => {
    const images = {}
    const imgExts = /\.(png|jpg|jpeg|gif|bmp)$/i

    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir || !imgExts.test(path)) continue
      const name = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '').toLowerCase()
      // Look for mania note/receptor images
      if (name.includes('note') || name.includes('receptor') || name.includes('key') ||
          name.includes('holdbody') || name.includes('holdcap')) {
        const blob = await entry.async('blob')
        const url = URL.createObjectURL(blob)
        const img = new Image()
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; img.src = url })
        images[name] = img
      }
    }
    return images
  })
}

export default function ManiaPreview() {
  const { state, audio } = useEditor()
  const { file, timingPoints, playback } = state

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animRef = useRef(null)
  const sizeRef = useRef({ w: 280, h: 600 })
  const [scrollSpeed, setScrollSpeed] = useState(25)
  const [colorMode, setColorMode] = useState('normal') // 'normal' | 'quant'
  const [skinImages, setSkinImages] = useState(null)
  const skinImagesRef = useRef(null)

  const hitObjects = file?.parsed?.hitObjects || []
  const keyCount = file?.parsed?.difficulty?.circleSize || 4

  const stateRef = useRef({ timingPoints, playback, scrollSpeed, hitObjects, keyCount, colorMode })
  stateRef.current = { timingPoints, playback, scrollSpeed, hitObjects, keyCount, colorMode }

  function handleSkinUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,.osk'
    input.onchange = async (e) => {
      const f = e.target.files[0]
      if (!f) return
      const imgs = await loadSkinZip(f)
      skinImagesRef.current = imgs
      setSkinImages(imgs)
    }
    input.click()
  }

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || hitObjects.length === 0) return

    let running = true

    function frame() {
      if (!running) return
      const ctx = canvas.getContext('2d')
      if (!ctx) { animRef.current = requestAnimationFrame(frame); return }

      const { w: W, h: H } = sizeRef.current
      const { timingPoints: tp, playback: pb, scrollSpeed: ss, hitObjects: ho, keyCount: kc, colorMode: cm } = stateRef.current
      const skin = skinImagesRef.current

      const RECEPTOR_Y = H - 60
      const colWidth = W / kc
      const noteH = Math.max(6, colWidth * 0.3)
      const speedMult = ss / 25

      const currentTimeMs = pb.playing ? audio.getCurrentTimeMs() : pb.currentTimeMs
      const currentScrollPos = calculateScrollPosition(currentTimeMs, tp)

      // Clear
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, W, H)

      // Column dividers
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth = 1
      for (let i = 1; i < kc; i++) {
        const x = i * colWidth
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }

      // Receptor area
      ctx.fillStyle = '#ffffff10'
      ctx.fillRect(0, RECEPTOR_Y - noteH / 2 - 1, W, noteH + 2)

      for (let col = 0; col < kc; col++) {
        const x = col * colWidth
        const c = colColor(col, kc)
        ctx.fillStyle = c + '25'
        ctx.fillRect(x + 1, RECEPTOR_Y - noteH / 2, colWidth - 2, noteH)
        ctx.strokeStyle = c + '50'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1, RECEPTOR_Y - noteH / 2, colWidth - 2, noteH)
      }

      // Draw notes
      const minY = -noteH * 2
      const maxY = H + noteH * 2

      for (const note of ho) {
        const { col, time, type, end } = note
        const noteScrollPos = calculateScrollPosition(time, tp)
        const noteY = RECEPTOR_Y - (noteScrollPos - currentScrollPos) * speedMult

        const nc = noteColor(col, kc, cm, time, tp)

        if (type === 'hold' && end != null) {
          const endScrollPos = calculateScrollPosition(end, tp)
          const endY = RECEPTOR_Y - (endScrollPos - currentScrollPos) * speedMult

          if (noteY < minY && endY < minY) continue
          if (noteY > maxY && endY > maxY) continue

          const x = col * colWidth
          const bodyH = noteY - endY

          // Hold body
          if (bodyH > 0) {
            ctx.fillStyle = nc + '55'
            ctx.fillRect(x + 3, endY, colWidth - 6, bodyH)
          }

          // Hold tail
          ctx.fillStyle = nc + 'bb'
          const capH = Math.min(noteH * 0.4, 5)
          ctx.fillRect(x + 2, endY - capH / 2, colWidth - 4, capH)

          // Note head — try skin image first
          if (skin) {
            const skinCol = col % 4
            const noteImg = skin[`note${skinCol + 1}`] || skin['note1'] || skin['mania-note']
            if (noteImg) {
              const aspect = noteImg.height / noteImg.width
              const drawH = colWidth * aspect
              ctx.drawImage(noteImg, x + 1, noteY - drawH / 2, colWidth - 2, drawH)
            } else {
              ctx.fillStyle = nc
              ctx.fillRect(x + 1, noteY - noteH / 2, colWidth - 2, noteH)
            }
          } else {
            ctx.fillStyle = nc
            ctx.fillRect(x + 1, noteY - noteH / 2, colWidth - 2, noteH)
          }
        } else {
          if (noteY < minY || noteY > maxY) continue

          const x = col * colWidth

          if (skin) {
            const skinCol = col % 4
            const noteImg = skin[`note${skinCol + 1}`] || skin['note1'] || skin['mania-note']
            if (noteImg) {
              const aspect = noteImg.height / noteImg.width
              const drawH = colWidth * aspect
              ctx.drawImage(noteImg, x + 1, noteY - drawH / 2, colWidth - 2, drawH)
            } else {
              ctx.fillStyle = nc
              ctx.fillRect(x + 1, noteY - noteH / 2, colWidth - 2, noteH)
            }
          } else {
            ctx.fillStyle = nc
            ctx.fillRect(x + 1, noteY - noteH / 2, colWidth - 2, noteH)
          }
        }
      }

      // Receptor line
      ctx.fillStyle = '#ffffff33'
      ctx.fillRect(0, RECEPTOR_Y, W, 1)

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      sizeRef.current = { w, h }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (!file || hitObjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[11px] text-[#555555] px-4 text-center gap-1">
        <span>No mania notes</span>
        <span className="text-[10px] text-[#444444]">Load a .osu with hit objects</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Top bar: speed + gizmos */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#2b2b2b] border-b border-[#1e1e1e] text-[10px] text-[#999999] shrink-0">
        <span>Speed</span>
        <Slider
          value={scrollSpeed}
          min={5}
          max={80}
          className="flex-1"
          onChange={(e) => setScrollSpeed(Number(e.target.value))}
        />
        <div className="w-px h-3 bg-[#3b3b3b] mx-0.5" />

        <GizmoStrip
          orientation="horizontal"
          items={[
            {
              icon: <Palette size={12} />,
              label: colorMode === 'normal' ? 'Switch to BPM colors' : 'Switch to column colors',
              active: colorMode === 'quant',
              action: () => setColorMode(m => m === 'normal' ? 'quant' : 'normal'),
            },
            {
              icon: <Upload size={12} />,
              label: skinImages ? 'Change skin' : 'Upload skin',
              active: !!skinImages,
              action: handleSkinUpload,
            },
          ]}
        />
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
