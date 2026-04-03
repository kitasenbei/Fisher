const variants = {
  primary:
    'bg-[#2d8ceb] text-white border-[#1a6fbf] hover:bg-[#3a96f0] active:bg-[#2478cc]',
  secondary:
    'bg-[#535353] text-[#cccccc] border-[#3b3b3b] hover:bg-[#5a5a5a] active:bg-[#484848]',
  ghost:
    'bg-transparent text-[#cccccc] border-transparent hover:bg-[#4a4a4a] active:bg-[#404040]',
}

const sizes = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-[12px] px-3 py-1',
  lg: 'text-[13px] px-4 py-1.5',
}

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`${variants[variant]} ${sizes[size]} border rounded-[3px] font-normal leading-tight cursor-default select-none transition-colors duration-100 disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
