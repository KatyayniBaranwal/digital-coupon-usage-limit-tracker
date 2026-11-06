import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="small"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className={`confirm-icon ${danger ? '' : 'neutral'}`}>
        {danger ? <AlertTriangle size={26} /> : <HelpCircle size={26} />}
      </div>
      <p style={{ color: '#35406a' }}>{message}</p>
    </Modal>
  );
}
