import { useState } from 'react'
import GripHandle from './GripHandle'

export default function PropertyPanel({
  title,
  children,
  collapsed: controlledCollapsed,
  onToggle,
  draggable,
  actions,
  className = '',
}) {
  const isControlled = controlledCollapsed !== undefined && typeof onToggle === 'function'
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed

  function handleToggle() {
    if (isControlled) {
      onToggle()
    } else {
      setInternalCollapsed((c) => !c)
    }
  }

  return (
    <div className={`border-b border-[#3b3b3b] ${className}`}>
      {title && (
        <div className="flex items-center bg-[#383838] hover:bg-[#404040] transition-colors">
          <button
            type="button"
            className="flex-1 flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#cccccc] cursor-default select-none"
            onClick={handleToggle}
          >
            <svg
              className={`w-2 h-2 text-[#999999] transition-transform duration-100 ${collapsed ? '' : 'rotate-90'}`}
              viewBox="0 0 6 8"
              fill="currentColor"
            >
              <path d="M1 0.5L5 4L1 7.5V0.5Z" />
            </svg>
            {title}
          </button>
          <div className="flex items-center gap-0.5 pr-1">
            {actions}
            {draggable && <GripHandle />}
          </div>
        </div>
      )}
      {!collapsed && <div className="px-2 py-1.5 space-y-1.5">{children}</div>}
    </div>
  )
}

export function PropertyRow({ label, children, actions }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#999999] w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-0.5 shrink-0">{actions}</div>}
    </div>
  )
}
