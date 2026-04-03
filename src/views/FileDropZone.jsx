import { useState, useEffect, useCallback } from 'react'
import JSZip from 'jszip'
import { useEditor } from '../stores/editorStore'
import { parse, parseStoryboard } from '../lib/osuParser'

const flush = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

async function extractOsz(file, onProgress) {
  onProgress?.({ message: 'Reading archive...', progress: 0 })
  await flush()
  const zip = await JSZip.loadAsync(file)
  const osuFiles = []
  let bgUrl = null
  let osbStoryboard = null

  onProgress?.({ message: 'Parsing storyboard...', progress: 10 })
  await flush()

  // Parse only root-level .osb file (sb/ folder contains editor source files, not storyboard data)
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.endsWith('.osb') || path.includes('/')) continue
    const text = await entry.async('text')
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    osbStoryboard = parseStoryboard(lines)
    break
  }

  const osuEntries = Object.entries(zip.files).filter(([p, e]) => !e.dir && p.endsWith('.osu'))
  for (let i = 0; i < osuEntries.length; i++) {
    const [path, entry] = osuEntries[i]
    const pct = 20 + Math.round((i / osuEntries.length) * 50)
    onProgress?.({ message: `Parsing ${path.split('/').pop()}...`, progress: pct })
    await flush()
    const text = await entry.async('text')
    const parsed = parse(text)
    // Merge .osb storyboard with .osu storyboard
    if (osbStoryboard) {
      const ws = !!parsed.general.widescreenStoryboard
      if (!parsed.storyboard) {
        parsed.storyboard = { ...osbStoryboard, widescreen: ws }
      } else {
        // Combine: .osb sprites get IDs shifted past .osu sprites
        const osuSb = parsed.storyboard
        const idOffset = osuSb.sprites.length ? Math.max(...osuSb.sprites.map((s) => s.id)) + 1 : 0
        const shiftedSprites = osbStoryboard.sprites.map((s) => ({ ...s, id: s.id + idOffset }))
        const shiftedCmds = osbStoryboard.commands.map((c) => ({ ...c, sprite_id: c.sprite_id + idOffset }))
        const mergedImages = [...osuSb.images]
        for (const img of osbStoryboard.images) {
          if (!mergedImages.includes(img)) mergedImages.push(img)
        }
        parsed.storyboard = {
          sprites: [...osuSb.sprites, ...shiftedSprites],
          commands: [...osuSb.commands, ...shiftedCmds],
          images: mergedImages,
          widescreen: ws,
        }
      }
    }
    osuFiles.push({ name: path, text, parsed })
  }

  onProgress?.({ message: 'Loading background...', progress: 80 })

  // Extract background image from the first .osu that has one
  for (const f of osuFiles) {
    const bgName = f.parsed.general.backgroundFilename
    if (!bgName) continue
    const bgEntry =
      zip.files[bgName] || zip.files[Object.keys(zip.files).find((k) => k.toLowerCase() === bgName.toLowerCase())]
    if (bgEntry) {
      const blob = await bgEntry.async('blob')
      bgUrl = URL.createObjectURL(blob)
      break
    }
  }

  onProgress?.({ message: 'Done', progress: 100 })
  return { osuFiles, zip, bgUrl }
}

