import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  Download,
  Upload,
  Magnet,
  Volume2,
  MousePointer2,
  Hand,
  ZoomIn,
  Scan,
  Pencil,
  Eraser,
  Maximize2,
  AudioLines,
  SlidersHorizontal,
  List,
  Info,
  Eye,
  Grid3x3,
  Layers,
  Spline,
} from 'lucide-react'
import {
  MenuBar,
  StatusBar,
  Button,
  Tooltip,
  SegmentedControl,
  Slider,
  TransportControls,
  useToast,
  ToolStrip,
  PropertyPanel,
  PropertyRow,
  Checkbox,
  GizmoStrip,
  IconToggle,
  StoryboardRenderer,
  FloatingPanel,
  OsuPlayfield,
  precomputeObjects,
  getAR,
  getCS,
} from '../components'
import { useEditor } from '../stores/editorStore'
import { serialize } from '../lib/osuParser'
import { svAtTime, bpmAtTime } from '../lib/svMath'
import { analyzeSvPatterns } from '../lib/svAnalyzer'
import SVGraph from './SVGraph'
import PointInspector from './PointInspector'
import SegmentInspector from './SegmentInspector'
import TimingPointList from './TimingPointList'
import PatternDialog from './PatternDialog'
import DifficultyPicker from './DifficultyPicker'
import LoadingOverlay from './LoadingOverlay'
import FileDropZone, { FileOpenButton } from './FileDropZone'
import ManiaPreview from './ManiaPreview'

