import { useState } from 'react'

export default function Checkbox({ label, id, checked: controlledChecked, onChange, className = '', ...props }) {
  const isControlled = controlledChecked !== undefined && onChange !== undefined
  const [internal, setInternal] = useState(controlledChecked ?? false)
  const checked = isControlled ? controlledChecked : internal

  function handleChange(e) {
    if (isControlled) {
      onChange(e)
    } else {
      setInternal(e.target.checked)
      onChange?.(e)
    }
  }

  return (
    <label htmlFor={id} className={`flex items-center gap-1.5 cursor-default select-none text-[11px] group ${className}`}>
      <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center transition-all duration-150 ${
        checked
          ? 'bg-[#2d8ceb]/15 border-[#2d8ceb] shadow-[inset_0_0_4px_rgba(45,140,235,0.3)]'
          : 'bg-[#2b2b2b] border-[#3b3b3b] group-hover:border-[#505050]'
      }`}>
        {checked && (
          <svg className="w-[7px] h-[7px] text-[#2d8ceb] drop-shadow-[0_0_3px_rgba(45,140,235,0.5)]" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 4L3.5 6L6.5 2" />
          </svg>
        )}
      </div>
      <input type="checkbox" id={id} checked={checked} onChange={handleChange} className="sr-only" {...props} />
      {label && (
        <span className={`transition-colors duration-100 ${checked ? 'text-[#cccccc]' : 'text-[#999999]'}`}>
          {label}
        </span>
      )}
    </label>
  )
}
