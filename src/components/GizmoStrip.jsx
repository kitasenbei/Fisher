import Tooltip from './Tooltip'

export default function GizmoStrip({ items = [], orientation = 'vertical', className = '' }) {
  const isVertical = orientation === 'vertical'

  return (
    <div className={`flex ${isVertical ? 'flex-col' : ''} gap-1 ${className}`}>
      {items.map((item, i) => (
        <Tooltip key={i} content={item.label} position={isVertical ? 'left' : 'bottom'}>
          <button
            className={`w-6 h-6 flex items-center justify-center rounded-full cursor-default border transition-colors ${
              item.active
                ? 'bg-[#2d8ceb] text-white border-[#2d8ceb]'
                : 'bg-[#3c3c3c]/80 text-[#999999] hover:text-[#cccccc] border-[#4a4a4a]/50'
            }`}
            onClick={item.action}
          >
            {item.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
