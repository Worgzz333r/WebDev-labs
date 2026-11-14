import { Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Skeleton from '@/components/common/Skeleton';
import { useGroupOptions } from '@/hooks/useLookups';
import {
  ROLES,
  roleLabels,
  userCreateSchema,
  userEditSchema,
  type UserFormData,
  type UserFormInput,
} from '@/schemas/user.schema';
import { usersService } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';

const selectClass =
  'w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900';

export default function UserFormPage() {
  const { id } = useParams();
  const userId = id ? Number(id) : undefined;
  const isEdit = userId !== undefined;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const { data: groups } = useGroupOptions();
  const {
    data: user,
    isError,
    error,
  } = useQuery({
    queryKey: ['users', userId],
    queryFn: () => usersService.getById(userId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormInput, unknown, UserFormData>({
    resolver: zodResolver(isEdit ? userEditSchema : userCreateSchema),
    defaultValues: { role: 'STUDENT', groupId: '', password: '' },
    values: user
      ? {
          fullName: user.fullName,
          email: user.email,
          password: '',
          role: user.role,
          groupId: user.groupId ? String(user.groupId) : '',
        }
      : undefined,
  });

  const save = useMutation({
    mutationFn: (data: UserFormData) => {
      const payload = { ...data, password: data.password || undefined };
      return isEdit ? usersService.update(userId, payload) : usersService.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isEdit ? 'Користувача оновлено' : 'Користувача створено');
      navigate('/users');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося зберегти користувача');
    },
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const ready = groups && (!isEdit || user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Користувачі', to: '/users' },
          { label: isEdit ? 'Редагування' : 'Новий користувач' },
        ]}
      />
      <h1 className="text-3xl font-bold">{isEdit ? 'Редагування користувача' : 'Новий користувач'}</h1>

      {!ready && !isError && <Skeleton className="h-80" />}
      {isEdit && isError && <ErrorMessage message={error.message} />}

      {ready && (
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-900"
          noValidate
        >
          <FormField label="Ім’я" error={errors.fullName?.message}>
            <Input placeholder="Іван Петренко" {...register('fullName')} />
          </FormField>

          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="user@example.com" {...register('email')} />
          </FormField>

          <FormField
            label={isEdit ? 'Новий пароль (залиште порожнім, щоб не змінювати)' : 'Пароль'}
            error={errors.password?.message}
          >
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </FormField>

          <FormField label="Роль" error={errors.role?.message}>
            <select className={selectClass} {...register('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Група (для студентів)" error={errors.groupId?.message}>
            <select className={selectClass} {...register('groupId')}>
              <option value="">Без групи</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex gap-4">
            <Button type="submit" isLoading={save.isPending}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
              Скасувати
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}