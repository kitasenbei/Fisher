import { useState } from 'react'

export default function IconToggle({ icon, activeIcon, checked: controlledChecked, onChange, tooltip, className = '' }) {
  const isControlled = controlledChecked !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledChecked ?? false)
  const checked = isControlled ? controlledChecked : internal

  function handleClick(e) {
    e.stopPropagation()
    const next = !checked
    if (isControlled) {
      onChange(next)
    } else {
      setInternal(next)
      onChange?.(next)
    }
  }

  return (
    <button
      type="button"
      className={`w-4 h-4 flex items-center justify-center cursor-default transition-colors ${
        checked ? 'text-[#cccccc]' : 'text-[#535353] hover:text-[#777777]'
      } ${className}`}
      onClick={handleClick}
      title={tooltip}
    >
      {checked ? (activeIcon ?? icon) : icon}
    </button>
  )
}
