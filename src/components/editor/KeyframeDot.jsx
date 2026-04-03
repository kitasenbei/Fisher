import { useState } from 'react'

export default function KeyframeDot({ active: controlledActive, onChange, className = '' }) {
  const isControlled = controlledActive !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledActive ?? false)
  const active = isControlled ? controlledActive : internal

  function handleClick(e) {
    e.stopPropagation()
    const next = !active
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
      className={`w-3 h-3 flex items-center justify-center cursor-default group ${className}`}
      onClick={handleClick}
      title={active ? 'Remove keyframe' : 'Insert keyframe'}
    >
      <svg
        className={`w-[7px] h-[7px] transition-colors ${
          active ? 'text-[#f5c542]' : 'text-[#535353] group-hover:text-[#777777]'
        }`}
        viewBox="0 0 8 8"
        fill="currentColor"
      >
        <path d="M4 0L7.5 4L4 8L0.5 4Z" />
      </svg>
    </button>
  )
}
