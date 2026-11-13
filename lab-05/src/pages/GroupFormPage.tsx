import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { groupSchema, type GroupFormData } from '@/schemas/group.schema';
import { groupsService } from '@/services/groups';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Skeleton from '@/components/common/Skeleton';

export default function GroupFormPage() {
  const { id } = useParams();
  const groupId = id ? Number(id) : undefined;
  const isEdit = groupId !== undefined;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  // Дані групи потрібні лише при редагуванні
  const {
    data: group,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsService.getById(groupId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    values: group ? { name: group.name } : undefined, // підставляє дані після завантаження
  });

  const save = useMutation({
    mutationFn: (payload: GroupFormData) =>
      isEdit ? groupsService.update(groupId, payload) : groupsService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(isEdit ? 'Групу оновлено' : 'Групу створено');
      navigate('/groups');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося зберегти групу');
    },
  });

  if (!isAdmin) return <Navigate to="/groups" replace />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">{isEdit ? 'Редагування групи' : 'Нова група'}</h1>

      {isEdit && isPending && <Skeleton className="h-40" />}
      {isEdit && isError && <ErrorMessage message={error.message} />}

      {(!isEdit || group) && (
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-900"
          noValidate
        >
          <FormField label="Назва групи" error={errors.name?.message}>
            <Input placeholder="121-ІПЗ" {...register('name')} />
          </FormField>

          <div className="flex gap-4">
            <Button type="submit" isLoading={save.isPending}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/groups')}>
              Скасувати
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}