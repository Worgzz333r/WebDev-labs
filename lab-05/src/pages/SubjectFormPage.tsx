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
import { subjectSchema, type SubjectFormData } from '@/schemas/subject.schema';
import { subjectsService } from '@/services/subjects';
import { useAuthStore } from '@/stores/authStore';

export default function SubjectFormPage() {
  const { id } = useParams();
  const subjectId = id ? Number(id) : undefined;
  const isEdit = subjectId !== undefined;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const { data: subject, isPending, isError, error } = useQuery({
    queryKey: ['subjects', subjectId],
    queryFn: () => subjectsService.getById(subjectId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    values: subject ? { name: subject.name } : undefined,
  });

  const save = useMutation({
    mutationFn: (payload: SubjectFormData) =>
      isEdit ? subjectsService.update(subjectId, payload) : subjectsService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(isEdit ? 'Предмет оновлено' : 'Предмет створено');
      navigate('/subjects');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося зберегти предмет');
    },
  });

  if (!isAdmin) return <Navigate to="/subjects" replace />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Предмети', to: '/subjects' },
          { label: isEdit ? 'Редагування' : 'Новий предмет' },
        ]}
      />
      <h1 className="text-3xl font-bold">{isEdit ? 'Редагування предмета' : 'Новий предмет'}</h1>

      {isEdit && isPending && <Skeleton className="h-40" />}
      {isEdit && isError && <ErrorMessage message={error.message} />}

      {(!isEdit || subject) && (
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-900"
          noValidate
        >
          <FormField label="Назва предмета" error={errors.name?.message}>
            <Input placeholder="Веб-розробка" {...register('name')} />
          </FormField>

          <div className="flex gap-4">
            <Button type="submit" isLoading={save.isPending}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/subjects')}>
              Скасувати
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}