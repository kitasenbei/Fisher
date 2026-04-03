export default function Radio({ label, id, name, value, checked, onChange, className = '', ...props }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-1.5 cursor-default select-none text-[11px] text-[#cccccc] ${className}`}
    >
      <div
        className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors duration-100 ${
          checked ? 'border-[#2d8ceb]' : 'border-[#3b3b3b]'
        } bg-[#535353]`}
      >
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-[#2d8ceb]" />}
      </div>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
        {...props}
      />
      {label}
    </label>
  )
}
