export default function Textarea({ label, id, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label && <label htmlFor={id} className="block text-[11px] text-[#999999]">{label}</label>}
      <textarea
        id={id}
        className={`w-full bg-[#535353] text-[#cccccc] text-[12px] leading-tight px-2 py-1 border border-[#3b3b3b] rounded-[3px] outline-none focus:border-[#2d8ceb] transition-colors duration-100 resize-y placeholder:text-[#666666] ${className}`}
        {...props}
      />
    </div>
  )
}
