import { Link } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Облік відвідуваності</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Клієнтська частина системи обліку відвідуваності занять.
      </p>
      <Link
        to={isAuthenticated ? '/dashboard' : '/login'}
        className="inline-block text-primary-600 hover:underline"
      >
        {isAuthenticated ? 'Перейти до панелі' : 'Увійти'}
      </Link>
    </section>
  );
}