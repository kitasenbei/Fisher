export default function Badge({ children, className = '', ...props }) {
  return (
    <span className={className} {...props}>
      {children}
    </span>
  )
}
