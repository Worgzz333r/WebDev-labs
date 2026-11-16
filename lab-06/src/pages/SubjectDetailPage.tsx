import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { lessonsService } from '@/services/lessons';
import { subjectsService } from '@/services/subjects';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import List from '@/components/common/List';
import Skeleton, { TableSkeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';

export default function SubjectDetailPage() {
  const { id } = useParams();
  const subjectId = Number(id);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const {
    data: subject,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['subjects', subjectId],
    queryFn: () => subjectsService.getById(subjectId),
  });

  // Останні заняття цього предмета
  const { data: lessons } = useQuery({
    queryKey: ['lessons', { subjectId, scope: 'bySubject' }],
    queryFn: () => lessonsService.getAll({ subjectId, limit: 10, sortBy: 'date', order: 'desc' }),
  });

  return (
    <section className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Предмети', to: '/subjects' },
          { label: subject?.name ?? '...' },
        ]}
      />

      {isPending && (
        <>
          <Skeleton className="h-10 w-64" />
          <TableSkeleton />
        </>
      )}
      {isError && <ErrorMessage message={error.message} />}

      {subject && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{subject.name}</h1>
            {isAdmin && (
              <Link to={`/subjects/${subject.id}/edit`}>
                <Button variant="secondary">Редагувати</Button>
              </Link>
            )}
          </div>

          <h2 className="text-xl font-semibold">Останні заняття</h2>
          {!lessons ? (
            <TableSkeleton rows={3} />
          ) : lessons.data.length === 0 ? (
            <p>З цього предмета ще немає занять.</p>
          ) : (
            <List
              items={lessons.data}
              getKey={(l) => l.id}
              renderItem={(l) => (
                <Link
                  to={`/lessons/${l.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:underline"
                >
                  <span className="font-medium">{l.topic ?? `Заняття #${l.id}`}</span>
                  <span className="text-sm text-gray-500">
                    {l.group.name} ·{' '}
                    {new Date(l.date).toLocaleString('uk-UA', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </Link>
              )}
            />
          )}
        </>
      )}
    </section>
  );
}
