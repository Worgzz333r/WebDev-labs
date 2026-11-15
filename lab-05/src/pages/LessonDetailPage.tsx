import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { lessonsService } from '@/services/lessons';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorMessage from '@/components/common/ErrorMessage';
import Skeleton from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';

export default function LessonDetailPage() {
  const { id } = useParams();
  const lessonId = Number(id);
  const canEdit = useAuthStore((s) => s.user?.role === 'ADMIN' || s.user?.role === 'TEACHER');

  const {
    data: lesson,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['lessons', lessonId],
    queryFn: () => lessonsService.getById(lessonId),
  });

  const rows = lesson
    ? [
        {
          label: 'Дата й час',
          value: new Date(lesson.date).toLocaleString('uk-UA', {
            dateStyle: 'long',
            timeStyle: 'short',
          }),
        },
        { label: 'Предмет', value: lesson.subject.name },
        { label: 'Група', value: lesson.group.name },
        { label: 'Викладач', value: lesson.teacher.fullName },
      ]
    : [];

  return (
    <section className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Заняття', to: '/lessons' },
          { label: lesson ? (lesson.topic ?? `Заняття #${lesson.id}`) : '...' },
        ]}
      />

      {isPending && (
        <>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
        </>
      )}
      {isError && <ErrorMessage message={error.message} />}

      {lesson && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{lesson.topic ?? `Заняття #${lesson.id}`}</h1>
            {canEdit && (
              <Link to={`/lessons/${lesson.id}/edit`}>
                <Button variant="secondary">Редагувати</Button>
              </Link>
            )}
          </div>

          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-sm text-gray-500">{r.label}</dt>
                  <dd className="text-lg font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      )}
    </section>
  );
}