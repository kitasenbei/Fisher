import { useRef, useEffect, useMemo, memo } from 'react'

const OSU_W = 512
const OSU_H = 384
const COMBO_COLORS = ['#ff6688', '#66bbff', '#88ff66', '#ffcc44', '#cc88ff', '#ff8844']

export function getAR(ar) {
  if (ar === undefined || ar === null) ar = 5
  const preempt = ar < 5 ? 1200 + 600 * (5 - ar) / 5 : 1200 - 750 * (ar - 5) / 5
  const fadeIn = ar < 5 ? 800 + 400 * (5 - ar) / 5 : 800 - 500 * (ar - 5) / 5
  return { preempt, fadeIn }
}

export function getCS(cs) {
  return 54.4 - 4.48 * (cs ?? 4)
}

// --- Slider path computation (unchanged, runs once at mount) ---

function computeSliderPath(curvePoints, curveType, length) {
  if (curvePoints.length < 2) return curvePoints
  let path
  if (curveType === 'L') path = computeLinear(curvePoints)
  else if (curveType === 'P' && curvePoints.length === 3) path = computePerfectCircle(curvePoints) || computeBezier(curvePoints)
  else path = computeBezier(curvePoints)

  if (length > 0 && path.length > 1) {
    const trimmed = [path[0]]
    let dist = 0
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x, dy = path[i].y - path[i - 1].y
      const seg = Math.sqrt(dx * dx + dy * dy)
      if (dist + seg >= length) {
        const t = (length - dist) / seg
        trimmed.push({ x: path[i - 1].x + dx * t, y: path[i - 1].y + dy * t })
        break
      }
      dist += seg
      trimmed.push(path[i])
    }
    return trimmed
  }
  return path
}

function computeLinear(points) {
  const path = []
  for (let i = 0; i < points.length - 1; i++) {
    const steps = Math.max(2, Math.ceil(Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y) / 4))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      path.push({ x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t })
    }
  }
  return path
}

function computeBezier(points) {
  const segments = []
  let current = [points[0]]
  for (let i = 1; i < points.length; i++) {
    current.push(points[i])
    if (i < points.length - 1 && points[i].x === points[i + 1].x && points[i].y === points[i + 1].y) {
      segments.push(current)
      current = [points[i]]
    }
  }
  segments.push(current)
  const path = []
  for (const seg of segments) {
    const steps = Math.max(20, seg.length * 25)
    for (let s = 0; s <= steps; s++) path.push(deCasteljau(seg, s / steps))
  }
  return path
}

function deCasteljau(points, t) {
  if (points.length === 1) return points[0]
  const next = []
  for (let i = 0; i < points.length - 1; i++) {
    next.push({ x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t })
  }
  return deCasteljau(next, t)
}

function computePerfectCircle(points) {
  const [a, b, c] = points
  const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(D) < 0.001) return null
  const cx = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / D
  const cy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / D
  const r = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2)
  let startAngle = Math.atan2(a.y - cy, a.x - cx)
  let midAngle = Math.atan2(b.y - cy, b.x - cx)
  let endAngle = Math.atan2(c.y - cy, c.x - cx)
  let d1 = midAngle - startAngle, d2 = endAngle - midAngle
  if (d1 < -Math.PI) d1 += 2 * Math.PI; if (d1 > Math.PI) d1 -= 2 * Math.PI
  if (d2 < -Math.PI) d2 += 2 * Math.PI; if (d2 > Math.PI) d2 -= 2 * Math.PI
  const ccw = d1 > 0
  let totalAngle = endAngle - startAngle
  if (ccw && totalAngle < 0) totalAngle += 2 * Math.PI
  if (!ccw && totalAngle > 0) totalAngle -= 2 * Math.PI
  const steps = Math.max(40, Math.ceil(Math.abs(totalAngle) * r / 2))
  const path = []
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (i / steps) * totalAngle
    path.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return path
}

// --- Pre-computed data structures ---

