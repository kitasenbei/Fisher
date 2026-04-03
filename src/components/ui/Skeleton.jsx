export default function Skeleton({ width, height = 16, rounded = false, className = '' }) {
  return (
    <div
      className={`bg-[#3b3b3b] animate-pulse ${rounded ? 'rounded-full' : 'rounded-[3px]'} ${className}`}
      style={{ width, height }}
    />
  )
}
