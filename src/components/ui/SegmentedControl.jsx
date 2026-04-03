import { useState } from 'react'

export default function SegmentedControl({ options = [], value: controlledValue, onChange, className = '' }) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? options[0]?.value)
  const value = isControlled ? controlledValue : internal

  function handleClick(opt) {
    if (isControlled) {
      onChange(opt.value)
    } else {
      setInternal(opt.value)
      onChange?.(opt.value)
    }
  }

  return (
    <div className={`flex rounded-[3px] overflow-hidden border border-[#3b3b3b] ${className}`}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          className={`flex-1 px-2 py-[3px] text-[10px] cursor-default select-none transition-colors duration-100 ${
            i > 0 ? 'border-l border-[#3b3b3b]' : ''
          } ${
            value === opt.value
              ? 'bg-[#2d8ceb] text-white'
              : 'bg-[#383838] text-[#999999] hover:bg-[#404040] hover:text-[#cccccc]'
          }`}
          onClick={() => handleClick(opt)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
