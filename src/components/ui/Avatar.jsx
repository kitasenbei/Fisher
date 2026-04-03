export default function Avatar({ src, alt = '', fallback, className = '', ...props }) {
  if (!src && fallback) {
    return (
      <span className={className} {...props}>
        {fallback}
      </span>
    )
  }

  return <img src={src} alt={alt} className={className} {...props} />
}
