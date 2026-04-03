import Tooltip from '../ui/Tooltip'

export default function TransportControls({
  icons = {},
  playing,
  frame,
  totalFrames,
  onPlay,
  onPause,
  onFrameChange,
  className = '',
}) {
  const buttons = [
    { icon: icons.jumpToStart, tip: 'Jump to Start', action: () => onFrameChange(1) },
    { icon: icons.stepBack, tip: 'Step Back', action: () => onFrameChange(Math.max(1, frame - 1)) },
    { icon: playing ? icons.pause : icons.play, tip: playing ? 'Pause' : 'Play', action: playing ? onPause : onPlay },
    { icon: icons.stepForward, tip: 'Step Forward', action: () => onFrameChange(Math.min(totalFrames, frame + 1)) },
    { icon: icons.jumpToEnd, tip: 'Jump to End', action: () => onFrameChange(totalFrames) },
  ]

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex gap-px">
        {buttons.map((btn, i) => (
          <Tooltip key={i} content={btn.tip}>
            <button
              className="w-5 h-5 flex items-center justify-center text-[#999999] hover:text-[#cccccc] cursor-default"
              onClick={btn.action}
            >
              {btn.icon}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}
