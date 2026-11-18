import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from './NotificationBell';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { socket } from '@/services/socket';

// Підміняємо справжній сокет мінімальним емітером подій: мережа в модульних тестах не потрібна
vi.mock('@/services/socket', () => {
  type Handler = (payload: unknown) => void;
  const handlers = new Map<string, Set<Handler>>();
  return {
    socket: {
      on: (event: string, h: Handler) => handlers.set(event, (handlers.get(event) ?? new Set()).add(h)),
      off: (event: string, h: Handler) => handlers.get(event)?.delete(h),
      emit: (event: string, payload: unknown) => handlers.get(event)?.forEach((h) => h(payload)),
      count: (event: string) => handlers.get(event)?.size ?? 0,
    },
  };
});

const fake = socket as unknown as {
  emit: (e: string, p: unknown) => void;
  count: (e: string) => number;
};

beforeEach(() => useNotificationsStore.getState().clearAll());

test('подія notification збільшує лічильник, клік позначає сповіщення прочитаним', async () => {
  const u = userEvent.setup();
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: /непрочитаних 0/ })).toBeInTheDocument();

  // формат payload — як у сервера lab-03: title/body/priority
  act(() => fake.emit('notification', { title: 'Відмічено відвідуваність', body: 'Статус: відсутній', priority: 'HIGH' }));
  expect(screen.getByRole('button', { name: /непрочитаних 1/ })).toBeInTheDocument();

  // відкриваємо дзвіночок
  await u.click(screen.getByRole('button', { name: /Сповіщення/ }));
  expect(screen.getByText('Статус: відсутній')).toBeInTheDocument();

  // клік по сповіщенню позначає його прочитаним
  await u.click(screen.getByText('Статус: відсутній'));
  expect(screen.getByRole('button', { name: /непрочитаних 0/ })).toBeInTheDocument();
});

test('при розмонтуванні компонент знімає власний обробник (життєвий цикл Socket.io)', () => {
  const { unmount } = render(<NotificationBell />);
  expect(fake.count('notification')).toBe(1);
  unmount();
  expect(fake.count('notification')).toBe(0);
});
