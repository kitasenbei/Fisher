/**
 * Get the effective SV multiplier at a given time.
 */
export function svAtTime(timingPoints, ms) {
  let sv = 1
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    const tp = timingPoints[i]
    if (tp.offset <= ms && !tp.uninherited) {
      sv = tp.svMultiplier ?? 1
      break
    }
  }
  return sv
}

/**
 * Get the BPM at a given time.
 */
export function bpmAtTime(timingPoints, ms) {
  let bpm = 120
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    const tp = timingPoints[i]
    if (tp.offset <= ms && tp.uninherited) {
      bpm = tp.bpm
      break
    }
  }
  return bpm
}

/**
 * Get ms-per-beat at a given time from the active BPM point.
 */
export function msPerBeatAtTime(timingPoints, ms) {
  for (let i = timingPoints.length - 1; i >= 0; i--) {
    const tp = timingPoints[i]
    if (tp.offset <= ms && tp.uninherited) {
      return tp.msPerBeat
    }
  }
  return 500 // default 120 BPM
}

/**
 * Snap a time value to the nearest beat subdivision.
 */
export function snapToBeat(ms, timingPoints, divisor = 4) {
  const mpb = msPerBeatAtTime(timingPoints, ms)
  const bpmPoint = timingPoints.find((tp) => tp.uninherited && tp.offset <= ms)
  const origin = bpmPoint ? bpmPoint.offset : 0
  const interval = mpb / divisor
  const relative = ms - origin
  const snapped = Math.round(relative / interval) * interval
  return origin + snapped
}

// --- Pattern generators ---

export function linearRamp(startMs, endMs, startSV, endSV, count) {
  const points = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    points.push({
      offset: startMs + t * (endMs - startMs),
      svMultiplier: startSV + t * (endSV - startSV),
      msPerBeat: -100 / (startSV + t * (endSV - startSV)),
      meter: 4,
      sampleSet: 0,
      sampleIndex: 0,
      volume: 100,
      uninherited: false,
      effects: 0,
    })
  }
  return points
}

export function exponentialRamp(startMs, endMs, startSV, endSV, count, exponent = 2) {
  const points = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    const curved = Math.pow(t, exponent)
    const sv = startSV + curved * (endSV - startSV)
    points.push({
      offset: startMs + t * (endMs - startMs),
      svMultiplier: sv,
      msPerBeat: -100 / sv,
      meter: 4,
      sampleSet: 0,
      sampleIndex: 0,
      volume: 100,
      uninherited: false,
      effects: 0,
    })
  }
  return points
}

export function stutterPattern(startMs, msPerBeat, highSV, lowSV, count) {
  const points = []
  for (let i = 0; i < count; i++) {
    const offset = startMs + i * msPerBeat
    const sv = i % 2 === 0 ? highSV : lowSV
    points.push({
      offset,
      svMultiplier: sv,
      msPerBeat: -100 / sv,
      meter: 4,
      sampleSet: 0,
      sampleIndex: 0,
      volume: 100,
      uninherited: false,
      effects: 0,
    })
  }
  return points
}

export function sineWave(startMs, endMs, centerSV, amplitude, count) {
  const points = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    const sv = centerSV + amplitude * Math.sin(t * Math.PI * 2)
    const clamped = Math.max(0.1, sv)
    points.push({
      offset: startMs + t * (endMs - startMs),
      svMultiplier: clamped,
      msPerBeat: -100 / clamped,
      meter: 4,
      sampleSet: 0,
      sampleIndex: 0,
      volume: 100,
      uninherited: false,
      effects: 0,
    })
  }
  return points
}
