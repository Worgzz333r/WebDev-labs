import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Модальне вікно підтвердження небезпечних дій (замість window.confirm), побудоване на Modal
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Видалити',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} size="sm">
      <p className="mb-6 text-gray-600 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Скасувати
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
