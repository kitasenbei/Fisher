import { useRef, useEffect, useState, useMemo } from 'react'
import { useEditor } from '../stores/editorStore'
import { snapToBeat } from '../lib/svMath'

const COLORS = {
  bg: '#353535',
  grid: '#3b3b3b',
  gridMajor: '#444444',
  svLine: '#2d8ceb',
  svPoint: '#2d8ceb',
  svPointSelected: '#ffffff',
  svFill: 'rgba(45, 140, 235, 0.08)',
  playhead: '#e05555',
  text: '#999999',
  bpmText: '#cc8833',
}

export default function SVGraph() {
  const canvasRef = useRef(null)
  const { state, dispatch, audio } = useEditor()
  const animRef = useRef(null)
  const [hoveredPoint, setHoveredPoint] = useState(-1)
  const draggingRef = useRef(null)
  const panRef = useRef(null)
  const zoomAreaRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const playbackRef = useRef(state.playback.currentTimeMs)
  const needsDrawRef = useRef(true)
  const snapTargetRef = useRef(null) // { ms, sv } — the snapped position while dragging
  const seekWasPlayingRef = useRef(false) // track if audio was playing when seek started

  // Store all state in a ref so draw never causes re-renders
  const stateRef = useRef(state)
  stateRef.current = state

  const hoveredRef = useRef(hoveredPoint)
  hoveredRef.current = hoveredPoint

  const svPoints = useMemo(() => state.timingPoints.filter(tp => !tp.uninherited), [state.timingPoints])
  const bpmPoints = useMemo(() => state.timingPoints.filter(tp => tp.uninherited), [state.timingPoints])
  const svPointsRef = useRef(svPoints)
  svPointsRef.current = svPoints
  const bpmPointsRef = useRef(bpmPoints)
  bpmPointsRef.current = bpmPoints

  // Mark dirty on state changes
  useEffect(() => { needsDrawRef.current = true }, [
    state.timingPoints, state.viewport, state.selection, state.activeTool,
    state.playback.currentTimeMs, state.display, hoveredPoint,
  ])

  useEffect(() => {
    playbackRef.current = state.playback.currentTimeMs
  }, [state.playback.currentTimeMs])

  // Single draw function — reads everything from refs, zero closures over state
  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Deferred chip queue — drawn last so they're always on top
    const chipQueue = []
    function chip(text, cx, cy, color, bg = 'rgba(30,30,30,0.85)', align = 'center', shape = 'pill') {
      chipQueue.push({ text, cx, cy, color, bg, align, shape })
    }
    function flushChips() {
      for (const c of chipQueue) drawChip(c.text, c.cx, c.cy, c.color, c.bg, c.align, c.shape)
    }
    function drawChip(text, cx, cy, color, bg, align, shape) {
      ctx.save()
      const fontSize = shape === 'tag' ? 11 : 9
      ctx.font = `${fontSize}px monospace`
      const m = ctx.measureText(text)
      const arrow = shape === 'tag' ? 7 : 6
      const pw = m.width + (shape === 'tag' ? 12 : 10) + (shape === 'tag' ? arrow : 0)
      const ph = shape === 'tag' ? 18 : 14
      const r = shape === 'tag' ? 4 : 3
      let rx = cx
      if (align === 'center') rx = cx - pw / 2
      else if (align === 'left') rx = cx
      else if (align === 'right') rx = cx - pw
      const ry = cy - ph / 2

      ctx.beginPath()
      if (shape === 'tag') {
        // Tag shape: rounded left, arrow point on right
        const bodyW = pw - arrow
        ctx.moveTo(rx + r, ry)
        ctx.lineTo(rx + bodyW, ry)
        ctx.lineTo(rx + bodyW + arrow, cy) // arrow point
        ctx.lineTo(rx + bodyW, ry + ph)
        ctx.lineTo(rx + r, ry + ph)
        ctx.arcTo(rx, ry + ph, rx, ry + ph - r, r)
        ctx.lineTo(rx, ry + r)
        ctx.arcTo(rx, ry, rx + r, ry, r)
      } else {
        // Pill shape
        ctx.moveTo(rx + r, ry)
        ctx.lineTo(rx + pw - r, ry)
        ctx.arcTo(rx + pw, ry, rx + pw, ry + r, r)
        ctx.lineTo(rx + pw, ry + ph - r)
        ctx.arcTo(rx + pw, ry + ph, rx + pw - r, ry + ph, r)
        ctx.lineTo(rx + r, ry + ph)
        ctx.arcTo(rx, ry + ph, rx, ry + ph - r, r)
        ctx.lineTo(rx, ry + r)
        ctx.arcTo(rx, ry, rx + r, ry, r)
      }
      ctx.closePath()

      ctx.fillStyle = bg
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.fillStyle = color
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, rx + 5, cy)
      ctx.restore()
    }

    const s = stateRef.current
    const vp = s.viewport
    const sel = s.selection
    const tool = s.activeTool
    const tp = s.timingPoints
    const d = s.display
    const sv = svPointsRef.current
    const bpm = bpmPointsRef.current
    const hovered = hoveredRef.current
    const playMs = playbackRef.current

    const toX = (ms) => ((ms - vp.startMs) / (vp.endMs - vp.startMs)) * w
    const fromX = (x) => vp.startMs + (x / w) * (vp.endMs - vp.startMs)

    // Log scale Y axis
    const { toY: toYh, fromY: fromYh } = makeYTransforms(vp, d)
    const toY = (v) => toYh(v, h)
    const fromY = (y) => fromYh(y, h)

    // Background
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, w, h)

    // SV grid — fixed 0.5x step, color-coded by whole vs half
    if (d.svTags) {
      const svStep = 0.5
      for (let v = Math.ceil(vp.svMin / svStep) * svStep; v <= vp.svMax; v += svStep) {
        const y = toY(v)
        const isWhole = Math.abs(v - Math.round(v)) < 0.01
        ctx.strokeStyle = isWhole ? COLORS.gridMajor : COLORS.grid
        ctx.lineWidth = isWhole ? 1 : 0.5
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
        const label = isWhole ? `${Math.round(v)}x` : `${v.toFixed(1)}x`
        const bg = isWhole ? '#3d4a5c' : '#3a3a42'
        chip(label, 4, y, isWhole ? '#c8d8ec' : '#8888a0', bg, 'left', 'tag')
      }
    }

    // Beat grid from BPM points — progressively collapse detail by zoom
    const timeRange = vp.endMs - vp.startMs
    if (!d.beatGrid) { /* skip grid */ } else {
    const snapDiv = s.snapEnabled ? s.snapDivisor : 1

    for (const b of bpm) {
      const beatInterval = b.msPerBeat
      if (beatInterval <= 0) continue
      const measureInterval = beatInterval * b.meter

      // Pick the finest interval that keeps lines >= 50px apart
      const snapInterval = beatInterval / snapDiv
      const intervals = [
        { ms: snapInterval, type: 'sub' },
        { ms: beatInterval, type: 'beat' },
        { ms: measureInterval, type: 'measure' },
      ]

      let chosenInterval = null
      for (const iv of intervals) {
        const pxPer = (iv.ms / timeRange) * w
        if (pxPer >= 50) { chosenInterval = iv; break }
      }

      // If even measures are too dense, skip this BPM section
      if (!chosenInterval) {
        const pxPerMeasure = (measureInterval / timeRange) * w
        if (pxPerMeasure >= 15) chosenInterval = { ms: measureInterval, type: 'measure' }
        else continue
      }

      const iter = chosenInterval.ms
      const startMs = Math.max(b.offset, vp.startMs)
      const maxLines = Math.ceil(w / 8) // hard cap
      let count = 0

      for (let ms = startMs - ((startMs - b.offset) % iter); ms <= vp.endMs && count < maxLines; ms += iter) {
        const x = toX(ms)
        if (x < 0) continue
        if (x > w) break
        count++

        const beatOffset = ms - b.offset
        const isMeasure = Math.abs(beatOffset % measureInterval) < 0.5
        const isBeat = Math.abs(beatOffset % beatInterval) < 0.5

        if (isMeasure) {
          ctx.strokeStyle = '#606060'
          ctx.lineWidth = 1.2
        } else if (isBeat) {
          ctx.strokeStyle = '#505050'
          ctx.lineWidth = 0.8
        } else {
          ctx.strokeStyle = '#424242'
          ctx.lineWidth = 0.5
        }
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }

      // BPM label
      const bx = toX(b.offset)
      if (bx >= 0 && bx <= w) {
        ctx.strokeStyle = COLORS.bpmText
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, h); ctx.stroke()
        ctx.setLineDash([])
        chip(`${b.bpm.toFixed(0)} BPM`, bx + 3, 12, COLORS.bpmText, '#2b2520', 'left')
      }
    }
    } // end beatGrid check

    // SV step line + fill
    if (sv.length > 0 && (d.svLine || d.svFill)) {
      // Only draw visible points
      const visStart = vp.startMs
      const visEnd = vp.endMs

      ctx.beginPath()
      ctx.strokeStyle = COLORS.svLine
      ctx.lineWidth = 1.5

      let started = false
      let lastY = 0

      for (let i = 0; i < sv.length; i++) {
        const px = toX(sv[i].offset)
        const py = toY(sv[i].svMultiplier)

        if (px > w + 10 && started) {
          ctx.lineTo(px, lastY)
          break
        }

        if (!started) {
          if (i === 0 || px >= -10) {
            ctx.moveTo(Math.max(-10, px), py)
            started = true
            lastY = py
          }
          continue
        }

        ctx.lineTo(px, lastY) // step
        ctx.lineTo(px, py)
        lastY = py
      }

      if (started && d.svLine) {
        ctx.lineTo(toX(visEnd), lastY)
        ctx.stroke()
      }

      // Fill area (simplified)
      if (started && d.svFill) {
        ctx.beginPath()
        let fStarted = false
        let fLastY = 0
        for (let i = 0; i < sv.length; i++) {
          const px = toX(sv[i].offset)
          const py = toY(sv[i].svMultiplier)
          if (px > w + 10 && fStarted) { ctx.lineTo(px, fLastY); break }
          if (!fStarted) {
            if (i === 0 || px >= -10) {
              ctx.moveTo(Math.max(-10, px), h)
              ctx.lineTo(Math.max(-10, px), py)
              fStarted = true; fLastY = py
            }
            continue
          }
          ctx.lineTo(px, fLastY)
          ctx.lineTo(px, py)
          fLastY = py
        }
        if (fStarted) {
          ctx.lineTo(toX(visEnd), fLastY)
          ctx.lineTo(toX(visEnd), h)
          ctx.closePath()
          ctx.fillStyle = COLORS.svFill
          ctx.fill()
        }
      }
    }

    // SV points (diamonds) — only visible ones
    if (!d.svPoints) { /* skip */ } else
    for (let i = 0; i < sv.length; i++) {
      const point = sv[i]
      const x = toX(point.offset)
      if (x < -10) continue
      if (x > w + 10) break
      const y = toY(point.svMultiplier)
      const globalIdx = tp.indexOf(point)
      const isSelected = sel.has(globalIdx)
      const isHovered = hovered === globalIdx
      const size = isHovered ? 5 : 4

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = isSelected ? COLORS.svPointSelected : COLORS.svPoint
      ctx.fillRect(-size / 2, -size / 2, size, size)
      if (isSelected) {
        ctx.strokeStyle = COLORS.svLine
        ctx.lineWidth = 1.5
        ctx.strokeRect(-size / 2, -size / 2, size, size)
      }
      ctx.restore()

      if ((isHovered || isSelected) && d.hoverLabels) {
        chip(`${point.svMultiplier.toFixed(2)}x`, x, y - 10, '#cccccc', 'rgba(45,140,235,0.25)')
        chip(`${Math.round(point.offset)}ms`, x, y + 14, '#999999')
      }
    }

    // Playhead
    const px = toX(playMs)
    if (d.playhead && px >= 0 && px <= w) {
      ctx.strokeStyle = COLORS.playhead
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke()
      const sec = playMs / 1000
      const min = Math.floor(sec / 60)
      const sStr = (sec % 60).toFixed(1)
      chip(`${min}:${sStr.padStart(4, '0')}`, px, h - 8, COLORS.playhead, 'rgba(60,20,20,0.85)')
    }

    // Zoom area rectangle
    if (zoomAreaRef.current && tool === 'zoom-area') {
      const za = zoomAreaRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const rx = Math.min(za.startX, mx)
      const ry = Math.min(za.startY, my)
      const rw = Math.abs(mx - za.startX)
      const rh = Math.abs(my - za.startY)
      ctx.fillStyle = 'rgba(45, 140, 235, 0.1)'
      ctx.fillRect(rx, ry, rw, rh)
      ctx.strokeStyle = '#2d8ceb'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.setLineDash([])
      const msRange = Math.abs(fromX(mx) - fromX(za.startX))
      const svRangeArea = Math.abs(fromY(my) - fromY(za.startY))
      chip(`${(msRange / 1000).toFixed(1)}s × ${svRangeArea.toFixed(2)}x`, rx + rw / 2, ry + rh / 2, '#2d8ceb', 'rgba(20,40,60,0.9)')
    }

    // Flush all chips on top of everything
    flushChips()
  }

  // Single rAF loop — always runs but only redraws when dirty or playing
  useEffect(() => {
    let running = true
    const tick = () => {
      if (!running) return
      const playing = stateRef.current.playback.playing
      if (playing) {
        playbackRef.current = audio.getCurrentTimeMs()
        draw()
      } else if (needsDrawRef.current) {
        draw()
        needsDrawRef.current = false
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Mouse interactions ---

  function getCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height }
  }

  function makeYTransforms(vp, d) {
    const log = d.logScale
    const logSafe = (v) => Math.log2(Math.max(v, 0.001))
    const lMin = log ? logSafe(vp.svMin) : vp.svMin
    const lMax = log ? logSafe(vp.svMax) : vp.svMax
    const toY = (v, h) => { const m = log ? logSafe(v) : v; return h - ((m - lMin) / (lMax - lMin)) * h }
    const fromY = (y, h) => { const lin = lMax - (y / h) * (lMax - lMin); return log ? Math.pow(2, lin) : lin }
    return { toY, fromY }
  }

  function getPointAtPos(x, y, w, h) {
    const vp = stateRef.current.viewport
    const d = stateRef.current.display
    const sv = svPointsRef.current
    const tp = stateRef.current.timingPoints
    const toXl = (ms) => ((ms - vp.startMs) / (vp.endMs - vp.startMs)) * w
    const { toY: toYl } = makeYTransforms(vp, d)
    for (let i = 0; i < sv.length; i++) {
      const px = toXl(sv[i].offset)
      const py = toYl(sv[i].svMultiplier, h)
      if (Math.abs(x - px) < 8 && Math.abs(y - py) < 8) return tp.indexOf(sv[i])
    }
    return -1
  }

  function addPointAt(x, y, w, h) {
    const vp = stateRef.current.viewport
    const s = stateRef.current
    const { fromY: fromYl } = makeYTransforms(vp, s.display)
    let ms = vp.startMs + (x / w) * (vp.endMs - vp.startMs)
    const sv = Math.max(0.1, fromYl(y, h))
    if (s.snapEnabled) ms = snapToBeat(ms, s.timingPoints, s.snapDivisor)
    dispatch('ADD_POINT', {
      offset: ms, svMultiplier: parseFloat(sv.toFixed(2)), msPerBeat: -100 / sv,
      meter: 4, sampleSet: 0, sampleIndex: 0, volume: 100, uninherited: false, effects: 0,
    })
  }

  function handleMouseDown(e) {
    const { x, y, w, h } = getCanvasPos(e)
    const s = stateRef.current
    const vp = s.viewport

    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, startViewport: { ...vp } }
      return
    }

    const idx = getPointAtPos(x, y, w, h)
    const tool = s.activeTool

    switch (tool) {
      case 'select': {
        if (idx >= 0) {
          if (e.ctrlKey || e.metaKey) dispatch('TOGGLE_SELECT', idx)
          else dispatch('SELECT', [idx])
          const tp = s.timingPoints[idx]
          draggingRef.current = { idx, startX: x, startY: y, origOffset: tp.offset, origSV: tp.svMultiplier }
        } else {
          dispatch('DESELECT_ALL')
          if (e.detail === 2) addPointAt(x, y, w, h)
        }
        break
      }
      case 'pen': addPointAt(x, y, w, h); break
      case 'eraser': { if (idx >= 0) dispatch('REMOVE_POINTS', new Set([idx])); break }
      case 'pan': { panRef.current = { startX: e.clientX, startY: e.clientY, startViewport: { ...vp } }; break }
      case 'zoom': {
        const factor = e.altKey ? 1.5 : 0.67
        const range = vp.endMs - vp.startMs
        const newRange = range * factor
        const mouseMs = vp.startMs + (x / w) * range
        const ratio = x / w
        dispatch('SET_VIEWPORT', { startMs: mouseMs - ratio * newRange, endMs: mouseMs + (1 - ratio) * newRange })
        break
      }
      case 'zoom-area': { zoomAreaRef.current = { startX: x, startY: y }; break }
      case 'seek': {
        const ms = vp.startMs + (x / w) * (vp.endMs - vp.startMs)
        const clampedMs = Math.max(0, ms)
        seekWasPlayingRef.current = audio.playing
        if (audio.playing) {
          audio.pause()
          dispatch('SET_PLAYBACK', { playing: false })
        }
        playbackRef.current = clampedMs
        dispatch('SET_PLAYBACK', { currentTimeMs: clampedMs })
        audio.seek(clampedMs)
        needsDrawRef.current = true
        break
      }
      case 'fit': {
        const tp = s.timingPoints
        if (tp.length > 0) {
          const allMs = tp.map(p => p.offset)
          const allSv = svPointsRef.current.map(p => p.svMultiplier)
          dispatch('SET_VIEWPORT', {
            startMs: Math.min(...allMs) - 500, endMs: Math.max(...allMs) + 500,
            svMin: Math.max(0, (allSv.length ? Math.min(...allSv) : 0) - 0.5),
            svMax: (allSv.length ? Math.max(...allSv) : 4) + 0.5,
          })
        }
        break
      }
    }
  }

  function handleMouseMove(e) {
    const { x, y, w, h } = getCanvasPos(e)
    mouseRef.current = { x, y }

    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      const sv = panRef.current.startViewport

      if (e.shiftKey) {
        // Shift+drag: axis zoom — horizontal stretches time, vertical stretches SV
        const timeCenter = (sv.startMs + sv.endMs) / 2
        const timeRange = sv.endMs - sv.startMs
        const svCenter = (sv.svMin + sv.svMax) / 2
        const svRangeVal = sv.svMax - sv.svMin

        // dx right = zoom in time (compress), dx left = zoom out (expand)
        const timeScale = Math.pow(1.005, -dx)
        // dy up = zoom in SV (compress), dy down = zoom out (expand)
        const svScale = Math.pow(1.005, -dy)

        const newTimeRange = timeRange * timeScale
        const newSvRange = svRangeVal * svScale

        dispatch('SET_VIEWPORT', {
          startMs: timeCenter - newTimeRange / 2,
          endMs: timeCenter + newTimeRange / 2,
          svMin: svCenter - newSvRange / 2,
          svMax: svCenter + newSvRange / 2,
        })
      } else {
        // Normal pan
        const msPerPx = (sv.endMs - sv.startMs) / w
        const svPerPx = (sv.svMax - sv.svMin) / h
        dispatch('SET_VIEWPORT', {
          startMs: sv.startMs - dx * msPerPx, endMs: sv.endMs - dx * msPerPx,
          svMin: sv.svMin + dy * svPerPx, svMax: sv.svMax + dy * svPerPx,
        })
      }
      return
    }

    if (zoomAreaRef.current) {
      needsDrawRef.current = true
      return
    }

    // Seek tool: drag to scrub (audio is paused during drag)
    if (stateRef.current.activeTool === 'seek' && e.buttons === 1) {
      const vp = stateRef.current.viewport
      const ms = Math.max(0, vp.startMs + (x / w) * (vp.endMs - vp.startMs))
      playbackRef.current = ms
      dispatch('SET_PLAYBACK', { currentTimeMs: ms })
      audio.seek(ms)
      needsDrawRef.current = true
      return
    }

    if (draggingRef.current && stateRef.current.activeTool === 'select') {
      const s = stateRef.current
      const vp = s.viewport
      const { toY: toYd, fromY: fromYd } = makeYTransforms(vp, s.display)
      const dx = x - draggingRef.current.startX
      let newOffset = draggingRef.current.origOffset + (dx / w) * (vp.endMs - vp.startMs)
      const origScreenY = toYd(draggingRef.current.origSV, h)
      const newScreenY = origScreenY + (y - draggingRef.current.startY)
      const newSV = Math.max(0.1, fromYd(newScreenY, h))
      if (s.snapEnabled) newOffset = snapToBeat(newOffset, s.timingPoints, s.snapDivisor)
      snapTargetRef.current = { ms: newOffset, sv: parseFloat(newSV.toFixed(2)) }
      needsDrawRef.current = true
      dispatch('UPDATE_POINT', {
        index: draggingRef.current.idx,
        updates: { offset: newOffset, svMultiplier: parseFloat(newSV.toFixed(2)), msPerBeat: -100 / newSV },
      })
    } else {
      const idx = getPointAtPos(x, y, w, h)
      if (idx !== hoveredRef.current) setHoveredPoint(idx)
    }
  }

  function handleMouseUp(e) {
    // Resume playback after seek drag if it was playing before
    if (stateRef.current.activeTool === 'seek' && seekWasPlayingRef.current) {
      const currentMs = playbackRef.current
      audio.play(currentMs)
      dispatch('SET_PLAYBACK', { playing: true, currentTimeMs: currentMs })
      seekWasPlayingRef.current = false
    }

    if (zoomAreaRef.current && stateRef.current.activeTool === 'zoom-area') {
      const { x, y, w, h } = getCanvasPos(e)
      const za = zoomAreaRef.current
      const vp = stateRef.current.viewport
      const fromXl = (px) => vp.startMs + (px / w) * (vp.endMs - vp.startMs)
      const { fromY: fromYl } = makeYTransforms(vp, stateRef.current.display)
      const sx = Math.min(za.startX, x), ex = Math.max(za.startX, x)
      const sy = Math.min(za.startY, y), ey = Math.max(za.startY, y)
      if (ex - sx > 5 && ey - sy > 5) {
        dispatch('SET_VIEWPORT', { startMs: fromXl(sx), endMs: fromXl(ex), svMin: fromYl(ey, h), svMax: fromYl(sy, h) })
      }
    }
    draggingRef.current = null
    panRef.current = null
    zoomAreaRef.current = null
  }

  // Non-passive wheel for zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function onWheel(e) {
      e.preventDefault()
      const vp = stateRef.current.viewport
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const ratio = mouseX / rect.width
      const range = vp.endMs - vp.startMs
      const factor = e.deltaY > 0 ? 1.15 : 0.87
      const newRange = range * factor
      const mouseMs = vp.startMs + ratio * range
      dispatch('SET_VIEWPORT', { startMs: mouseMs - ratio * newRange, endMs: mouseMs + (1 - ratio) * newRange })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [dispatch])

  const cursorMap = {
    select: 'cursor-default', pen: 'cursor-crosshair', eraser: 'cursor-pointer',
    pan: 'cursor-grab', zoom: 'cursor-zoom-in', 'zoom-area': 'cursor-crosshair',
    seek: 'cursor-col-resize', fit: 'cursor-pointer',
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${cursorMap[state.activeTool] || 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setHoveredPoint(-1); draggingRef.current = null; panRef.current = null; zoomAreaRef.current = null }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
