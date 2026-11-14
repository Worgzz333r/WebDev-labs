import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { groupsService } from '@/services/groups';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import Skeleton, { TableSkeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';

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
            <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-900">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {['ID', "Ім'я", 'Email'].map((t) => (
                      <th
                        key={t}
                        className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500"
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {group.students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-6 py-4">{s.id}</td>
                      <td className="px-6 py-4">{s.fullName}</td>
                      <td className="px-6 py-4">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}