export function precomputeObjects(hitObjects, difficulty, timingPoints) {
  const cs = difficulty?.circleSize ?? 4
  const ar = difficulty?.ar ?? difficulty?.od ?? 5
  const sliderMult = difficulty?.sliderMultiplier ?? 1.4
  const { preempt } = getAR(ar)
  const radius = getCS(cs)

  let comboIdx = 0, comboNum = 1
  const objects = []

  for (let i = 0; i < hitObjects.length; i++) {
    const obj = hitObjects[i]
    if (i === 0 || obj.newCombo) { comboIdx++; comboNum = 1 }
    const color = COMBO_COLORS[comboIdx % COMBO_COLORS.length]
    const num = comboNum++

    let sliderPath = null, sliderPathLen = 0, sliderDur = 0
    if (obj.type === 'slider') {
      sliderPath = computeSliderPath(obj.curvePoints, obj.curveType, obj.length)
      // Precompute cumulative distances for fast position lookup
      sliderPathLen = 0
      for (let j = 1; j < sliderPath.length; j++) {
        sliderPathLen += Math.hypot(sliderPath[j].x - sliderPath[j - 1].x, sliderPath[j].y - sliderPath[j - 1].y)
      }
      // Compute slider duration using timing points
      let beatLength = 500, svMult = 1
      for (let j = timingPoints.length - 1; j >= 0; j--) {
        if (timingPoints[j].offset <= obj.time && timingPoints[j].uninherited) { beatLength = timingPoints[j].msPerBeat; break }
      }
      for (let j = timingPoints.length - 1; j >= 0; j--) {
        if (timingPoints[j].offset <= obj.time && !timingPoints[j].uninherited) { svMult = timingPoints[j].svMultiplier ?? 1; break }
      }
      sliderDur = (obj.length / (sliderMult * svMult * 100)) * beatLength * obj.slides
    }

    const hitTime = obj.type === 'slider' ? obj.time + sliderDur : obj.type === 'spinner' ? obj.end : obj.time
    const appearTime = obj.time - preempt

    objects.push({
      x: obj.x, y: obj.y, time: obj.time, type: obj.type,
      end: obj.end, slides: obj.slides,
      color, num, sliderPath, sliderPathLen, sliderDur,
      hitTime, appearTime, fadeOutEnd: hitTime + 200,
    })
  }

  // Sort by time for binary search
  // (already sorted from parser, but ensure)
  return objects
}

// Fast position on path using total length
function posOnPath(path, pathLen, t) {
  if (path.length < 2) return path[0] || { x: 256, y: 192 }
  let target = t * pathLen, dist = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x, dy = path[i].y - path[i - 1].y
    const seg = Math.sqrt(dx * dx + dy * dy)
    if (dist + seg >= target) {
      const frac = seg > 0 ? (target - dist) / seg : 0
      return { x: path[i - 1].x + dx * frac, y: path[i - 1].y + dy * frac }
    }
    dist += seg
  }
  return path[path.length - 1]
}

// --- Component ---

