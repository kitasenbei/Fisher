import { useRef, useState, useEffect, useCallback } from 'react'

const isFirefox = navigator.userAgent.includes('Firefox')
const useNative = !isFirefox

export default function Scrollbar({ children, className = '', maxHeight = 200 }) {
  // Webkit browsers get the CSS scrollbar
  if (useNative) {
    return (
      <div className={`ps-scroll overflow-y-auto ${className}`} style={{ maxHeight }}>
        {children}
      </div>
    )
  }

  // Firefox / others get the custom scrollbar
  return <CustomScrollbar className={className} maxHeight={maxHeight}>{children}</CustomScrollbar>
}

function CustomScrollbar({ children, className, maxHeight }) {
  const contentRef = useRef(null)
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [thumbTop, setThumbTop] = useState(0)
  const [visible, setVisible] = useState(false)
  const dragging = useRef(null)
  const scrollInterval = useRef(null)

  const update = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const hasScroll = el.scrollHeight > el.clientHeight
    setVisible(hasScroll)
    if (!hasScroll) return
    const trackH = trackRef.current?.clientHeight ?? 0
    const ratio = el.clientHeight / el.scrollHeight
    const th = Math.max(ratio * trackH, 24)
    setThumbHeight(th)
    setThumbTop((el.scrollTop / (el.scrollHeight - el.clientHeight)) * (trackH - th))
  }, [])

  useEffect(() => {
    update()
    const el = contentRef.current
    if (!el) return
    el.addEventListener('scroll', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)

    function onWheel(e) {
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
    }
  }, [update, children])

  function scrollBy(delta) {
    contentRef.current?.scrollBy({ top: delta })
  }

  function startRepeat(delta) {
    scrollBy(delta)
    scrollInterval.current = setInterval(() => scrollBy(delta), 80)
  }

  function stopRepeat() {
    clearInterval(scrollInterval.current)
  }

  function onThumbDown(e) {
    e.preventDefault()
    dragging.current = { startY: e.clientY, startTop: thumbTop }
    document.addEventListener('mousemove', onThumbMove)
    document.addEventListener('mouseup', onThumbUp)
  }

  function onThumbMove(e) {
    if (!dragging.current) return
    const track = trackRef.current
    const el = contentRef.current
    if (!track || !el) return
    const trackH = track.clientHeight
    const dy = e.clientY - dragging.current.startY
    const newTop = Math.min(Math.max(dragging.current.startTop + dy, 0), trackH - thumbHeight)
    el.scrollTop = (newTop / (trackH - thumbHeight)) * (el.scrollHeight - el.clientHeight)
  }

  function onThumbUp() {
    dragging.current = null
    document.removeEventListener('mousemove', onThumbMove)
    document.removeEventListener('mouseup', onThumbUp)
  }

  function onTrackClick(e) {
    if (e.target === thumbRef.current) return
    const track = trackRef.current
    const el = contentRef.current
    if (!track || !el) return
    const rect = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const direction = clickY < thumbTop ? -1 : 1
    scrollBy(direction * el.clientHeight)
  }

  const arrow = (direction) => (
    <button
      type="button"
      className="flex items-center justify-center w-full h-[14px] bg-[#3b3b3b] hover:bg-[#4a4a4a] cursor-default"
      onMouseDown={() => startRepeat(direction === 'up' ? -30 : 30)}
      onMouseUp={stopRepeat}
      onMouseLeave={stopRepeat}
    >
      <svg className="h-[6px] w-[6px] text-[#999999]" viewBox="0 0 6 6" fill="currentColor">
        {direction === 'up'
          ? <path d="M3 1L0.5 4.5h5L3 1z" />
          : <path d="M3 5L0.5 1.5h5L3 5z" />}
      </svg>
    </button>
  )

  return (
    <div className={`relative flex ${className}`}>
      <div
        ref={contentRef}
        className="flex-1 overflow-hidden"
        style={{ maxHeight }}
      >
        {children}
      </div>

      {visible && (
        <div className="flex flex-col w-[14px] bg-[#3b3b3b] shrink-0">
          {arrow('up')}
          <div
            ref={trackRef}
            className="flex-1 relative cursor-default"
            onClick={onTrackClick}
          >
            <div
              ref={thumbRef}
              className="absolute left-[3px] right-[3px] rounded-full bg-[#666666] hover:bg-[#777777] cursor-default"
              style={{ height: thumbHeight, top: thumbTop }}
              onMouseDown={onThumbDown}
            />
          </div>
          {arrow('down')}
        </div>
      )}
    </div>
  )
}
