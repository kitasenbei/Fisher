import { useRef, useState, useEffect, useCallback } from 'react'
import { useEditor } from '../stores/editorStore'

const ROW_HEIGHT = 18

function formatTime(ms) {
  const sec = ms / 1000
  const min = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(1)
  return `${min}:${s.padStart(4, '0')}`
}

export default function TimingPointList() {
  const { state, dispatch } = useEditor()
  const { timingPoints, selection } = state
  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(300)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const totalHeight = timingPoints.length * ROW_HEIGHT
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2)
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 4
  const endIdx = Math.min(timingPoints.length, startIdx + visibleCount)
  const visiblePoints = timingPoints.slice(startIdx, endIdx)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center px-2 h-[18px] text-[9px] text-[#666666] border-b border-[#3b3b3b] bg-[#2b2b2b]">
        <span className="w-14 shrink-0">Time</span>
        <span className="w-8 shrink-0 text-center">Type</span>
        <span className="flex-1 text-right">Value</span>
        <span className="w-10 text-right">Vol</span>
      </div>
      {/* Virtual scroll spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left: 0, right: 0 }}>
          {visiblePoints.map((tp, vi) => {
            const i = startIdx + vi
            const isSelected = selection.has(i)
            return (
              <div
                key={i}
                className={`flex items-center px-2 text-[10px] cursor-default select-none hover:bg-[#404040] ${
                  isSelected ? 'bg-[#2d8ceb] text-white' : 'text-[#cccccc]'
                }`}
                style={{ height: ROW_HEIGHT }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) dispatch('TOGGLE_SELECT', i)
                  else dispatch('SELECT', [i])
                }}
              >
                <span className="w-14 shrink-0 font-mono text-[9px]">{formatTime(tp.offset)}</span>
                <span className={`w-8 shrink-0 text-center text-[9px] ${
                  tp.uninherited
                    ? (isSelected ? 'text-white' : 'text-[#cc8833]')
                    : (isSelected ? 'text-white' : 'text-[#2d8ceb]')
                }`}>
                  {tp.uninherited ? 'BPM' : 'SV'}
                </span>
                <span className="flex-1 text-right font-mono text-[9px]">
                  {tp.uninherited ? `${tp.bpm.toFixed(1)}` : `${tp.svMultiplier.toFixed(2)}x`}
                </span>
                <span className="w-10 text-right font-mono text-[9px]">{tp.volume}%</span>
              </div>
            )
          })}
        </div>
      </div>
      {timingPoints.length === 0 && (
        <div className="text-[10px] text-[#666666] text-center py-4">No timing points</div>
      )}
    </div>
  )
}
