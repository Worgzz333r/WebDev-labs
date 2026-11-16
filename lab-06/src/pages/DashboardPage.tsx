import { Link } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { useSyncExternalStore } from 'react';
import Tabs from '@/components/common/Tabs';
import { socket } from '@/services/socket';

const subscribeSocket = (cb: () => void) => {
  socket.on('connect', cb);
  socket.on('disconnect', cb);
  return () => {
    socket.off('connect', cb);
    socket.off('disconnect', cb);
  };
};

interface Section {
  to: string;
  title: string;
  text: string;
  adminOnly?: boolean;
}

// Розділи панелі: додавайте нові сутності проєкту сюди
const sections: Section[] = [
  { to: '/groups', title: 'Групи', text: 'Перегляд груп та кількості студентів' },
  { to: '/subjects', title: 'Предмети', text: 'Каталог навчальних предметів' },
  { to: '/lessons', title: 'Заняття', text: 'Розклад занять із фільтрами за групою та предметом' },
  { to: '/users', title: 'Користувачі', text: 'Керування користувачами системи', adminOnly: true },
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const connected = useSyncExternalStore(subscribeSocket, () => socket.connected);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Вітаємо, {user?.fullName}!</h1>

      <Tabs
        tabs={[
          {
            label: 'Розділи',
            content: (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {sections
                  .filter((s) => !s.adminOnly || isAdmin)
                  .map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg dark:bg-gray-900"
                    >
                      <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{s.text}</p>
                    </Link>
                  ))}
              </div>
            ),
          },
          {
            label: 'Реальний час',
            content: (
              <p className="text-gray-600 dark:text-gray-400">
                З'єднання Socket.io:{' '}
                <strong className={connected ? 'text-green-600' : 'text-red-600'}>
                  {connected ? 'активне' : 'відсутнє'}
                </strong>
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
