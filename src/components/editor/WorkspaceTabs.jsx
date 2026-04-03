import { useState } from 'react'

export default function WorkspaceTabs({ tabs = [], value: controlledValue, onChange, className = '' }) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? tabs[0]?.value)
  const active = isControlled ? controlledValue : internal

  function handleClick(tab) {
    if (isControlled) {
      onChange(tab.value)
    } else {
      setInternal(tab.value)
      onChange?.(tab.value)
    }
  }

  return (
    <div className={`flex items-center bg-[#2b2b2b] border-b border-[#1e1e1e] h-6 px-1 gap-px ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={`px-3 h-5 text-[11px] rounded-t-[3px] cursor-default transition-colors ${
            active === tab.value ? 'bg-[#3c3c3c] text-[#ffffff]' : 'text-[#999999] hover:text-[#cccccc]'
          }`}
          onClick={() => handleClick(tab)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
