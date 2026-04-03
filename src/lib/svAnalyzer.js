// Fisher Representation: SV Pattern Analyzer
// Analyzes raw timing points and fits mathematical curves to dense SV patterns.
// Raw data is never modified — segments are a read-only overlay.

const MIN_SEGMENT = 4 // minimum points to attempt curve fitting
const GAP_THRESHOLD = 2000 // ms gap to split into separate regions
const SV_TOLERANCE = 0.02 // tolerance for stutter value matching

// --- R² computation ---

function rSquared(actual, predicted) {
  const n = actual.length
  if (n < 2) return 0
  let mean = 0
  for (let i = 0; i < n; i++) mean += actual[i]
  mean /= n
  let ssTot = 0,
    ssRes = 0
  for (let i = 0; i < n; i++) {
    ssTot += (actual[i] - mean) ** 2
    ssRes += (actual[i] - predicted[i]) ** 2
  }
  return ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot
}

// --- Curve fitters ---
// Each returns { params, r2 } or null if the fit is invalid.
// All work on normalized t ∈ [0,1] and raw SV values.

function fitStutter(ts, svs) {
  // Detect alternating pattern between exactly 2 distinct SV values
  const vals = new Set()
  for (const sv of svs) {
    let matched = false
    for (const v of vals) {
      if (Math.abs(sv - v) < SV_TOLERANCE) {
        matched = true
        break
      }
    }
    if (!matched) vals.add(sv)
    if (vals.size > 2) return null
  }
  if (vals.size !== 2) return null

  const sorted = [...vals].sort((a, b) => a - b)
  const lowSV = sorted[0],
    highSV = sorted[1]

  // Check alternating pattern
  let prevHigh = Math.abs(svs[0] - highSV) < SV_TOLERANCE
  for (let i = 1; i < svs.length; i++) {
    const isHigh = Math.abs(svs[i] - highSV) < SV_TOLERANCE
    const isLow = Math.abs(svs[i] - lowSV) < SV_TOLERANCE
    if (!isHigh && !isLow) return null
    if (isHigh === prevHigh) return null // not alternating
    prevHigh = isHigh
  }

  // Compute median interval
  const intervals = []
  for (let i = 1; i < ts.length; i++) intervals.push(ts[i] - ts[i - 1])
  intervals.sort((a, b) => a - b)
  const interval = intervals[Math.floor(intervals.length / 2)]

  // Predicted values for R²
  const predicted = svs.map((_, i) => (i % 2 === 0 ? svs[0] : svs[1]))
  const r2 = rSquared(svs, predicted)

  return { params: { highSV, lowSV, interval }, r2 }
}

function fitLinear(ts, svs) {
  const n = ts.length
  let sumT = 0,
    sumSV = 0,
    sumTSV = 0,
    sumT2 = 0
  for (let i = 0; i < n; i++) {
    sumT += ts[i]
    sumSV += svs[i]
    sumTSV += ts[i] * svs[i]
    sumT2 += ts[i] * ts[i]
  }
  const denom = n * sumT2 - sumT * sumT
  if (Math.abs(denom) < 1e-10) return null

  const slope = (n * sumTSV - sumT * sumSV) / denom
  const intercept = (sumSV - slope * sumT) / n

  const predicted = ts.map((t) => slope * t + intercept)
  const r2 = rSquared(svs, predicted)

  const startSV = slope * ts[0] + intercept
  const endSV = slope * ts[ts.length - 1] + intercept

  return { params: { startSV, endSV, slope, intercept }, r2 }
}

function fitExponential(ts, svs) {
  // sv = a * t^exponent → log(sv) = log(a) + exponent * log(t)
  // Need all positive SV values and positive t values
  if (svs.some((v) => v <= 0)) return null

  // Shift t to avoid log(0): use t + small offset
  const tShift = ts.map((t) => t + 0.01)
  const logT = tShift.map(Math.log)
  const logSV = svs.map(Math.log)

  const fit = fitLinear(logT, logSV)
  if (!fit) return null

  const a = Math.exp(fit.params.intercept)
  const exponent = fit.params.slope

  const predicted = tShift.map((t) => a * Math.pow(t, exponent))
  const r2 = rSquared(svs, predicted)

  return {
    params: { startSV: svs[0], endSV: svs[svs.length - 1], exponent, a },
    r2,
  }
}

