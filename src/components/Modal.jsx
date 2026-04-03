import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, children, className = '' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={`fixed inset-0 m-auto ${className}`}
    >
      {children}
    </dialog>
  )
}
