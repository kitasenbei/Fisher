export default function Progress({ value, indeterminate = false, label, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex justify-between text-[11px]">
          <span className="text-[#999999]">{label}</span>
          {!indeterminate && <span className="text-[#cccccc]">{Math.round(value)}%</span>}
        </div>
      )}
      <div className="w-full h-[3px] bg-[#3b3b3b] rounded-full overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 bg-[#2d8ceb] rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full bg-[#2d8ceb] rounded-full transition-[width] duration-200"
            style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          />
        )}
      </div>
    </div>
  )
}
