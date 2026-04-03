import { useState } from 'react'
import Tooltip from '../ui/Tooltip'

export default function ToolStrip({
  tools = [],
  value: controlledValue,
  onChange,
  orientation = 'vertical',
  className = '',
}) {
  const isControlled = controlledValue !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledValue ?? tools.find((t) => !t.separator)?.id)
  const active = isControlled ? controlledValue : internal

  function handleClick(tool) {
    if (isControlled) {
      onChange(tool.id)
    } else {
      setInternal(tool.id)
      onChange?.(tool.id)
    }
  }

  const isVertical = orientation === 'vertical'

  return (
    <div className={`flex ${isVertical ? 'flex-col' : ''} items-center py-1 gap-0.5 ${className}`}>
      {tools.map((tool, i) =>
        tool.separator ? (
          <div key={i} className={isVertical ? 'w-5 h-px bg-[#3b3b3b] my-1' : 'h-5 w-px bg-[#3b3b3b] mx-1'} />
        ) : (
          <Tooltip
            key={tool.id}
            content={tool.label}
            description={tool.description}
            shortcut={tool.shortcut}
            position={isVertical ? 'right' : 'bottom'}
          >
            <button
              className={`w-7 h-7 flex items-center justify-center rounded-[3px] cursor-default transition-colors ${
                active === tool.id
                  ? 'bg-[#4b6fa6] text-white'
                  : 'text-[#999999] hover:bg-[#3c3c3c] hover:text-[#cccccc]'
              }`}
              onClick={() => handleClick(tool)}
            >
              {tool.icon}
            </button>
          </Tooltip>
        ),
      )}
    </div>
  )
}
