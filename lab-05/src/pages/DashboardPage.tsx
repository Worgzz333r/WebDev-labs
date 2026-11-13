import { Link } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

// Розділи панелі: додавайте нові сутності проєкту сюди
const sections = [{ to: '/groups', title: 'Групи', text: 'Перегляд груп та кількості студентів' }];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Вітаємо, {user?.fullName}!</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {sections.map((s) => (
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
    </div>
  );
}
