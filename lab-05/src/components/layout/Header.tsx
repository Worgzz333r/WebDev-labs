import { Link, useNavigate } from 'react-router';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/common/Button';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md dark:bg-gray-900">
      <nav className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="text-2xl font-bold text-primary-600">
          MyApp
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-primary-600">
            Головна
          </Link>
          <Link to="/about" className="hover:text-primary-600">
            Про нас
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-primary-600">
                Панель
              </Link>
              <span className="text-sm text-gray-500">{user.name}</span>
              <Button size="sm" variant="secondary" onClick={handleLogout}>
                Вийти
              </Button>
            </>
          ) : (
            <Link to="/login" className="hover:text-primary-600">
              Увійти
            </Link>
          )}
          <button type="button" onClick={toggleTheme} aria-label="Перемкнути тему">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>
    </header>
  );
}
