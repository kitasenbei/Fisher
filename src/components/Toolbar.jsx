import Tooltip from './Tooltip'

export default function Toolbar({ items = [], orientation = 'horizontal', className = '' }) {
  const isVertical = orientation === 'vertical'

  return (
    <div className={`flex ${isVertical ? 'flex-col' : ''} bg-[#3c3c3c] border-b border-[#2b2b2b] gap-px p-0.5 ${className}`}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className={isVertical ? 'h-px w-full bg-[#2b2b2b] my-0.5' : 'w-px h-4 bg-[#2b2b2b] mx-0.5 self-center'} />
        ) : (
          <Tooltip key={i} content={item.tooltip ?? item.label} position={isVertical ? 'right' : 'bottom'}>
            <button
              type="button"
              className={`flex items-center justify-center w-5 h-5 rounded-[3px] cursor-default ${
                item.active ? 'bg-[#505050] text-white' : 'text-[#999999] hover:bg-[#505050] hover:text-[#cccccc]'
              } ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={item.action}
            >
              {item.icon}
            </button>
          </Tooltip>
        )
      )}
    </div>
  )
}