function fitSine(ts, svs) {
  const n = ts.length
  if (n < 6) return null // need enough points for a meaningful sine fit

  // Estimate parameters
  let mean = 0
  for (let i = 0; i < n; i++) mean += svs[i]
  mean /= n

  const amplitude = (Math.max(...svs) - Math.min(...svs)) / 2
  if (amplitude < 0.01) return null // flat, not a sine

  // Estimate frequency from zero-crossings (relative to mean)
  let crossings = 0
  for (let i = 1; i < n; i++) {
    if ((svs[i] - mean) * (svs[i - 1] - mean) < 0) crossings++
  }
  // Each full cycle has 2 crossings
  const tRange = ts[n - 1] - ts[0]
  if (tRange === 0) return null
  const cycles = crossings / 2
  const frequency = cycles > 0 ? (cycles * 2 * Math.PI) / tRange : (2 * Math.PI) / tRange

  // Estimate phase by finding first peak
  let phase = 0
  let bestCorr = -Infinity
  for (let p = 0; p < 20; p++) {
    const testPhase = (p / 20) * 2 * Math.PI
    let corr = 0
    for (let i = 0; i < n; i++) {
      corr += (svs[i] - mean) * Math.sin(frequency * (ts[i] - ts[0]) + testPhase)
    }
    if (corr > bestCorr) {
      bestCorr = corr
      phase = testPhase
    }
  }

  const predicted = ts.map((t) => mean + amplitude * Math.sin(frequency * (t - ts[0]) + phase))
  const r2 = rSquared(svs, predicted)

  return {
    params: { centerSV: mean, amplitude, frequency, phase },
    r2,
  }
}

function fitPolynomial(ts, svs) {
  // Quadratic: sv = a*t² + b*t + c via normal equations
  const n = ts.length
  let s0 = n,
    s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0
  let r0 = 0,
    r1 = 0,
    r2val = 0
  for (let i = 0; i < n; i++) {
    const t = ts[i],
      t2 = t * t,
      sv = svs[i]
    s1 += t
    s2 += t2
    s3 += t2 * t
    s4 += t2 * t2
    r0 += sv
    r1 += t * sv
    r2val += t2 * sv
  }

  // Solve 3x3 system: [s4 s3 s2; s3 s2 s1; s2 s1 s0] * [a;b;c] = [r2val;r1;r0]
  const M = [
    [s4, s3, s2],
    [s3, s2, s1],
    [s2, s1, s0],
  ]
  const R = [r2val, r1, r0]
  const sol = solve3x3(M, R)
  if (!sol) return null

  const [a, b, c] = sol
  const predicted = ts.map((t) => a * t * t + b * t + c)
  const r2 = rSquared(svs, predicted)

  return { params: { a, b, c }, r2 }
}

function solve3x3(M, R) {
  // Gaussian elimination with partial pivoting
  const m = M.map((row, i) => [...row, R[i]])
  for (let col = 0; col < 3; col++) {
    let maxRow = col,
      maxVal = Math.abs(m[col][col])
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row][col]) > maxVal) {
        maxVal = Math.abs(m[row][col])
        maxRow = row
      }
    }
    if (maxVal < 1e-12) return null
    ;[m[col], m[maxRow]] = [m[maxRow], m[col]]
    for (let row = col + 1; row < 3; row++) {
      const f = m[row][col] / m[col][col]
      for (let j = col; j < 4; j++) m[row][j] -= f * m[col][j]
    }
  }
  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i--) {
    x[i] = m[i][3]
    for (let j = i + 1; j < 3; j++) x[i] -= m[i][j] * x[j]
    x[i] /= m[i][i]
  }
  return x
}

// --- Segment evaluation ---

export function evaluateSegment(segment, t) {
  const { type, params } = segment
  switch (type) {
    case 'linear':
      return params.startSV + (params.endSV - params.startSV) * t
    case 'exponential':
      return params.a * Math.pow(t + 0.01, params.exponent)
    case 'sine':
      return (
        params.centerSV +
        params.amplitude * Math.sin(params.frequency * t * (segment.endMs - segment.startMs) + params.phase)
      )
    case 'polynomial':
      return params.a * t * t + params.b * t + params.c
    case 'stutter':
      return Math.round(t * (segment.pointCount - 1)) % 2 === 0 ? params.highSV : params.lowSV
    default:
      return 0
  }
}

// --- Viewport culling ---

