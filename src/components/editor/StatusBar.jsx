export default function StatusBar({ left = [], right = [], className = '' }) {
  return (
    <div className={`flex items-center justify-between bg-[#3c3c3c] border-t border-[#2b2b2b] h-5 px-2 text-[10px] text-[#999999] select-none ${className}`}>
      <div className="flex items-center gap-3">
        {left.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {right.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  )
}
