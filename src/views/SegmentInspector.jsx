import { useEditor } from '../stores/editorStore'
import { PropertyPanel, PropertyRow, Button, Badge, Scrollbar } from '../components'

const TYPE_LABELS = {
  linear: 'Linear Ramp',
  exponential: 'Exponential',
  sine: 'Sine Wave',
  stutter: 'Stutter',
  polynomial: 'Polynomial',
}

const TYPE_COLORS = {
  linear: '#4da3f2',
  exponential: '#cc88ff',
  sine: '#88ff66',
  stutter: '#ffcc44',
  polynomial: '#ff8844',
}

function ParamRow({ label, value }) {
  return (
    <PropertyRow label={label}>
      <span className="text-[11px] text-[#cccccc] font-mono">
        {typeof value === 'number' ? value.toFixed(3) : value}
      </span>
    </PropertyRow>
  )
}

export default function SegmentInspector() {
  const { state, dispatch } = useEditor()
  const { fisherSegments, selectedSegment, timingPoints } = state

  if (selectedSegment === null || !fisherSegments[selectedSegment]) return null

  const seg = fisherSegments[selectedSegment]
  const label = TYPE_LABELS[seg.type] || seg.type
  const color = TYPE_COLORS[seg.type] || '#4da3f2'

  // Collect raw points in this segment
  const rawPoints = []
  for (let i = seg.startIdx; i <= seg.endIdx; i++) {
    if (timingPoints[i] && !timingPoints[i].uninherited) {
      rawPoints.push({ idx: i, point: timingPoints[i] })
    }
  }

  function handleSelectAll() {
    dispatch(
      'SELECT',
      rawPoints.map((r) => r.idx),
    )
    dispatch('SELECT_SEGMENT', null)
  }

  function handleClose() {
    dispatch('SELECT_SEGMENT', null)
  }

  return (
    <div className="p-2 space-y-1">
      <PropertyPanel title="Fisher Segment">
        <PropertyRow label="Type">
          <Badge className="text-[9px] px-1.5 py-0.5 rounded-[2px]" style={{ backgroundColor: color + '30', color }}>
            {label}
          </Badge>
        </PropertyRow>
        <PropertyRow label="Points">
          <span className="text-[11px] text-[#cccccc]">{seg.pointCount}</span>
        </PropertyRow>
        <PropertyRow label="Range">
          <span className="text-[11px] text-[#cccccc] font-mono">
            {Math.round(seg.startMs)} – {Math.round(seg.endMs)} ms
          </span>
        </PropertyRow>
        <PropertyRow label="Duration">
          <span className="text-[11px] text-[#cccccc] font-mono">{Math.round(seg.endMs - seg.startMs)} ms</span>
        </PropertyRow>
        <PropertyRow label="Fit">
          <span className="text-[11px] text-[#cccccc]">{(seg.error * 100).toFixed(1)}%</span>
        </PropertyRow>
      </PropertyPanel>

      <PropertyPanel title="Parameters">
        {seg.type === 'linear' && (
          <>
            <ParamRow label="Start SV" value={seg.params.startSV} />
            <ParamRow label="End SV" value={seg.params.endSV} />
            <ParamRow label="Slope" value={seg.params.slope} />
          </>
        )}
        {seg.type === 'exponential' && (
          <>
            <ParamRow label="Start SV" value={seg.params.startSV} />
            <ParamRow label="End SV" value={seg.params.endSV} />
            <ParamRow label="Exponent" value={seg.params.exponent} />
          </>
        )}
        {seg.type === 'sine' && (
          <>
            <ParamRow label="Center" value={seg.params.centerSV} />
            <ParamRow label="Amplitude" value={seg.params.amplitude} />
            <ParamRow label="Frequency" value={seg.params.frequency} />
            <ParamRow label="Phase" value={seg.params.phase} />
          </>
        )}
        {seg.type === 'stutter' && (
          <>
            <ParamRow label="High SV" value={seg.params.highSV} />
            <ParamRow label="Low SV" value={seg.params.lowSV} />
            <ParamRow label="Interval" value={`${Math.round(seg.params.interval)} ms`} />
          </>
        )}
        {seg.type === 'polynomial' && (
          <>
            <ParamRow label="a (x²)" value={seg.params.a} />
            <ParamRow label="b (x)" value={seg.params.b} />
            <ParamRow label="c" value={seg.params.c} />
          </>
        )}
      </PropertyPanel>

      <PropertyPanel title={`Raw Points (${rawPoints.length})`}>
        <Scrollbar maxHeight={150}>
          <div className="space-y-0">
            {rawPoints.map(({ idx, point }) => (
              <div
                key={idx}
                className="flex items-center justify-between px-1 py-0.5 text-[10px] hover:bg-[#383838] rounded-[2px] cursor-default"
                onClick={() => {
                  dispatch('SELECT', [idx])
                  dispatch('SELECT_SEGMENT', null)
                }}
              >
                <span className="text-[#999999] font-mono">{Math.round(point.offset)}ms</span>
                <span className="text-[#cccccc] font-mono">{point.svMultiplier.toFixed(2)}x</span>
              </div>
            ))}
          </div>
        </Scrollbar>
      </PropertyPanel>

      <div className="flex gap-1 pt-1">
        <Button size="sm" className="flex-1" onClick={handleSelectAll}>
          Select All Points
        </Button>
        <Button size="sm" variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
