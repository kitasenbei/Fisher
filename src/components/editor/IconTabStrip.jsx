import { useState } from 'react'
import Tooltip from '../ui/Tooltip'

export default function IconTabStrip({
  tabs = [],
  value: controlledValue,
  onChange,
  position = 'left',
  className = '',
}) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? tabs[0]?.id)
  const active = isControlled ? controlledValue : internal

  function handleClick(tab) {
    if (isControlled) {
      onChange(tab.id)
    } else {
      setInternal(tab.id)
      onChange?.(tab.id)
    }
  }

  const horizontal = position === 'top' || position === 'bottom'
  const tipPos = horizontal ? (position === 'top' ? 'bottom' : 'top') : position === 'left' ? 'right' : 'left'

  if (horizontal) {
    return (
      <div className={`flex bg-[#323232] border-b border-[#1e1e1e] ${className}`}>
        {tabs.map((tab) => (
          <Tooltip key={tab.id} content={tab.label} position={tipPos} className="flex-1">
            <button
              className={`w-full flex items-center justify-center gap-1 py-1.5 text-[10px] cursor-default transition-colors ${
                active === tab.id
                  ? 'bg-[#2b2b2b] text-[#cccccc] border-b border-[#2d8ceb]'
                  : 'text-[#666666] hover:text-[#999999]'
              }`}
              onClick={() => handleClick(tab)}
            >
              {tab.icon}
            </button>
          </Tooltip>
        ))}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center py-1 gap-0.5 ${className}`}>
      {tabs.map((tab) => (
        <Tooltip key={tab.id} content={tab.label} position={tipPos}>
          <button
            className={`w-5 h-5 flex items-center justify-center rounded-[3px] cursor-default transition-colors ${
              active === tab.id ? 'bg-[#4b6fa6] text-white' : 'text-[#999999] hover:bg-[#3c3c3c] hover:text-[#cccccc]'
            }`}
            onClick={() => handleClick(tab)}
          >
            {tab.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
