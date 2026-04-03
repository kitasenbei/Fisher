import { useState } from 'react'
import { useEditor } from '../stores/editorStore'
import { linearRamp, exponentialRamp, stutterPattern, sineWave } from '../lib/svMath'
import { msPerBeatAtTime } from '../lib/svMath'
import { Modal, Button, Select, NumberInput, PropertyPanel, PropertyRow } from '../components'

export default function PatternDialog({ open, onClose }) {
  const { state, dispatch } = useEditor()
  const [pattern, setPattern] = useState('linear')
  const [startMs, setStartMs] = useState(Math.round(state.playback.currentTimeMs))
  const [endMs, setEndMs] = useState(Math.round(state.playback.currentTimeMs + 2000))
  const [startSV, setStartSV] = useState(1)
  const [endSV, setEndSV] = useState(2)
  const [count, setCount] = useState(10)
  const [exponent, setExponent] = useState(2)
  const [centerSV, setCenterSV] = useState(1)
  const [amplitude, setAmplitude] = useState(0.5)
  const [highSV, setHighSV] = useState(2)
  const [lowSV, setLowSV] = useState(0.5)

  function handleInsert() {
    let points = []
    switch (pattern) {
      case 'linear':
        points = linearRamp(startMs, endMs, startSV, endSV, count)
        break
      case 'exponential':
        points = exponentialRamp(startMs, endMs, startSV, endSV, count, exponent)
        break
      case 'stutter':
        points = stutterPattern(startMs, msPerBeatAtTime(state.timingPoints, startMs), highSV, lowSV, count)
        break
      case 'sine':
        points = sineWave(startMs, endMs, centerSV, amplitude, count)
        break
    }
    dispatch('INSERT_PATTERN', points)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] p-0 shadow-lg shadow-black/40 backdrop:bg-black/50 w-[340px]"
    >
      <div className="px-3 py-2 border-b border-[#3b3b3b] text-[12px]">Insert SV Pattern</div>
      <div className="p-3 space-y-2">
        <PropertyPanel title="Pattern Type">
          <Select
            id="pat-type"
            options={[
              { value: 'linear', label: 'Linear Ramp' },
              { value: 'exponential', label: 'Exponential Ramp' },
              { value: 'stutter', label: 'Stutter' },
              { value: 'sine', label: 'Sine Wave' },
            ]}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
        </PropertyPanel>

        <PropertyPanel title="Parameters">
          <PropertyRow label="Start (ms)">
            <NumberInput id="pat-start" value={startMs} step={1} onChange={(e) => setStartMs(e.target.value)} />
          </PropertyRow>
          {pattern !== 'stutter' && (
            <PropertyRow label="End (ms)">
              <NumberInput id="pat-end" value={endMs} step={1} onChange={(e) => setEndMs(e.target.value)} />
            </PropertyRow>
          )}
          <PropertyRow label="Count">
            <NumberInput
              id="pat-count"
              value={count}
              min={2}
              max={500}
              step={1}
              onChange={(e) => setCount(e.target.value)}
            />
          </PropertyRow>

          {(pattern === 'linear' || pattern === 'exponential') && (
            <>
              <PropertyRow label="Start SV">
                <NumberInput
                  id="pat-ssv"
                  value={startSV}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => setStartSV(e.target.value)}
                />
              </PropertyRow>
              <PropertyRow label="End SV">
                <NumberInput
                  id="pat-esv"
                  value={endSV}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => setEndSV(e.target.value)}
                />
              </PropertyRow>
            </>
          )}

          {pattern === 'exponential' && (
            <PropertyRow label="Exponent">
              <NumberInput
                id="pat-exp"
                value={exponent}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(e) => setExponent(e.target.value)}
              />
            </PropertyRow>
          )}

          {pattern === 'stutter' && (
            <>
              <PropertyRow label="High SV">
                <NumberInput
                  id="pat-hsv"
                  value={highSV}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => setHighSV(e.target.value)}
                />
              </PropertyRow>
              <PropertyRow label="Low SV">
                <NumberInput
                  id="pat-lsv"
                  value={lowSV}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => setLowSV(e.target.value)}
                />
              </PropertyRow>
            </>
          )}

          {pattern === 'sine' && (
            <>
              <PropertyRow label="Center SV">
                <NumberInput
                  id="pat-csv"
                  value={centerSV}
                  min={0.1}
                  max={10}
                  step={0.01}
                  onChange={(e) => setCenterSV(e.target.value)}
                />
              </PropertyRow>
              <PropertyRow label="Amplitude">
                <NumberInput
                  id="pat-amp"
                  value={amplitude}
                  min={0.01}
                  max={5}
                  step={0.01}
                  onChange={(e) => setAmplitude(e.target.value)}
                />
              </PropertyRow>
            </>
          )}
        </PropertyPanel>

        <div className="flex justify-end gap-1.5 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleInsert}>
            Insert {count} Points
          </Button>
        </div>
      </div>
    </Modal>
  )
}
