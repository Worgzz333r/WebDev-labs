import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { groupsService } from '@/services/groups';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import Skeleton, { TableSkeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import List from '@/components/common/List';

export default function GroupDetailPage() {
  const { id } = useParams();
  const groupId = Number(id);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const {
    data: group,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => groupsService.getById(groupId),
  });

  return (
    <section className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Головна', to: '/dashboard' },
          { label: 'Групи', to: '/groups' },
          { label: group?.name ?? '...' },
        ]}
      />

      {isPending && (
        <>
          <Skeleton className="h-10 w-64" />
          <TableSkeleton />
        </>
      )}
      {isError && <ErrorMessage message={error.message} />}

      {group && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            {isAdmin && (
              <Link to={`/groups/${group.id}/edit`}>
                <Button variant="secondary">Редагувати</Button>
              </Link>
            )}
          </div>

          <h2 className="text-xl font-semibold">Студенти ({group.students.length})</h2>
          {group.students.length === 0 ? (
            <p>У групі ще немає студентів.</p>
          ) : (
            <List
              items={group.students}
              getKey={(s) => s.id}
              renderItem={(s) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{s.fullName}</span>
                  <span className="text-sm text-gray-500">{s.email}</span>
                </div>
              )}
            />
          )}
        </>
      )}
    </section>
  );
}