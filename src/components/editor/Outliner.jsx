import Tree from '../ui/Tree'

export default function Outliner({ nodes = [], selected, onSelect, searchIcon, filterIcon, className = '' }) {
  return (
    <div className={`flex flex-col bg-[#2b2b2b] ${className}`}>
      {/* Search/filter header */}
      <div className="flex items-center gap-1 px-1.5 py-1 border-b border-[#1e1e1e]">
        {searchIcon && <span className="text-[#666666] shrink-0 flex items-center">{searchIcon}</span>}
        <input
          placeholder="Search"
          className="flex-1 bg-transparent text-[11px] text-[#cccccc] outline-none placeholder:text-[#666666]"
        />
        {filterIcon && (
          <button className="text-[#999999] hover:text-[#cccccc] cursor-default shrink-0 flex items-center">{filterIcon}</button>
        )}
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <Tree
          nodes={nodes}
          selected={selected}
          onSelect={onSelect}
          className="!border-0 !rounded-none"
        />
      </div>
    </div>
  )
}
