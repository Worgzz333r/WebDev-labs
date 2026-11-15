import { useEffect, useRef } from 'react';
import Button from '@/components/common/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Модальне вікно підтвердження небезпечних дій (замість window.confirm)
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Видалити',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape: стан керуємо самі, тому скасовуємо поведінку браузера
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      // Клік по затемненню (сам <dialog>, а не вміст) закриває вікно
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className="m-auto w-full max-w-md rounded-lg bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/40 dark:bg-gray-900 dark:text-gray-100"
    >
      <div className="p-6">
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Скасувати
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}