import { Button } from '../button/button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmation avant action destructive (suppression…). */
export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="alertdialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2></div>
        <p className="modal-intro">{message}</p>
        <div className="modal-actions">
          <Button variant="tertiary" onClick={onCancel} autoFocus>Annuler</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
