import { useState } from 'react'

function TreeNode({ node, depth = 0, onSelect, selected }) {
  const [expanded, setExpanded] = useState(node.expanded ?? false)
  const hasChildren = node.children?.length > 0

  return (
    <div>
      <div
        className={`flex items-center py-[2px] cursor-default select-none text-[11px] hover:bg-[#404040] group ${
          selected === node.id ? 'bg-[#2d8ceb] text-white' : 'text-[#cccccc]'
        }`}
        style={{ paddingLeft: depth * 14 + 4 }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e)
          onSelect?.(node)
        }}
      >
        {hasChildren ? (
          <svg
            className={`w-2 h-2 shrink-0 transition-transform duration-100 ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 6 8"
            fill="currentColor"
          >
            <path d="M1 0.5L5 4L1 7.5V0.5Z" />
          </svg>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        {node.icon && <span className="flex items-center text-[#999999] ml-1 shrink-0">{node.icon}</span>}
        <span className="truncate ml-1 flex-1">{node.label}</span>
        {node.actions && (
          <div className="flex items-center gap-0.5 ml-auto pr-1 shrink-0 opacity-60 group-hover:opacity-100">
            {node.actions}
          </div>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Tree({ nodes = [], onSelect, selected, className = '' }) {
  return (
    <div className={`bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] py-0.5 ${className}`}>
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} onSelect={onSelect} selected={selected} />
      ))}
    </div>
  )
}