export default function EditorLayout() {
  const { state, dispatch, audio } = useEditor()
  const {
    timingPoints,
    playback,
    selection,
    snapEnabled,
    snapDivisor,
    activeTool,
    file,
    storyboardImageUrls,
    fisherSegments,
    fisherVersion,
    selectedSegment,
  } = state
  const storyboard = file?.parsed?.storyboard
  const isStdMode =
    file?.parsed?.general?.mode === 0 ||
    (file?.parsed?.general?.mode === undefined &&
      file?.parsed?.hitObjects?.some((o) => o.type === 'circle' || o.type === 'slider'))

  // Pre-computed playfield data for direct WebGL rendering in storyboard
  const playfieldData = useMemo(() => {
    if (!isStdMode || !file?.parsed?.hitObjects?.length) return null
    const diff = file.parsed.difficulty
    const objects = precomputeObjects(file.parsed.hitObjects, diff, timingPoints)
    const { preempt, fadeIn } = getAR(diff?.ar ?? diff?.od ?? 5)
    const radius = getCS(diff?.circleSize ?? 4)
    return { objects, radius, preempt, fadeIn, widescreen: !!storyboard?.widescreen, timingPoints }
  }, [isStdMode, file, timingPoints, storyboard?.widescreen])
  const sbTimeRef = useRef(0)
  const [patternOpen, setPatternOpen] = useState(false)
  const [playfieldOpen, setPlayfieldOpen] = useState(false)
  const [volume, setVolume] = useState(75)
  const [rightTab, setRightTab] = useState('inspector')
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [sbPopout, setSbPopout] = useState(false)
  const toast = useToast()
  const fileOpen = FileOpenButton()

  const svCount = timingPoints.filter((tp) => !tp.uninherited).length
  const bpmCount = timingPoints.filter((tp) => tp.uninherited).length
  const currentSV = svAtTime(timingPoints, playback.currentTimeMs)
  const currentBPM = bpmAtTime(timingPoints, playback.currentTimeMs)

  // Debounced Fisher segment rebuild when timing points change
  useEffect(() => {
    if (timingPoints.length === 0 || fisherSegments.length > 0) return
    const timer = setTimeout(() => {
      const segments = analyzeSvPatterns(timingPoints)
      dispatch('SET_FISHER_SEGMENTS', segments)
    }, 300)
    return () => clearTimeout(timer)
  }, [fisherVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep storyboard time ref in sync
  useEffect(() => {
    if (!storyboard) return
    let running = true
    const tick = () => {
      if (!running) return
      sbTimeRef.current = playback.playing ? audio.getCurrentTimeMs() : playback.currentTimeMs
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => {
      running = false
    }
  }, [storyboard, playback.playing, playback.currentTimeMs, audio])

  // Playback controls
  function togglePlay() {
    if (audio.playing) {
      audio.pause()
      dispatch('SET_PLAYBACK', { playing: false, currentTimeMs: audio.getCurrentTimeMs() })
    } else {
      audio.play(playback.currentTimeMs)
      dispatch('SET_PLAYBACK', { playing: true })
    }
  }

  function seek(ms) {
    audio.seek(ms)
    dispatch('SET_PLAYBACK', { currentTimeMs: ms })
  }

  // Export
  function handleExport() {
    if (!file) return
    const text = serialize({ ...file.parsed, timingPoints })
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename || 'output.osu'
    a.click()
    URL.revokeObjectURL(url)
    toast('File exported', 'success')
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.size > 0) {
          dispatch('REMOVE_POINTS', selection)
          toast(`Deleted ${selection.size} point(s)`, 'info')
        }
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        dispatch('SELECT_ALL')
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        dispatch('UNDO')
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        dispatch('REDO')
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleExport()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, dispatch, toast, file, timingPoints, playback.currentTimeMs],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-screen bg-[#303030] text-[#cccccc]">
      <FileDropZone />

      {/* Menu Bar */}
      <MenuBar
        menus={[
          {
            label: 'File',
            items: [
              { label: 'Open...', shortcut: 'Ctrl+O', action: fileOpen },
              { separator: true },
              { label: 'Export .osu', shortcut: 'Ctrl+S', action: handleExport },
              { separator: true },
              { label: 'Back to Demo', action: () => (window.location.hash = '#/demo') },
            ],
          },
          {
            label: 'Edit',
            items: [
              { label: 'Undo', shortcut: 'Ctrl+Z', action: () => dispatch('UNDO') },
              { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => dispatch('REDO') },
              { separator: true },
              { label: 'Select All', shortcut: 'Ctrl+A', action: () => dispatch('SELECT_ALL') },
              { label: 'Deselect All', action: () => dispatch('DESELECT_ALL') },
              { separator: true },
              {
                label: 'Delete Selected',
                shortcut: 'Del',
                action: () => {
                  if (selection.size > 0) {
                    dispatch('REMOVE_POINTS', selection)
                    toast(`Deleted ${selection.size} point(s)`, 'info')
                  }
                },
              },
            ],
          },
          {
            label: 'SV',
            items: [
              { label: 'Insert Pattern...', action: () => setPatternOpen(true) },
              { separator: true },
              { label: 'Snap to Beat', shortcut: 'S', action: () => dispatch('SET_SNAP', !snapEnabled) },
              { separator: true },
              { label: 'Snap 1/1', action: () => dispatch('SET_SNAP_DIVISOR', 1) },
              { label: 'Snap 1/2', action: () => dispatch('SET_SNAP_DIVISOR', 2) },
              { label: 'Snap 1/4', action: () => dispatch('SET_SNAP_DIVISOR', 4) },
              { label: 'Snap 1/8', action: () => dispatch('SET_SNAP_DIVISOR', 8) },
              { label: 'Snap 1/16', action: () => dispatch('SET_SNAP_DIVISOR', 16) },
            ],
          },
          {
            label: 'View',
            items: [
              {
                label: 'Zoom to Fit',
                action: () => {
                  if (timingPoints.length > 0) {
                    const allMs = timingPoints.map((tp) => tp.offset)
                    dispatch('SET_VIEWPORT', { startMs: Math.min(...allMs) - 500, endMs: Math.max(...allMs) + 500 })
                  }
                },
              },
              {
                label: 'Reset Zoom',
                action: () => dispatch('SET_VIEWPORT', { startMs: 0, endMs: 10000, svMin: 0, svMax: 4 }),
              },
              { separator: true },
              ...(isStdMode
                ? [
                    {
                      label: playfieldOpen ? 'Hide Playfield' : 'Show Playfield',
                      action: () => setPlayfieldOpen((o) => !o),
                    },
                  ]
                : []),
            ],
          },
          { label: 'Help', items: [{ label: 'Keyboard Shortcuts' }, { label: 'About Fisher SV Editor' }] },
        ]}
      />

      {/* Toolbar */}
      <div className="flex items-center bg-[#3c3c3c] border-b border-[#1e1e1e] h-6 px-2 gap-2 text-[11px]">
        <span className="text-[#999999]">{file?.filename || 'No file loaded'}</span>
        <div className="flex-1" />

        <Tooltip content={snapEnabled ? 'Snap On' : 'Snap Off'}>
          <IconToggle
            icon={<Magnet size={12} />}
            checked={snapEnabled}
            onChange={() => dispatch('SET_SNAP', !snapEnabled)}
          />
        </Tooltip>

        <SegmentedControl
          options={[
            { value: 1, label: '1/1' },
            { value: 2, label: '1/2' },
            { value: 4, label: '1/4' },
            { value: 8, label: '1/8' },
            { value: 16, label: '1/16' },
          ]}
          value={snapDivisor}
          onChange={(v) => dispatch('SET_SNAP_DIVISOR', v)}
        />

        <div className="w-px h-3 bg-[#3b3b3b] mx-1" />

        <Tooltip content="Insert Pattern">
          <Button variant="ghost" size="sm" onClick={() => setPatternOpen(true)}>
            <Plus size={11} />
          </Button>
        </Tooltip>
        <Tooltip content="Delete Selected">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selection.size > 0) {
                dispatch('REMOVE_POINTS', selection)
                toast(`Deleted ${selection.size}`, 'info')
              }
            }}
          >
            <Trash2 size={11} />
          </Button>
        </Tooltip>
        <Tooltip content="Export .osu">
          <Button variant="ghost" size="sm" onClick={handleExport}>
            <Download size={11} />
          </Button>
        </Tooltip>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mania preview panel */}
        {file && file.parsed?.hitObjects?.length > 0 && (
          <div className="w-[280px] shrink-0 border-r border-[#1e1e1e] flex flex-col">
            <ManiaPreview />
          </div>
        )}

        {/* Graph + tools */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            <div className="flex-1 relative">
              {file ? (
                <SVGraph />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="text-[14px] text-[#666666]">Fisher SV Editor</div>
                  <div className="text-[12px] text-[#555555]">Drop a .osz or .osu file to get started</div>
                  <Button variant="secondary" size="md" onClick={fileOpen}>
                    <Upload size={12} className="inline mr-1.5" />
                    Open Files
                  </Button>
                </div>
              )}

              {/* Viewport display controls (top-right) */}
              {file && (
                <div className="absolute top-2 right-2 flex gap-1 items-start">
                  <GizmoStrip
                    items={[
                      {
                        icon: <Grid3x3 size={12} />,
                        label: 'Beat Grid',
                        active: state.display.beatGrid,
                        action: () => dispatch('TOGGLE_DISPLAY', 'beatGrid'),
                      },
                      {
                        icon: <Eye size={12} />,
                        label: 'SV Lines',
                        active: state.display.svLine,
                        action: () => dispatch('TOGGLE_DISPLAY', 'svLine'),
                      },
                      {
                        icon: <Spline size={12} />,
                        label: 'Log Scale',
                        active: state.display.logScale,
                        action: () => dispatch('TOGGLE_DISPLAY', 'logScale'),
                      },
                      {
                        icon: <Layers size={12} />,
                        label: 'Display Settings',
                        active: overlayOpen,
                        action: () => setOverlayOpen((o) => !o),
                      },
                    ]}
                    orientation="horizontal"
                  />
                </div>
              )}

              {/* Overlay settings popover */}
              {overlayOpen && (
                <div className="absolute top-10 right-2 w-[220px] bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] shadow-lg shadow-black/40 text-[11px] z-10">
                  <div className="px-2.5 py-1.5 border-b border-[#3b3b3b]">
                    <div className="text-[10px] text-[#999999] mb-1">Grid</div>
                    <div className="space-y-1">
                      <Checkbox
                        id="ov-beatgrid"
                        label="Beat Grid"
                        checked={state.display.beatGrid}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'beatGrid')}
                      />
                      <Checkbox
                        id="ov-svgrid"
                        label="SV Grid Lines"
                        checked={state.display.svTags}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'svTags')}
                      />
                      <Checkbox
                        id="ov-measure"
                        label="Measure Lines"
                        checked={state.display.measureLines}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'measureLines')}
                      />
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 border-b border-[#3b3b3b]">
                    <div className="text-[10px] text-[#999999] mb-1">Elements</div>
                    <div className="space-y-1">
                      <Checkbox
                        id="ov-svline"
                        label="SV Step Line"
                        checked={state.display.svLine}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'svLine')}
                      />
                      <Checkbox
                        id="ov-svfill"
                        label="SV Fill Area"
                        checked={state.display.svFill}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'svFill')}
                      />
                      <Checkbox
                        id="ov-svpoints"
                        label="SV Points"
                        checked={state.display.svPoints}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'svPoints')}
                      />
                      <Checkbox
                        id="ov-bpmlabel"
                        label="BPM Labels"
                        checked={state.display.bpmLabels}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'bpmLabels')}
                      />
                      <Checkbox
                        id="ov-playhead"
                        label="Playhead"
                        checked={state.display.playhead}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'playhead')}
                      />
                      <Checkbox
                        id="ov-fisher"
                        label="Fisher Curves"
                        checked={state.display.fisherCurves}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'fisherCurves')}
                      />
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <div className="text-[10px] text-[#999999] mb-1">Labels</div>
                    <div className="space-y-1">
                      <Checkbox
                        id="ov-svtags"
                        label="SV Axis Tags"
                        checked={state.display.svTags}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'svTags')}
                      />
                      <Checkbox
                        id="ov-hoverlabel"
                        label="Hover Labels"
                        checked={state.display.hoverLabels}
                        onChange={() => dispatch('TOGGLE_DISPLAY', 'hoverLabels')}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right tool strip */}
            <div className="w-8 shrink-0 bg-[#303030] border-l border-[#1e1e1e]">
              <ToolStrip
                tools={[
                  {
                    id: 'select',
                    icon: <MousePointer2 size={14} strokeWidth={1.5} />,
                    label: 'Select',
                    description: 'Select & move points',
                    shortcut: 'V',
                  },
                  {
                    id: 'pen',
                    icon: <Pencil size={14} strokeWidth={1.5} />,
                    label: 'Draw',
                    description: 'Click to add SV points',
                    shortcut: 'P',
                  },
                  {
                    id: 'eraser',
                    icon: <Eraser size={14} strokeWidth={1.5} />,
                    label: 'Erase',
                    description: 'Click points to delete',
                    shortcut: 'E',
                  },
                  { separator: true },
                  {
                    id: 'pan',
                    icon: <Hand size={14} strokeWidth={1.5} />,
                    label: 'Pan',
                    description: 'Drag to pan viewport',
                    shortcut: 'H',
                  },
                  {
                    id: 'zoom',
                    icon: <ZoomIn size={14} strokeWidth={1.5} />,
                    label: 'Zoom',
                    description: 'Click to zoom in, Alt+click to zoom out',
                    shortcut: 'Z',
                  },
                  {
                    id: 'zoom-area',
                    icon: <Scan size={14} strokeWidth={1.5} />,
                    label: 'Zoom Area',
                    description: 'Drag a rectangle to zoom into',
                    shortcut: 'Shift+Z',
                  },
                  { separator: true },
                  {
                    id: 'seek',
                    icon: <AudioLines size={14} strokeWidth={1.5} />,
                    label: 'Seek',
                    description: 'Click to set playback position',
                    shortcut: 'T',
                  },
                  { separator: true },
                  {
                    id: 'fit',
                    icon: <Maximize2 size={14} strokeWidth={1.5} />,
                    label: 'Fit All',
                    description: 'Zoom to fit all points',
                  },
                ]}
                value={activeTool}
                onChange={(id) => dispatch('SET_TOOL', id)}
              />
            </div>
          </div>

          {/* Transport */}
          <div className="h-7 bg-[#2b2b2b] border-t border-[#1e1e1e] flex items-center px-2 gap-2">
            <TransportControls
              icons={{
                jumpToStart: <ChevronsLeft size={11} />,
                stepBack: <SkipBack size={11} />,
                play: <Play size={11} />,
                pause: <Pause size={11} />,
                stepForward: <SkipForward size={11} />,
                jumpToEnd: <ChevronsRight size={11} />,
              }}
              playing={playback.playing}
              frame={Math.round(playback.currentTimeMs)}
              totalFrames={Math.round(audio.duration || 10000)}
              onPlay={() => {
                audio.play(playback.currentTimeMs)
                dispatch('SET_PLAYBACK', { playing: true })
              }}
              onPause={() => {
                audio.pause()
                dispatch('SET_PLAYBACK', { playing: false, currentTimeMs: audio.getCurrentTimeMs() })
              }}
              onFrameChange={(ms) => seek(ms)}
            />
            <div className="flex-1" />
            <Volume2 size={11} className="text-[#999999] shrink-0" />
            <Slider
              value={volume}
              max={100}
              className="w-20 shrink-0"
              onChange={(e) => {
                setVolume(e.target.value)
                audio.volume = e.target.value / 100
              }}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[240px] shrink-0 border-l border-[#1e1e1e] flex flex-col bg-[#2b2b2b]">
          {/* Tab buttons */}
          <div className="px-1.5 pt-1.5 pb-1 bg-[#2b2b2b] border-b border-[#1e1e1e]">
            <SegmentedControl
              options={[
                { value: 'inspector', label: 'Inspector' },
                { value: 'points', label: `Points (${timingPoints.length})` },
                { value: 'info', label: 'Info' },
              ]}
              value={rightTab}
              onChange={setRightTab}
            />
          </div>

          {/* Tab content */}
          {rightTab === 'inspector' && (
            <div className="flex-1 overflow-y-auto">
              {selectedSegment !== null ? <SegmentInspector /> : <PointInspector />}
            </div>
          )}

          {rightTab === 'points' && <TimingPointList />}

          {rightTab === 'info' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              <PropertyPanel title="Beatmap">
                <PropertyRow label="Title">
                  <span className="text-[11px] text-[#cccccc] truncate">{file?.parsed?.metadata?.title || '—'}</span>
                </PropertyRow>
                <PropertyRow label="Artist">
                  <span className="text-[11px] text-[#cccccc] truncate">{file?.parsed?.metadata?.artist || '—'}</span>
                </PropertyRow>
                <PropertyRow label="Diff">
                  <span className="text-[11px] text-[#cccccc] truncate">{file?.parsed?.metadata?.version || '—'}</span>
                </PropertyRow>
                <PropertyRow label="Creator">
                  <span className="text-[11px] text-[#cccccc] truncate">{file?.parsed?.metadata?.creator || '—'}</span>
                </PropertyRow>
                <PropertyRow label="File">
                  <span className="text-[11px] text-[#999999] truncate">{file?.filename || '—'}</span>
                </PropertyRow>
              </PropertyPanel>
              <PropertyPanel title="Statistics">
                <PropertyRow label="SV Points">
                  <span className="text-[11px] text-[#cccccc]">{svCount}</span>
                </PropertyRow>
                <PropertyRow label="BPM Points">
                  <span className="text-[11px] text-[#cccccc]">{bpmCount}</span>
                </PropertyRow>
                <PropertyRow label="Total">
                  <span className="text-[11px] text-[#cccccc]">{timingPoints.length}</span>
                </PropertyRow>
                <PropertyRow label="Duration">
                  <span className="text-[11px] text-[#cccccc]">
                    {audio.duration ? `${(audio.duration / 1000 / 60).toFixed(1)} min` : '—'}
                  </span>
                </PropertyRow>
              </PropertyPanel>
            </div>
          )}

          {/* Storyboard preview — click to popout */}
          {storyboard && storyboardImageUrls && !sbPopout && (
            <div
              className="shrink-0 border-t border-[#1e1e1e] cursor-pointer relative group"
              style={{ height: storyboard.widescreen ? 135 : 180 }}
              onClick={() => setSbPopout(true)}
            >
              <StoryboardRenderer storyboard={storyboard} imageUrls={storyboardImageUrls} currentTimeRef={sbTimeRef} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                <span className="text-[10px] text-white/80">Click to detach</span>
              </div>
            </div>
          )}

          {/* Floating storyboard panel (with optional playfield as native WebGL quads) */}
          {storyboard && storyboardImageUrls && sbPopout && (
            <FloatingPanel
              title={playfieldOpen ? 'Storyboard + Playfield' : 'Storyboard'}
              defaultWidth={storyboard.widescreen ? 640 : 480}
              defaultHeight={storyboard.widescreen ? 360 : 360}
              defaultX={Math.round(window.innerWidth / 2 - 240)}
              defaultY={Math.round(window.innerHeight / 2 - 180)}
              onClose={() => setSbPopout(false)}
            >
              <StoryboardRenderer
                storyboard={storyboard}
                imageUrls={storyboardImageUrls}
                currentTimeRef={sbTimeRef}
                playfieldData={playfieldOpen ? playfieldData : null}
              />
            </FloatingPanel>
          )}

          {/* Standalone floating osu! playfield (when no storyboard popout) */}
          {isStdMode && playfieldOpen && !sbPopout && (
            <FloatingPanel
              title="osu! Playfield"
              defaultWidth={640}
              defaultHeight={480}
              defaultX={Math.round(window.innerWidth / 2 - 320)}
              defaultY={Math.round(window.innerHeight / 2 - 240)}
              onClose={() => setPlayfieldOpen(false)}
            >
              <OsuPlayfield
                hitObjects={file.parsed.hitObjects}
                difficulty={file.parsed.difficulty}
                currentTimeRef={sbTimeRef}
              />
            </FloatingPanel>
          )}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        left={[
          file ? `${file.parsed?.metadata?.artist} - ${file.parsed?.metadata?.title}` : 'No file',
          selection.size > 0 ? `${selection.size} selected` : '',
        ]}
        right={[
          `BPM: ${currentBPM.toFixed(0)}`,
          `SV: ${currentSV.toFixed(2)}x`,
          `${svCount} SV / ${bpmCount} BPM`,
          snapEnabled ? `Snap 1/${snapDivisor}` : 'Snap Off',
        ]}
      />

      <PatternDialog open={patternOpen} onClose={() => setPatternOpen(false)} />
      <DifficultyPicker />
      <LoadingOverlay />
    </div>
  )
}
