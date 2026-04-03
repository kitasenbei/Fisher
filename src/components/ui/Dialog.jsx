import Modal from './Modal'
import Button from './Button'

export default function Dialog({ open, onClose, title, message, onConfirm, confirmLabel = 'OK', cancelLabel = 'Cancel', variant = 'confirm' }) {
  return (
    <Modal open={open} onClose={onClose} className="bg-[#2b2b2b] border border-[#3b3b3b] rounded-[3px] p-3 shadow-lg shadow-black/40 max-w-sm backdrop:bg-black/50">
      {title && <h3 className="text-[12px] text-[#cccccc] font-normal mb-1.5">{title}</h3>}
      {message && <p className="text-[11px] text-[#999999] mb-3">{message}</p>}
      <div className="flex justify-end gap-1.5">
        {variant === 'confirm' && (
          <Button variant="secondary" size="sm" onClick={onClose}>{cancelLabel}</Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={() => { onConfirm?.(); onClose() }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