export async function loadDifficulty(chosen, zip, dispatch, audio) {
  dispatch('SET_LOADING', { message: 'Loading audio...', progress: 0 })
  await flush()

  // Load audio referenced by the chosen difficulty
  if (chosen.parsed.general.audioFilename) {
    const audioName = chosen.parsed.general.audioFilename
    const audioEntry =
      zip.files[audioName] || zip.files[Object.keys(zip.files).find((k) => k.toLowerCase() === audioName.toLowerCase())]
    if (audioEntry) {
      const blob = await audioEntry.async('blob')
      const audioFile = new File([blob], audioName, { type: 'audio/mpeg' })
      dispatch('SET_LOADING', { message: 'Decoding audio...', progress: 30 })
      await flush()
      await audio.load(audioFile)
      dispatch('SET_AUDIO', audioFile)
    }
  }

  dispatch('SET_LOADING', { message: 'Loading beatmap...', progress: 60 })
  await flush()
  dispatch('LOAD_FILE', { raw: chosen.text, parsed: chosen.parsed, filename: chosen.name })

  // Extract storyboard images from zip
  const sb = chosen.parsed.storyboard
  if (sb?.images?.length && zip) {
    const urls = {}
    const images = sb.images
    for (let i = 0; i < images.length; i++) {
      const imgPath = images[i]
      const pct = 70 + Math.round((i / images.length) * 25)
      dispatch('SET_LOADING', { message: `Loading sprite ${i + 1}/${images.length}...`, progress: pct })
      // Yield every 5 sprites so the bar visually updates
      if (i % 5 === 0) await flush()
      const normalized = imgPath.replace(/\\/g, '/')
      const entry =
        zip.files[imgPath] ||
        zip.files[normalized] ||
        zip.files[Object.keys(zip.files).find((k) => k.replace(/\\/g, '/').toLowerCase() === normalized.toLowerCase())]
      if (entry) {
        const blob = await entry.async('blob')
        urls[normalized] = URL.createObjectURL(blob)
      }
    }
    dispatch('SET_STORYBOARD_URLS', urls)
  } else {
    dispatch('SET_STORYBOARD_URLS', null)
  }

  dispatch('SET_LOADING', { message: 'Done', progress: 100 })
  await new Promise((r) => setTimeout(r, 300))
  dispatch('CLEAR_LOADING')
}

export default function FileDropZone() {
  const { dispatch, audio } = useEditor()

  const handleFiles = useCallback(
    async (files) => {
      const onProgress = (p) => dispatch('SET_LOADING', p)
      for (const file of files) {
        if (file.name.endsWith('.osz')) {
          const extracted = await extractOsz(file, onProgress)
          if (extracted.osuFiles.length === 1) {
            await loadDifficulty(extracted.osuFiles[0], extracted.zip, dispatch, audio)
          } else if (extracted.osuFiles.length > 1) {
            dispatch('CLEAR_LOADING')
            dispatch('SET_PENDING_OSZ', extracted)
          }
        } else if (file.name.endsWith('.osu')) {
          const text = await file.text()
          const parsed = parse(text)
          dispatch('LOAD_FILE', { raw: text, parsed, filename: file.name })
        } else if (file.name.match(/\.(mp3|ogg|wav)$/i)) {
          await audio.load(file)
          dispatch('SET_AUDIO', file)
        }
      }
    },
    [dispatch, audio],
  )

  // Window drag/drop listeners
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let dragCount = 0
    function onDragEnter(e) {
      e.preventDefault()
      dragCount++
      setDragging(true)
    }
    function onDragLeave(e) {
      e.preventDefault()
      dragCount--
      if (dragCount <= 0) {
        dragCount = 0
        setDragging(false)
      }
    }
    function onDragOver(e) {
      e.preventDefault()
    }
    function onDrop(e) {
      e.preventDefault()
      dragCount = 0
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleFiles])

  if (!dragging) return null

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center pointer-events-none">
      <div className="bg-[#2b2b2b] border-2 border-dashed border-[#2d8ceb] rounded-[6px] px-12 py-10 text-center">
        <div className="text-[16px] text-[#cccccc] mb-2">Drop files here</div>
        <div className="text-[12px] text-[#999999]">.osz, .osu, or audio (.mp3, .ogg, .wav)</div>
      </div>
    </div>
  )
}

export function FileOpenButton() {
  const { dispatch, audio } = useEditor()

  function handleClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.osz,.osu,.mp3,.ogg,.wav'
    input.onchange = async (e) => {
      const onProgress = (p) => dispatch('SET_LOADING', p)
      for (const file of e.target.files) {
        if (file.name.endsWith('.osz')) {
          const extracted = await extractOsz(file, onProgress)
          if (extracted.osuFiles.length === 1) {
            await loadDifficulty(extracted.osuFiles[0], extracted.zip, dispatch, audio)
          } else if (extracted.osuFiles.length > 1) {
            dispatch('CLEAR_LOADING')
            dispatch('SET_PENDING_OSZ', extracted)
          }
        } else if (file.name.endsWith('.osu')) {
          const text = await file.text()
          const parsed = parse(text)
          dispatch('LOAD_FILE', { raw: text, parsed, filename: file.name })
        } else if (file.name.match(/\.(mp3|ogg|wav)$/i)) {
          await audio.load(file)
          dispatch('SET_AUDIO', file)
        }
      }
    }
    input.click()
  }

  return handleClick
}
