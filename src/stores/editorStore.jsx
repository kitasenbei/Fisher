import { createContext, useContext, useReducer, useRef, useCallback, useMemo } from 'react'
import AudioEngine from '../lib/audioEngine'

const EditorContext = createContext(null)

const initialState = {
  file: null, // { raw, parsed, filename }
  audioFile: null,
  pendingOsz: null, // { osuFiles, zip } — waiting for difficulty selection
  loading: null, // { message, progress (0-100) } — file loading state
  storyboardImageUrls: null, // { path: blobUrl } map for storyboard images
  timingPoints: [],
  selection: new Set(),
  playback: { playing: false, currentTimeMs: 0 },
  viewport: { startMs: 0, endMs: 10000, svMin: 0, svMax: 4 },
  snapEnabled: true,
  snapDivisor: 4,
  activeTool: 'select',
  fisherSegments: [],
  fisherVersion: 0,
  selectedSegment: null,
  display: {
    beatGrid: true,
    svLine: true,
    svFill: true,
    svPoints: true,
    bpmLabels: true,
    playhead: true,
    svTags: true,
    hoverLabels: true,
    measureLines: true,
    logScale: false,
    fisherCurves: true,
  },
  undoStack: [],
  redoStack: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_FILE':
      return {
        ...state,
        file: action.payload,
        timingPoints: action.payload.parsed.timingPoints,
        selection: new Set(),
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
        selectedSegment: null,
        undoStack: [],
        redoStack: [],
        viewport: {
          ...state.viewport,
          startMs: 0,
          endMs: Math.max(10000, action.payload.parsed.timingPoints.at(-1)?.offset + 2000 || 10000),
        },
      }
    case 'SET_AUDIO':
      return { ...state, audioFile: action.payload }
    case 'SET_PENDING_OSZ':
      return { ...state, pendingOsz: action.payload }
    case 'CLEAR_PENDING_OSZ':
      return { ...state, pendingOsz: null }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'CLEAR_LOADING':
      return { ...state, loading: null }
    case 'SET_STORYBOARD_URLS':
      return { ...state, storyboardImageUrls: action.payload }
    case 'SET_FISHER_SEGMENTS':
      return { ...state, fisherSegments: action.payload }
    case 'SELECT_SEGMENT':
      return { ...state, selectedSegment: action.payload, selection: new Set() }
    case 'SET_TIMING_POINTS': {
      const sorted = [...action.payload].sort((a, b) => a.offset - b.offset)
      return {
        ...state,
        undoStack: [...state.undoStack, state.timingPoints],
        redoStack: [],
        timingPoints: sorted,
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'ADD_POINT': {
      const newPoints = [...state.timingPoints, action.payload].sort((a, b) => a.offset - b.offset)
      return {
        ...state,
        undoStack: [...state.undoStack, state.timingPoints],
        redoStack: [],
        timingPoints: newPoints,
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'REMOVE_POINTS': {
      const indices = action.payload
      const newPoints = state.timingPoints.filter((_, i) => !indices.has(i))
      return {
        ...state,
        undoStack: [...state.undoStack, state.timingPoints],
        redoStack: [],
        timingPoints: newPoints,
        selection: new Set(),
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'UPDATE_POINT': {
      const { index, updates } = action.payload
      const newPoints = state.timingPoints
        .map((tp, i) => (i === index ? { ...tp, ...updates } : tp))
        .sort((a, b) => a.offset - b.offset)
      return {
        ...state,
        undoStack: [...state.undoStack, state.timingPoints],
        redoStack: [],
        timingPoints: newPoints,
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'INSERT_PATTERN': {
      const merged = [...state.timingPoints, ...action.payload].sort((a, b) => a.offset - b.offset)
      return {
        ...state,
        undoStack: [...state.undoStack, state.timingPoints],
        redoStack: [],
        timingPoints: merged,
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'SELECT':
      return { ...state, selection: new Set(action.payload) }
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selection)
      if (next.has(action.payload)) next.delete(action.payload)
      else next.add(action.payload)
      return { ...state, selection: next }
    }
    case 'SELECT_ALL':
      return { ...state, selection: new Set(state.timingPoints.map((_, i) => i)) }
    case 'DESELECT_ALL':
      return { ...state, selection: new Set() }
    case 'SET_PLAYBACK':
      return { ...state, playback: { ...state.playback, ...action.payload } }
    case 'SET_VIEWPORT':
      return { ...state, viewport: { ...state.viewport, ...action.payload } }
    case 'SET_SNAP':
      return { ...state, snapEnabled: action.payload }
    case 'SET_SNAP_DIVISOR':
      return { ...state, snapDivisor: action.payload }
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload }
    case 'TOGGLE_DISPLAY': {
      const key = action.payload
      return { ...state, display: { ...state.display, [key]: !state.display[key] } }
    }
    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.timingPoints],
        timingPoints: prev,
        selection: new Set(),
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.timingPoints],
        timingPoints: next,
        selection: new Set(),
        fisherSegments: [],
        fisherVersion: state.fisherVersion + 1,
      }
    }
    default:
      return state
  }
}

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const audioRef = useRef(new AudioEngine())

  const d = useCallback((type, payload) => dispatch({ type, payload }), [])

  // audioRef is stable (created once) — safe to read during render
  // eslint-disable-next-line react-hooks/refs
  const ctx = useMemo(() => ({ state, dispatch: d, audio: audioRef.current }), [state, d])

  return <EditorContext.Provider value={ctx}>{children}</EditorContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  return useContext(EditorContext)
}
