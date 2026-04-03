const LAYER_MAP = { Background: 0, Fail: 1, Pass: 2, Foreground: 3, Overlay: 4 }
const ORIGIN_MAP = {
  TopLeft: 0,
  Centre: 1,
  CentreLeft: 2,
  TopRight: 3,
  BottomCentre: 4,
  TopCentre: 5,
  Custom: 6,
  CentreRight: 7,
  BottomLeft: 8,
  BottomRight: 9,
}

/**
 * Parse storyboard from raw .osu/.osb lines.
 */
export function parseStoryboard(lines, widescreen = false) {
  const sprites = []
  const commands = []
  const images = []
  let inEvents = false
  let currentSpriteId = -1
  let spriteIdCounter = 0
  let inLoop = false
  let loopCommand = null

  for (const line of lines) {
    const stripped = line.trim()

    if (stripped === '[Events]') {
      inEvents = true
      continue
    }
    if (stripped.startsWith('[') && stripped.endsWith(']')) {
      if (inEvents) break
      continue
    }
    if (!inEvents || !stripped || stripped.startsWith('//')) continue

    const isCommand = line.startsWith('_') || line.startsWith(' ')

    let indentDepth = 0
    for (const ch of line) {
      if (ch === ' ' || ch === '_') indentDepth++
      else break
    }

    if (inLoop && loopCommand && isCommand && indentDepth === 1) {
      commands.push(loopCommand)
      inLoop = false
      loopCommand = null
    }

    if (isCommand && currentSpriteId >= 0) {
      const cmdLine = stripped.replace(/^_+/, '')
      const parts = cmdLine.split(',')
      if (!parts.length) continue
      const cmdType = parts[0]

      if (cmdType === 'L' && parts.length >= 3) {
        const startTime = parseInt(parts[1])
        const loopCount = parseInt(parts[2])
        if (!isNaN(startTime) && !isNaN(loopCount)) {
          loopCommand = {
            sprite_id: currentSpriteId,
            type: 'L',
            easing: 0,
            start_time: startTime,
            end_time: startTime,
            params: [],
            loop_count: loopCount,
            sub_commands: [],
          }
          inLoop = true
        }
      } else if (cmdType === 'T' && parts.length >= 4) {
        const triggerName = parts[1]
        const startTime = parseInt(parts[2])
        const endTime = parts.length > 3 ? parseInt(parts[3]) : startTime
        if (!isNaN(startTime)) {
          loopCommand = {
            sprite_id: currentSpriteId,
            type: 'T',
            easing: 0,
            start_time: startTime,
            end_time: endTime || startTime,
            params: [],
            loop_count: null,
            sub_commands: [],
            trigger_name: triggerName,
          }
          inLoop = true
        }
      } else if ('F M MX MY S V R C P'.split(' ').includes(cmdType)) {
        const easing = parts.length > 1 ? parseInt(parts[1]) || 0 : 0
        const startTime = parts.length > 2 ? parseInt(parts[2]) || 0 : 0
        const endTimeStr = parts.length > 3 ? parts[3] : ''
        const endTime = endTimeStr ? parseInt(endTimeStr) || startTime : startTime

        const params = []
        for (let i = 4; i < parts.length; i++) {
          if (!parts[i]) continue
          if (cmdType === 'P') params.push(parts[i])
          else {
            const n = parseFloat(parts[i])
            if (!isNaN(n)) params.push(n)
          }
        }

        const command = {
          sprite_id: currentSpriteId,
          type: cmdType,
          easing,
          start_time: startTime,
          end_time: endTime,
          params,
          loop_count: null,
          sub_commands: null,
        }

        if (inLoop && loopCommand?.sub_commands) loopCommand.sub_commands.push(command)
        else commands.push(command)
      }
    } else {
      if (inLoop && loopCommand) {
        commands.push(loopCommand)
        inLoop = false
        loopCommand = null
      }

      const parts = stripped.split(',')
      const objType = parts[0]

      if (objType === 'Sprite' && parts.length >= 6) {
        const filepath = parts[3].replace(/"/g, '')
        const layer = LAYER_MAP[parts[1]] ?? (parseInt(parts[1]) || 0)
        const origin = ORIGIN_MAP[parts[2]] ?? (parseInt(parts[2]) || 1)
        sprites.push({
          id: spriteIdCounter,
          type: 'sprite',
          layer,
          origin,
          filepath,
          x: parseFloat(parts[4]),
          y: parseFloat(parts[5]),
          frame_count: null,
          frame_delay: null,
          loop_type: null,
        })
        currentSpriteId = spriteIdCounter++
        if (!images.includes(filepath)) images.push(filepath)
      } else if (objType === 'Animation' && parts.length >= 9) {
        const filepath = parts[3].replace(/"/g, '')
        const layer = LAYER_MAP[parts[1]] ?? (parseInt(parts[1]) || 0)
        const origin = ORIGIN_MAP[parts[2]] ?? (parseInt(parts[2]) || 1)
        const frameCount = parseInt(parts[6])
        const frameDelay = parseFloat(parts[7])
        const loopType = parts[8] || 'LoopForever'
        sprites.push({
          id: spriteIdCounter,
          type: 'animation',
          layer,
          origin,
          filepath,
          x: parseFloat(parts[4]),
          y: parseFloat(parts[5]),
          frame_count: frameCount,
          frame_delay: frameDelay,
          loop_type: loopType,
        })
        currentSpriteId = spriteIdCounter++
        const dotIdx = filepath.lastIndexOf('.')
        const base = dotIdx > 0 ? filepath.slice(0, dotIdx) : filepath
        const ext = dotIdx > 0 ? filepath.slice(dotIdx) : '.png'
        for (let i = 0; i < frameCount; i++) {
          const fp = base + i + ext
          if (!images.includes(fp)) images.push(fp)
        }
      }
    }
  }

  if (inLoop && loopCommand) commands.push(loopCommand)
  if (!sprites.length && !commands.length) return null

  return { sprites, commands, images, widescreen }
}

/**
 * Parse a .osu file string into structured data.
 * Preserves raw sections for round-trip serialization.
 */
export function parse(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const rawSections = new Map()
  const general = {}
  const metadata = {}
  const difficulty = {}
  const timingPoints = []
  const hitObjects = []

  let currentSection = null
  let sectionLines = []

  function flushSection() {
    if (currentSection) {
      rawSections.set(currentSection, sectionLines.join('\n'))
    }
  }

  for (const line of lines) {
    const sectionMatch = line.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      flushSection()
      currentSection = sectionMatch[1]
      sectionLines = []
      continue
    }
    sectionLines.push(line)

    if (!currentSection) continue
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) continue

    if (currentSection === 'Events') {
      // Background image: 0,0,"filename.jpg",0,0
      const bgMatch = trimmed.match(/^0,0,"(.+?)"/)
      if (bgMatch) general.backgroundFilename = bgMatch[1]
    }

    if (currentSection === 'General') {
      const [key, ...valParts] = trimmed.split(':')
      const val = valParts.join(':').trim()
      if (key === 'AudioFilename') general.audioFilename = val
      if (key === 'Mode') general.mode = parseInt(val)
      if (key === 'PreviewTime') general.previewTime = parseInt(val)
      if (key === 'WidescreenStoryboard') general.widescreenStoryboard = val.trim() === '1'
    }

    if (currentSection === 'Metadata') {
      const [key, ...valParts] = trimmed.split(':')
      const val = valParts.join(':').trim()
      if (key === 'Title') metadata.title = val
      if (key === 'TitleUnicode') metadata.titleUnicode = val
      if (key === 'Artist') metadata.artist = val
      if (key === 'ArtistUnicode') metadata.artistUnicode = val
      if (key === 'Creator') metadata.creator = val
      if (key === 'Version') metadata.version = val
      if (key === 'BeatmapID') metadata.beatmapId = parseInt(val)
      if (key === 'BeatmapSetID') metadata.beatmapSetId = parseInt(val)
    }

    if (currentSection === 'Difficulty') {
      const [key, ...valParts] = trimmed.split(':')
      const val = valParts.join(':').trim()
      if (key === 'CircleSize') difficulty.circleSize = parseFloat(val)
      if (key === 'OverallDifficulty') difficulty.od = parseFloat(val)
      if (key === 'ApproachRate') difficulty.ar = parseFloat(val)
      if (key === 'SliderMultiplier') difficulty.sliderMultiplier = parseFloat(val)
      if (key === 'SliderTickRate') difficulty.sliderTickRate = parseFloat(val)
    }

    if (currentSection === 'HitObjects') {
      const parts = trimmed.split(',')
      if (parts.length >= 4) {
        const x = parseInt(parts[0])
        const y = parseInt(parts[1])
        const time = parseInt(parts[2])
        const type = parseInt(parts[3])
        const newCombo = !!(type & 4)
        const isMania = (general.mode || 0) === 3

        if (isMania) {
          const keyCount = difficulty.circleSize || 4
          const col = Math.floor((x * keyCount) / 512)
          if (type & 128) {
            const extras = parts.slice(5).join(',')
            const endTime = parseInt(extras.split(':')[0])
            hitObjects.push({ col, time, type: 'hold', end: endTime })
          } else {
            hitObjects.push({ col, time, type: 'tap' })
          }
        } else {
          // Standard / Taiko / Catch
          if (type & 2) {
            // Slider
            const curveData = parts[5] || ''
            const [curveType, ...curvePointStrs] = curveData.split('|')
            const curvePoints = [{ x, y }]
            for (const cp of curvePointStrs) {
              const [cx, cy] = cp.split(':').map(Number)
              if (!isNaN(cx) && !isNaN(cy)) curvePoints.push({ x: cx, y: cy })
            }
            const slides = parseInt(parts[6]) || 1
            const length = parseFloat(parts[7]) || 0
            hitObjects.push({ x, y, time, type: 'slider', curveType, curvePoints, slides, length, newCombo })
          } else if (type & 8) {
            // Spinner
            const endTime = parseInt(parts[5]) || time
            hitObjects.push({ x: 256, y: 192, time, type: 'spinner', end: endTime, newCombo: true })
          } else {
            // Circle
            hitObjects.push({ x, y, time, type: 'circle', newCombo })
          }
        }
      }
    }

    if (currentSection === 'TimingPoints') {
      const parts = trimmed.split(',')
      if (parts.length >= 2) {
        const offset = parseFloat(parts[0])
        const msPerBeat = parseFloat(parts[1])
        const uninherited = parts.length >= 7 ? parseInt(parts[6]) === 1 : msPerBeat > 0

        const point = {
          offset,
          msPerBeat,
          meter: parts.length >= 3 ? parseInt(parts[2]) : 4,
          sampleSet: parts.length >= 4 ? parseInt(parts[3]) : 0,
          sampleIndex: parts.length >= 5 ? parseInt(parts[4]) : 0,
          volume: parts.length >= 6 ? parseInt(parts[5]) : 100,
          uninherited,
          effects: parts.length >= 8 ? parseInt(parts[7]) : 0,
        }

        if (uninherited) {
          point.bpm = 60000 / msPerBeat
        } else {
          point.svMultiplier = msPerBeat < 0 ? -100 / msPerBeat : 1
        }

        timingPoints.push(point)
      }
    }
  }
  flushSection()

  timingPoints.sort((a, b) => a.offset - b.offset)

  hitObjects.sort((a, b) => a.time - b.time)

  const storyboard = parseStoryboard(lines, !!general.widescreenStoryboard)

  return { rawSections, general, metadata, difficulty, hitObjects, timingPoints, storyboard }
}

/**
 * Serialize structured data back to .osu file text.
 * Replaces only the [TimingPoints] section, preserving everything else.
 */
export function serialize(parsed) {
  const { rawSections, timingPoints } = parsed
  const lines = []

  // Rebuild file version header
  lines.push('osu file format v14')
  lines.push('')

  for (const [section, content] of rawSections) {
    lines.push(`[${section}]`)
    if (section === 'TimingPoints') {
      for (const tp of timingPoints) {
        const msPerBeat = tp.uninherited ? tp.msPerBeat : -100 / (tp.svMultiplier ?? 1)
        lines.push(
          [
            Math.round(tp.offset),
            msPerBeat,
            tp.meter,
            tp.sampleSet,
            tp.sampleIndex,
            tp.volume,
            tp.uninherited ? 1 : 0,
            tp.effects,
          ].join(','),
        )
      }
    } else {
      lines.push(content)
    }
    lines.push('')
  }

  return lines.join('\n')
}