function OsuPlayfield({ hitObjects, difficulty, timingPoints = [], currentTimeRef, transparent = false, storyboardAlign = false, widescreen = false, overlayCanvasRef = null, className = '', style = {} }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const sizeRef = useRef({ w: 640, h: 480 })

  const cs = difficulty?.circleSize ?? 4
  const ar = difficulty?.ar ?? difficulty?.od ?? 5
  const { preempt, fadeIn } = getAR(ar)
  const radius = getCS(cs)

  // Precompute all object data once
  const objects = useMemo(() => precomputeObjects(hitObjects, difficulty, timingPoints), [hitObjects, difficulty, timingPoints])

  // Resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      const h = Math.floor(entry.contentRect.height)
      if (w > 0 && h > 0) sizeRef.current = { w, h }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Render loop
  useEffect(() => {
    if (!objects.length) return

    const isOverlayMode = !!overlayCanvasRef
    const canvas = isOverlayMode ? null : canvasRef.current
    if (!isOverlayMode && !canvas) return

    let running = true
    const fpsData = { frames: 0, lastTime: performance.now(), fps: 0 }
    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d')

    // Expose offscreen canvas to parent for WebGL texture upload
    if (overlayCanvasRef) overlayCanvasRef.current = offscreen

    // Pre-render slider bodies to cached canvases (static — only ball moves per frame)
    const sliderCaches = new Map()
    const sliderPath2Ds = new Map()
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i]
      if (obj.type !== 'slider' || !obj.sliderPath || obj.sliderPath.length < 2) continue
      const p = new Path2D()
      p.moveTo(obj.sliderPath[0].x, obj.sliderPath[0].y)
      for (let j = 1; j < obj.sliderPath.length; j++) p.lineTo(obj.sliderPath[j].x, obj.sliderPath[j].y)
      sliderPath2Ds.set(i, p)

      // Compute bounding box for the cached canvas
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const pt of obj.sliderPath) {
        if (pt.x < minX) minX = pt.x; if (pt.y < minY) minY = pt.y
        if (pt.x > maxX) maxX = pt.x; if (pt.y > maxY) maxY = pt.y
      }
      const pad = radius + 8
      const bx = minX - pad, by = minY - pad
      const bw2 = maxX - minX + pad * 2, bh = maxY - minY + pad * 2
      if (bw2 <= 0 || bh <= 0) continue

      const sc = document.createElement('canvas')
      sc.width = Math.ceil(bw2)
      sc.height = Math.ceil(bh)
      const sctx = sc.getContext('2d')
      sctx.translate(-bx, -by)
      sctx.lineCap = 'round'
      sctx.lineJoin = 'round'

      const borderW = 3
      // White border
      sctx.strokeStyle = '#ffffff'
      sctx.lineWidth = radius * 2 + borderW * 2
      sctx.stroke(p)
      // Destination-out hole
      sctx.save()
      sctx.globalCompositeOperation = 'destination-out'
      sctx.strokeStyle = '#000'
      sctx.lineWidth = radius * 2
      sctx.stroke(p)
      sctx.restore()
      // Transparent body
      sctx.strokeStyle = 'rgba(0,0,0,0.3)'
      sctx.lineWidth = radius * 2
      sctx.stroke(p)
      // Color tint
      sctx.strokeStyle = obj.color + '15'
      sctx.lineWidth = radius * 1.5
      sctx.stroke(p)
      // Highlight
      sctx.strokeStyle = 'rgba(255,255,255,0.07)'
      sctx.lineWidth = radius * 0.5
      sctx.stroke(p)
      // Tail circle
      const tail = obj.sliderPath[obj.sliderPath.length - 1]
      sctx.beginPath()
      sctx.arc(tail.x, tail.y, radius, 0, Math.PI * 2)
      sctx.strokeStyle = '#ffffff'
      sctx.lineWidth = borderW
      sctx.stroke()
      sctx.beginPath()
      sctx.arc(tail.x, tail.y, radius - borderW, 0, Math.PI * 2)
      sctx.fillStyle = 'rgba(0,0,0,0.25)'
      sctx.fill()

      sliderCaches.set(i, { canvas: sc, x: bx, y: by })
    }

    function frame() {
      if (!running) return

      // In overlay mode, size comes from the parent (StoryboardRenderer sets it on the offscreen canvas)
      // In standalone mode, size comes from the container
      const w = isOverlayMode ? (offscreen.width || 640) : sizeRef.current.w
      const h = isOverlayMode ? (offscreen.height || 480) : sizeRef.current.h
      const dpr = isOverlayMode ? 1 : (window.devicePixelRatio || 1)

      if (!isOverlayMode) {
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr; canvas.height = h * dpr
          canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
        }
        if (offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
          offscreen.width = canvas.width; offscreen.height = canvas.height
        }
      }

      const ctx = offCtx
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Coordinate mapping
      let scale, oX, oY
      if (storyboardAlign) {
        const SB_W = widescreen ? 854 : 640, SB_H = 480
        const PF_X = widescreen ? 171 : 64, PF_Y = 48
        scale = h / SB_H
        oX = (w - SB_W * scale) / 2 + PF_X * scale
        oY = PF_Y * scale
      } else {
        const pad = 10
        scale = Math.min((w - pad * 2) / OSU_W, (h - pad * 2) / OSU_H)
        oX = (w - OSU_W * scale) / 2
        oY = (h - OSU_H * scale) / 2
      }
      const sr = radius * scale
      const bw = Math.max(1.5, 2.5 * scale)
      const time = currentTimeRef?.current || 0

      ctx.clearRect(0, 0, w, h)
      if (!transparent) {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 1
        ctx.strokeRect(oX, oY, OSU_W * scale, OSU_H * scale)
      }

      // Binary search: find first object that could be visible
      // Objects sorted by time. Visible if time >= appearTime && time <= fadeOutEnd
      // appearTime = obj.time - preempt, fadeOutEnd = hitTime + 200
      // So earliest visible: obj.time - preempt <= time → obj.time <= time + preempt
      // Latest visible: fadeOutEnd >= time

      // Find first object where fadeOutEnd >= time (binary search)
      let lo = 0, hi = objects.length
      while (lo < hi) { const mid = (lo + hi) >> 1; objects[mid].fadeOutEnd < time ? lo = mid + 1 : hi = mid }

      // Collect visible from lo, stop when appearTime > time
      const visible = []
      for (let i = lo; i < objects.length; i++) {
        const obj = objects[i]
        if (obj.appearTime > time) break
        if (obj.fadeOutEnd >= time) visible.push(i)
      }

      // Draw in reverse (later objects behind earlier ones)
      // Set transform once for playfield coordinate space
      ctx.save()
      ctx.translate(oX, oY)
      ctx.scale(scale, scale)

      for (let v = visible.length - 1; v >= 0; v--) {
        const idx = visible[v]
        const obj = objects[idx]

        // Fade
        let alpha = 1
        if (time < obj.appearTime + fadeIn) alpha = (time - obj.appearTime) / fadeIn
        if (time > obj.hitTime) alpha = 1 - (time - obj.hitTime) / 200
        if (alpha <= 0) continue
        ctx.globalAlpha = alpha

        if (obj.type === 'circle') {
          drawCircleFast(ctx, obj.x, obj.y, radius, bw / scale, obj.color, time, obj.time, obj.appearTime, obj.num)
        } else if (obj.type === 'slider') {
          // Blit cached slider body (single drawImage instead of 5 strokes)
          const cache = sliderCaches.get(idx)
          if (cache) {
            ctx.drawImage(cache.canvas, cache.x, cache.y)
          }
          const path = obj.sliderPath
          if (path && path.length >= 2) {
            // Head circle
            drawCircleFast(ctx, path[0].x, path[0].y, radius, bw / scale, obj.color, time, obj.time, obj.appearTime, obj.num)
            // Slider ball
            if (time >= obj.time && time <= obj.hitTime) {
              const elapsed = time - obj.time
              const slideTime = obj.sliderDur / obj.slides
              const slideIdx = Math.floor(elapsed / slideTime)
              let t = (elapsed % slideTime) / slideTime
              if (slideIdx % 2 === 1) t = 1 - t
              const pos = posOnPath(path, obj.sliderPathLen, Math.max(0, Math.min(1, t)))
              ctx.beginPath()
              ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
              ctx.fillStyle = '#ffffff'
              ctx.fill()
              ctx.beginPath()
              ctx.arc(pos.x, pos.y, radius - bw / scale, 0, Math.PI * 2)
              ctx.fillStyle = obj.color
              ctx.fill()
            }
          }
        } else if (obj.type === 'spinner') {
          // Simple spinner in playfield coords
          const cx = 256, cy = 192, maxR = 150
          const progress = Math.max(0, Math.min(1, (time - obj.time) / (obj.end - obj.time)))
          ctx.beginPath()
          ctx.arc(cx, cy, maxR * (1 - progress * 0.3), 0, Math.PI * 2)
          ctx.strokeStyle = '#ffffff88'
          ctx.lineWidth = 3 / scale
          ctx.stroke()
          const angle = (time / 100) % (Math.PI * 2)
          ctx.beginPath()
          ctx.arc(cx + Math.cos(angle) * maxR * 0.5, cy + Math.sin(angle) * maxR * 0.5, 6 / scale, 0, Math.PI * 2)
          ctx.fillStyle = '#ffcc44'
          ctx.fill()
        }
      }

      ctx.restore()
      ctx.globalAlpha = 1

      // FPS
      fpsData.frames++
      const now = performance.now()
      if (now - fpsData.lastTime >= 1000) { fpsData.fps = fpsData.frames; fpsData.frames = 0; fpsData.lastTime = now }
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(4, 4, 52, 18)
      ctx.fillStyle = fpsData.fps >= 50 ? '#44ff44' : fpsData.fps >= 30 ? '#ffcc00' : '#ff4444'
      ctx.fillText(fpsData.fps + ' fps', 10, 17)

      // Composite to display canvas (standalone mode only)
      if (!isOverlayMode) {
        const displayCtx = canvas.getContext('2d')
        displayCtx.setTransform(1, 0, 0, 1, 0, 0)
        displayCtx.clearRect(0, 0, canvas.width, canvas.height)
        displayCtx.drawImage(offscreen, 0, 0)
      }

      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
    return () => {
      running = false
      if (overlayCanvasRef) overlayCanvasRef.current = null
    }
  }, [objects, cs, ar, preempt, fadeIn, radius, transparent, storyboardAlign, widescreen, overlayCanvasRef])

  // In overlay mode, render nothing visible — the parent draws our offscreen canvas
  if (overlayCanvasRef) return null
  if (!objects.length) return null

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

// --- Fast draw functions (work in playfield coordinate space, no per-pixel transforms) ---

function drawCircleFast(ctx, x, y, r, bw, color, time, hitTime, appearTime, num) {
  // White border + color ring as single thick stroke
  ctx.beginPath()
  ctx.arc(x, y, r - bw * 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = bw
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fill()

  // Transparent interior with highlight
  ctx.beginPath()
  ctx.arc(x, y, r - bw * 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fill()

  // Combo number
  if (num !== undefined) {
    const fontSize = r * 0.9
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(num, x, y)
  }

  // Approach circle
  if (time < hitTime) {
    const t = (hitTime - time) / (hitTime - appearTime)
    ctx.beginPath()
    ctx.arc(x, y, r * (1 + t * 2.5), 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = bw
    ctx.stroke()
  }
}

export default memo(OsuPlayfield)
