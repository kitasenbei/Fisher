import { useEditor } from '../stores/editorStore'

export default function LoadingOverlay() {
  const { state } = useEditor()
  const { loading } = state

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center">
      <div className="bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] shadow-lg shadow-black/50 w-[320px] overflow-hidden">
        {/* Title bar */}
        <div className="px-3 py-1.5 border-b border-[#3b3b3b] bg-[#323232]">
          <div className="text-[11px] text-[#cccccc] font-medium">Loading</div>
        </div>

        {/* Content */}
        <div className="px-3 py-3 space-y-2.5">
          <div className="text-[11px] text-[#999999] truncate">{loading.message}</div>

          {/* Progress bar — Photoshop style: thin, sharp corners, striped animation at 100% */}
          <div className="w-full h-[12px] bg-[#1a1a1a] border border-[#3b3b3b] rounded-[1px] overflow-hidden p-[1px]">
            <div
              className="h-full bg-[#2d8ceb] rounded-[1px] transition-[width] duration-150"
              style={{
                width: `${Math.min(Math.max(loading.progress, 0), 100)}%`,
                backgroundImage: loading.progress < 100
                  ? 'linear-gradient(90deg, #2d8ceb 0%, #4da3f2 50%, #2d8ceb 100%)'
                  : 'repeating-linear-gradient(-45deg, #2d8ceb, #2d8ceb 4px, #4da3f2 4px, #4da3f2 8px)',
                backgroundSize: loading.progress < 100 ? '200% 100%' : '16px 16px',
                animation: loading.progress < 100
                  ? 'loading-shimmer 1.5s ease-in-out infinite'
                  : 'loading-stripe 0.5s linear infinite',
              }}
            />
          </div>

          <div className="text-[10px] text-[#666666] text-right">{Math.round(loading.progress)}%</div>
        </div>
      </div>
    </div>
  )
}
