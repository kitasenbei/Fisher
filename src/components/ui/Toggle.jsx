import { useState } from 'react'

export default function Toggle({ label, checked: controlledChecked, onChange, className = '', ...props }) {
  const isControlled = controlledChecked !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledChecked ?? false)
  const checked = isControlled ? controlledChecked : internal

  function handleClick() {
    const next = !checked
    if (isControlled) {
      onChange({ target: { checked: next } })
    } else {
      setInternal(next)
      onChange?.({ target: { checked: next } })
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={`flex items-center gap-1.5 cursor-default select-none text-[11px] group ${className}`}
      {...props}
    >
      <div className={`relative w-[26px] h-[14px] rounded-[3px] border transition-all duration-150 ${
        checked
          ? 'bg-[#2d8ceb]/10 border-[#2d8ceb]'
          : 'bg-[#2b2b2b] border-[#3b3b3b] group-hover:border-[#505050]'
      }`}>
        {/* Sliding thumb */}
        <div className={`absolute top-[2px] w-[10px] h-[8px] rounded-[2px] transition-all duration-150 ${
          checked
            ? 'left-[12px] bg-[#2d8ceb] shadow-[0_0_4px_rgba(45,140,235,0.5)]'
            : 'left-[2px] bg-[#666666]'
        }`} />
      </div>
      {label && (
        <span className={`transition-colors duration-100 ${checked ? 'text-[#cccccc]' : 'text-[#999999]'}`}>
          {label}
        </span>
      )}
    </button>
  )
}
