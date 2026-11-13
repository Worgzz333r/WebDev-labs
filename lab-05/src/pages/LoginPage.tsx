import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import type { AuthResponse } from '@/types/api.types';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import FormField from '@/components/common/FormField';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { data: res } = await api.post<AuthResponse>('/auth/login', data);
      login(res.user, res.tokens.accessToken);
      navigate(from, { replace: true });
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      setError('root', { message: message ?? 'Помилка входу' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <h2 className="mb-6 text-center text-3xl font-bold">Вхід</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="your@email.com" {...register('email')} />
          </FormField>

          <FormField label="Пароль" error={errors.password?.message}>
            <Input type="password" placeholder="••••••••" {...register('password')} />
          </FormField>

          {errors.root && (
            <p role="alert" className="text-sm text-red-500">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Увійти
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Немає акаунта?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}