export function segmentsForRange(segments, startMs, endMs) {
  const result = []
  for (const seg of segments) {
    if (seg.endMs < startMs) continue
    if (seg.startMs > endMs) break
    result.push(seg)
  }
  return result
}

// --- Main analyzer ---

const THRESHOLDS = {
  stutter: 0.95,
  linear: 0.98,
  exponential: 0.95,
  sine: 0.93,
  polynomial: 0.97,
}

function tryFitWindow(times, svs) {
  // Try fits in order of cheapness, return first that passes threshold
  const stutter = fitStutter(times, svs)
  if (stutter && stutter.r2 >= THRESHOLDS.stutter) return { type: 'stutter', ...stutter }

  const linear = fitLinear(times, svs)
  if (linear && linear.r2 >= THRESHOLDS.linear) return { type: 'linear', ...linear }

  const exp = fitExponential(times, svs)
  if (exp && exp.r2 >= THRESHOLDS.exponential) return { type: 'exponential', ...exp }

  const sine = fitSine(times, svs)
  if (sine && sine.r2 >= THRESHOLDS.sine) return { type: 'sine', ...sine }

  const poly = fitPolynomial(times, svs)
  if (poly && poly.r2 >= THRESHOLDS.polynomial) return { type: 'polynomial', ...poly }

  return null
}

export function analyzeSvPatterns(timingPoints) {
  // Extract SV-only points with their original indices
  const svPoints = []
  for (let i = 0; i < timingPoints.length; i++) {
    if (!timingPoints[i].uninherited) {
      svPoints.push({ idx: i, offset: timingPoints[i].offset, sv: timingPoints[i].svMultiplier ?? 1 })
    }
  }

  if (svPoints.length === 0) return []

  const segments = []
  let i = 0

  while (i < svPoints.length) {
    // Check for gap — if next point is too far, emit single point
    if (i + 1 < svPoints.length && svPoints[i + 1].offset - svPoints[i].offset > GAP_THRESHOLD) {
      segments.push({
        type: 'point',
        startIdx: svPoints[i].idx,
        endIdx: svPoints[i].idx,
        startMs: svPoints[i].offset,
        endMs: svPoints[i].offset,
        params: { sv: svPoints[i].sv },
        pointCount: 1,
        error: 1,
      })
      i++
      continue
    }

    // Not enough remaining points for a segment
    if (i + MIN_SEGMENT > svPoints.length) {
      for (let j = i; j < svPoints.length; j++) {
        segments.push({
          type: 'point',
          startIdx: svPoints[j].idx,
          endIdx: svPoints[j].idx,
          startMs: svPoints[j].offset,
          endMs: svPoints[j].offset,
          params: { sv: svPoints[j].sv },
          pointCount: 1,
          error: 1,
        })
      }
      break
    }

    // Greedy: try to extend window as far as possible
    let bestFit = null
    let bestEnd = i + MIN_SEGMENT - 1

    for (let end = i + MIN_SEGMENT - 1; end < svPoints.length; end++) {
      // Gap check within window
      if (end > i && svPoints[end].offset - svPoints[end - 1].offset > GAP_THRESHOLD) break

      const window = svPoints.slice(i, end + 1)
      const times = window.map((p) => p.offset)
      const svs = window.map((p) => p.sv)

      const fit = tryFitWindow(times, svs)
      if (fit) {
        bestFit = fit
        bestEnd = end
      } else if (bestFit) {
        // Fit degraded — use the last good one
        break
      } else if (end - i >= MIN_SEGMENT + 4) {
        // Tried enough without any fit, stop extending
        break
      }
    }

    if (bestFit) {
      segments.push({
        type: bestFit.type,
        startIdx: svPoints[i].idx,
        endIdx: svPoints[bestEnd].idx,
        startMs: svPoints[i].offset,
        endMs: svPoints[bestEnd].offset,
        params: bestFit.params,
        pointCount: bestEnd - i + 1,
        error: bestFit.r2,
      })
      i = bestEnd + 1
    } else {
      // No fit — emit single point
      segments.push({
        type: 'point',
        startIdx: svPoints[i].idx,
        endIdx: svPoints[i].idx,
        startMs: svPoints[i].offset,
        endMs: svPoints[i].offset,
        params: { sv: svPoints[i].sv },
        pointCount: 1,
        error: 1,
      })
      i++
    }
  }

  return segments
}
