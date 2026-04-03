import { useEditor } from '../stores/editorStore'
import { PropertyPanel, PropertyRow, NumberInput, Slider, Toggle } from '../components'

export default function PointInspector() {
  const { state, dispatch } = useEditor()
  const { timingPoints, selection, file } = state

  const selectedIndices = [...selection]
  const selectedPoints = selectedIndices.map(i => timingPoints[i]).filter(Boolean)

  // Nothing selected — show file info
  if (selectedPoints.length === 0) {
    const meta = file?.parsed?.metadata
    const svCount = timingPoints.filter(tp => !tp.uninherited).length
    const bpmCount = timingPoints.filter(tp => tp.uninherited).length

    return (
      <div className="p-2 space-y-3">
        <PropertyPanel title="Beatmap Info">
          {meta ? (
            <>
              <PropertyRow label="Title"><span className="text-[11px] text-[#cccccc] truncate">{meta.title || '—'}</span></PropertyRow>
              <PropertyRow label="Artist"><span className="text-[11px] text-[#cccccc] truncate">{meta.artist || '—'}</span></PropertyRow>
              <PropertyRow label="Diff"><span className="text-[11px] text-[#cccccc] truncate">{meta.version || '—'}</span></PropertyRow>
              <PropertyRow label="Creator"><span className="text-[11px] text-[#cccccc] truncate">{meta.creator || '—'}</span></PropertyRow>
            </>
          ) : (
            <div className="text-[10px] text-[#666666] text-center py-2">No file loaded</div>
          )}
        </PropertyPanel>
        <PropertyPanel title="Statistics">
          <PropertyRow label="SV Points"><span className="text-[11px] text-[#cccccc]">{svCount}</span></PropertyRow>
          <PropertyRow label="BPM Points"><span className="text-[11px] text-[#cccccc]">{bpmCount}</span></PropertyRow>
          <PropertyRow label="Total"><span className="text-[11px] text-[#cccccc]">{timingPoints.length}</span></PropertyRow>
        </PropertyPanel>
      </div>
    )
  }

  // Single point selected
  if (selectedPoints.length === 1) {
    const point = selectedPoints[0]
    const idx = selectedIndices[0]
    const isSV = !point.uninherited

    function update(updates) {
      dispatch('UPDATE_POINT', { index: idx, updates })
    }

    return (
      <div className="p-2 space-y-1">
        <PropertyPanel title={isSV ? 'SV Point' : 'BPM Point'}>
          <PropertyRow label="Offset">
            <NumberInput
              id="pt-offset"
              value={Math.round(point.offset)}
              step={1}
              onChange={(e) => update({ offset: e.target.value })}
            />
          </PropertyRow>
          {isSV ? (
            <>
              <PropertyRow label="SV">
                <NumberInput
                  id="pt-sv"
                  value={parseFloat(point.svMultiplier.toFixed(2))}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => update({
                    svMultiplier: e.target.value,
                    msPerBeat: -100 / e.target.value,
                  })}
                />
              </PropertyRow>
              <PropertyRow label="">
                <Slider
                  value={Math.round(point.svMultiplier * 100)}
                  min={10}
                  max={1000}
                  onChange={(e) => {
                    const sv = e.target.value / 100
                    update({ svMultiplier: sv, msPerBeat: -100 / sv })
                  }}
                />
              </PropertyRow>
            </>
          ) : (
            <PropertyRow label="BPM">
              <NumberInput
                id="pt-bpm"
                value={parseFloat(point.bpm.toFixed(2))}
                min={1}
                step={0.01}
                onChange={(e) => update({
                  bpm: e.target.value,
                  msPerBeat: 60000 / e.target.value,
                })}
              />
            </PropertyRow>
          )}
          <PropertyRow label="Volume">
            <Slider
              value={point.volume}
              min={0}
              max={100}
              onChange={(e) => update({ volume: e.target.value })}
            />
          </PropertyRow>
          <PropertyRow label="Kiai">
            <Toggle checked={!!(point.effects & 1)} onChange={(e) => {
              update({ effects: e.target.checked ? (point.effects | 1) : (point.effects & ~1) })
            }} />
          </PropertyRow>
        </PropertyPanel>
      </div>
    )
  }

  // Multiple selected
  return (
    <div className="p-2 space-y-1">
      <PropertyPanel title={`${selectedPoints.length} Points Selected`}>
        <PropertyRow label="Scale SV">
          <NumberInput
            id="batch-scale"
            value={1}
            min={0.1}
            max={10}
            step={0.01}
            onChange={(e) => {
              const factor = e.target.value
              const newPoints = [...timingPoints]
              for (const idx of selectedIndices) {
                const tp = newPoints[idx]
                if (!tp.uninherited) {
                  const sv = tp.svMultiplier * factor
                  newPoints[idx] = { ...tp, svMultiplier: sv, msPerBeat: -100 / sv }
                }
              }
              dispatch('SET_TIMING_POINTS', newPoints)
            }}
          />
        </PropertyRow>
        <div className="text-[10px] text-[#666666] mt-2">
          {selectedPoints.filter(p => !p.uninherited).length} SV, {selectedPoints.filter(p => p.uninherited).length} BPM
        </div>
      </PropertyPanel>
    </div>
  )
}
