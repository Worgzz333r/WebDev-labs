import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

// Діалог підтвердження (заміна window.confirm): відкриття, підтвердження,
// скасування і закриття клавішею Escape (доступність Headless UI)
describe('ConfirmDialog', () => {
  const setup = () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Видалення користувача"
        message="Видалити користувача «Тест»? Цю дію не можна скасувати."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  };

  test('показує заголовок і текст підтвердження', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Видалення користувача' })).toBeInTheDocument();
    expect(screen.getByText(/Видалити користувача «Тест»/)).toBeInTheDocument();
  });

  test('кнопка підтвердження викликає onConfirm', async () => {
    const u = userEvent.setup();
    const { onConfirm } = setup();
    await u.click(screen.getByRole('button', { name: 'Видалити' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('кнопка «Скасувати» і Escape викликають onCancel', async () => {
    const u = userEvent.setup();
    const { onCancel } = setup();
    await u.click(screen.getByRole('button', { name: 'Скасувати' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await u.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
