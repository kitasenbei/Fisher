export default function ViewportOverlay({ info, subInfo, className = '' }) {
  return (
    <div className={`text-[11px] select-none ${className}`}>
      {info && <div className="text-[#cccccc]">{info}</div>}
      {subInfo && <div className="text-[#999999]">{subInfo}</div>}
    </div>
  )
}
