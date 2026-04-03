export default function Breadcrumb({ items = [], onNavigate, className = '' }) {
  return (
    <nav className={`flex items-center gap-1 text-[11px] ${className}`}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[#666666]">/</span>}
          {i < items.length - 1 ? (
            <button
              type="button"
              className="text-[#999999] hover:text-[#cccccc] cursor-default"
              onClick={() => onNavigate?.(item, i)}
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[#cccccc]">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
