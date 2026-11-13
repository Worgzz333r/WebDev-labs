import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const location = useLocation();

  if (!isAuthenticated) {
    // state.from дозволяє повернути користувача на потрібну сторінку після входу
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}