import { lazy, Suspense } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import DatePickerField from '@/components/common/DatePickerField';
import ErrorMessage from '@/components/common/ErrorMessage';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Skeleton from '@/components/common/Skeleton';
import { useGroupOptions, useSubjectOptions, useTeacherOptions } from '@/hooks/useLookups';
import { lessonSchema, type LessonFormData, type LessonFormInput } from '@/schemas/lesson.schema';
import { lessonsService } from '@/services/lessons';
import { useAuthStore } from '@/stores/authStore';
import { htmlToText } from '@/utils/sanitize';

// Tiptap важкий — завантажуємо окремим chunk лише на цій сторінці (завдання 13)
const RichTextEditor = lazy(() => import('@/components/common/RichTextEditor'));

const selectClass =
  'w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900';

// ISO (UTC) -> { day: 'yyyy-MM-dd', time: 'HH:mm' } у локальному часі
const isoToLocalParts = (iso: string) => {
  const d = new Date(iso);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { day, time };
};

export default function LessonFormPage() {
  const { id } = useParams();
  const lessonId = id ? Number(id) : undefined;
  const isEdit = lessonId !== undefined;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const { data: groups } = useGroupOptions();
  const { data: subjects } = useSubjectOptions();
  const { data: teachers } = useTeacherOptions(canEdit);
  const {
    data: lesson,
    isError,
    error,
  } = useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: () => lessonsService.getById(lessonId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LessonFormInput, unknown, LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      day: '',
      time: '',
      topic: '',
      teacherId: user?.role === 'TEACHER' ? String(user.id) : '',
    },
    values: lesson
      ? {
          ...isoToLocalParts(lesson.date),
          topic: lesson.topic ?? '',
          subjectId: String(lesson.subjectId),
          groupId: String(lesson.groupId),
          teacherId: String(lesson.teacherId),
        }
      : undefined,
  });

  const save = useMutation({
    mutationFn: (data: LessonFormData) => {
      // локальні дата+час -> ISO у UTC
      const date = new Date(`${data.day}T${data.time}:00`).toISOString();
      const payload = {
        date,
        topic: htmlToText(data.topic ?? '').length > 0 ? data.topic : undefined,
        subjectId: data.subjectId,
        groupId: data.groupId,
        teacherId: data.teacherId,
      };
      return isEdit ? lessonsService.update(lessonId, payload) : lessonsService.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success(isEdit ? 'Заняття оновлено' : 'Заняття створено');
      navigate('/lessons');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося зберегти заняття');
    },
  });

  if (!canEdit) return <Navigate to="/lessons" replace />;

  // форму показуємо, коли всі довідники (і заняття при редагуванні) завантажені
  const ready = groups && subjects && teachers && (!isEdit || lesson);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Заняття', to: '/lessons' },
          { label: isEdit ? 'Редагування' : 'Нове заняття' },
        ]}
      />
      <h1 className="text-3xl font-bold">{isEdit ? 'Редагування заняття' : 'Нове заняття'}</h1>

      {!ready && !isError && <Skeleton className="h-72" />}
      {isEdit && isError && <ErrorMessage message={error.message} />}

      {ready && (
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-900"
          noValidate
        >
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <FormField label="Дата" error={errors.day?.message}>
              <Controller
                control={control}
                name="day"
                render={({ field }) => (
                  <DatePickerField
                    ariaLabel="Дата заняття"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <FormField label="Час" error={errors.time?.message}>
              <Input type="time" {...register('time')} className="w-32" />
            </FormField>
          </div>

          <FormField label="Тема (необов'язково)" error={errors.topic?.message}>
            <Suspense fallback={<Skeleton className="h-40" />}>
              <Controller
                control={control}
                name="topic"
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    ariaLabel="Тема заняття"
                  />
                )}
              />
            </Suspense>
          </FormField>

          <FormField label="Предмет" error={errors.subjectId?.message}>
            <select className={selectClass} {...register('subjectId')}>
              <option value="">Оберіть предмет</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Група" error={errors.groupId?.message}>
            <select className={selectClass} {...register('groupId')}>
              <option value="">Оберіть групу</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Викладач" error={errors.teacherId?.message}>
            <select className={selectClass} {...register('teacherId')}>
              <option value="">Оберіть викладача</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </FormField>

          <div className="flex gap-4">
            <Button type="submit" isLoading={save.isPending}>
              {isEdit ? 'Зберегти' : 'Створити'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/lessons')}>
              Скасувати
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
