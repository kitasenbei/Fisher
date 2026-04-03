export default function GripHandle({ className = '' }) {
  return (
    <div
      className={`flex items-center cursor-grab active:cursor-grabbing text-[#535353] hover:text-[#777777] transition-colors ${className}`}
      title="Drag to reorder"
    >
      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
        <circle cx="1.5" cy="1.5" r="0.8" />
        <circle cx="4.5" cy="1.5" r="0.8" />
        <circle cx="1.5" cy="5" r="0.8" />
        <circle cx="4.5" cy="5" r="0.8" />
        <circle cx="1.5" cy="8.5" r="0.8" />
        <circle cx="4.5" cy="8.5" r="0.8" />
      </svg>
    </div>
  )
}
