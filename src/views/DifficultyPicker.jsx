import { useEditor } from '../stores/editorStore'
import { loadDifficulty } from './FileDropZone'
import { Modal, Button, Scrollbar, Badge, PropertyPanel } from '../components'

const MODE_NAMES = { 0: 'osu!', 1: 'Taiko', 2: 'Catch', 3: 'Mania' }

export default function DifficultyPicker() {
  const { state, dispatch, audio } = useEditor()
  const { pendingOsz } = state

  if (!pendingOsz) return null

  const { osuFiles, zip, bgUrl } = pendingOsz

  // Group by mode
  const grouped = {}
  for (const f of osuFiles) {
    const mode = f.parsed.general.mode ?? 0
    if (!grouped[mode]) grouped[mode] = []
    grouped[mode].push(f)
  }

  for (const mode in grouped) {
    grouped[mode].sort((a, b) => (a.parsed.metadata.version || '').localeCompare(b.parsed.metadata.version || ''))
  }

  const meta = osuFiles[0]?.parsed?.metadata

  async function handleSelect(diff) {
    await loadDifficulty(diff, zip, dispatch, audio)
  }

  function handleClose() {
    if (bgUrl) URL.revokeObjectURL(bgUrl)
    dispatch('CLEAR_PENDING_OSZ')
  }

  return (
    <Modal open={true} onClose={handleClose} className="bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] p-0 shadow-lg shadow-black/40 backdrop:bg-black/50 w-[400px] overflow-hidden">
      {/* Header with background image */}
      <div className="relative h-24 overflow-hidden border-b border-[#3b3b3b]">
        {bgUrl ? (
          <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#383838]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2b2b2b] via-[#2b2b2b]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
          <div className="text-[13px] text-white font-normal drop-shadow-lg truncate">{meta?.title || 'Unknown'}</div>
          <div className="text-[11px] text-[#cccccc] drop-shadow-lg truncate">{meta?.artist || 'Unknown'}</div>
        </div>
        <Badge className="absolute top-2 right-2 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-[2px]">
          {osuFiles.length} diffs
        </Badge>
      </div>

      {/* Difficulty list */}
      <Scrollbar maxHeight={250}>
        <div className="py-1">
          {Object.entries(grouped).map(([mode, diffs]) => (
            <PropertyPanel
              key={mode}
              title={`${MODE_NAMES[mode] || `Mode ${mode}`} (${diffs.length})`}
              >
              <div className="space-y-0.5">
                {diffs.map((diff, i) => {
                  const m = diff.parsed.metadata
                  const svCount = diff.parsed.timingPoints.filter(tp => !tp.uninherited).length
                  const bpmCount = diff.parsed.timingPoints.filter(tp => tp.uninherited).length
                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      className="w-full !justify-start !text-left !px-1.5 !py-1"
                      onClick={() => handleSelect(diff)}
                    >
                      <div className="flex-1 min-w-0 ml-0.5">
                        <div className="text-[11px] text-[#cccccc] truncate">{m.version || diff.name}</div>
                      </div>
                      <Badge className="text-[8px] bg-[#383838] text-[#999999] px-1 py-0 rounded-[2px] ml-1">
                        {svCount} SV
                      </Badge>
                      <Badge className="text-[8px] bg-[#383838] text-[#999999] px-1 py-0 rounded-[2px] ml-0.5">
                        {bpmCount} BPM
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </PropertyPanel>
          ))}
        </div>
      </Scrollbar>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[#3b3b3b] flex justify-end">
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
      </div>
    </Modal>
  )
}
