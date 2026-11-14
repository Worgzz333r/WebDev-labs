import { useState } from 'react';
import { Outlet } from 'react-router';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <div className="flex flex-1">
        {user && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {user && (
              <button
                type="button"
                className="mb-4 rounded border px-3 py-1 text-sm lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Відкрити меню"
              >
                ☰ Меню
              </button>
            )}
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}