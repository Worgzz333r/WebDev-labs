import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema';
import api from '@/services/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import FormField from '@/components/common/FormField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ fullName, email, password }: RegisterFormData) => {
    try {
      // confirmPassword на сервер не надсилаємо
      await api.post('/auth/register', { fullName, email, password });
      toast.success('Обліковий запис створено. Тепер увійдіть.');
      navigate('/login');
    } catch (error) {
      const message = isAxiosError(error) ? error.response?.data?.error : undefined;
      setError('root', { message: message ?? 'Помилка реєстрації' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <h2 className="mb-6 text-center text-3xl font-bold">Реєстрація</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Ім'я" error={errors.fullName?.message}>
            <Input {...register('fullName')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email')} />
          </FormField>
          <FormField label="Пароль" error={errors.password?.message}>
            <Input type="password" {...register('password')} />
          </FormField>
          <FormField label="Підтвердження пароля" error={errors.confirmPassword?.message}>
            <Input type="password" {...register('confirmPassword')} />
          </FormField>

          {errors.root && (
            <p role="alert" className="text-sm text-red-500">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Зареєструватися
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Вже є акаунт?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
