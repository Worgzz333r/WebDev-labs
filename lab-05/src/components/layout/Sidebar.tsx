import { useEffect } from 'react';
import { NavLink } from 'react-router';

const links = [
  { to: '/dashboard', label: 'Панель', icon: '📊' },
  { to: '/groups', label: 'Групи', icon: '👥' },
  { to: '/subjects', label: 'Предмети', icon: '📚' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        aria-label="Бічна панель"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white p-4 shadow-lg transition-transform dark:bg-gray-900 lg:static lg:z-auto lg:translate-x-0 lg:border-r lg:border-gray-200 lg:shadow-none lg:dark:border-gray-800 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="font-semibold">Меню</span>
          <button type="button" onClick={onClose} aria-label="Закрити меню">
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded px-3 py-2 ${
                  isActive ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              {link.icon} {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}