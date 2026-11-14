import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { groupsService } from '@/services/groups';
import { useDebounce } from '@/hooks/useDebounce';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorMessage from '@/components/common/ErrorMessage';
import Input from '@/components/common/Input';
import { CardGridSkeleton } from '@/components/common/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import Breadcrumbs from '@/components/common/Breadcrumbs';

export default function GroupsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name:asc');
  const [sortBy, order] = sort.split(':') as ['id' | 'name', 'asc' | 'desc'];
  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['groups', { page, search: debouncedSearch, sort }],
    queryFn: () =>
      groupsService.getAll({ page, limit: 9, search: debouncedSearch || undefined, sortBy, order }),
    placeholderData: keepPreviousData,
  });

  const deleteGroup = useMutation({
    mutationFn: groupsService.remove,
    onSuccess: () => {
      toast.success('Групу видалено');
      return queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(
        message === 'Related record does not exist'
          ? 'Не можна видалити групу, поки в ній є студенти або заняття'
          : (message ?? 'Не вдалося видалити групу'),
      );
    },
  });

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Головна', to: '/dashboard' }, { label: 'Групи' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Групи</h1>
        {isAdmin && (
          <Link to="/groups/create">
            <Button>Додати групу</Button>
          </Link>
        )}
      </div>

      <Input
        aria-label="Пошук груп"
        placeholder="Пошук групи..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <select
        aria-label="Сортування"
        value={sort}
        onChange={(e) => {
          setSort(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      >
        <option value="name:asc">Назва: А → Я</option>
        <option value="name:desc">Назва: Я → А</option>
        <option value="id:desc">Спочатку нові</option>
        <option value="id:asc">Спочатку старі</option>
      </select>

      {isPending && <CardGridSkeleton />}
      {isError && <ErrorMessage message={error.message} />}

      {data && (
        <>
          {data.data.length === 0 ? (
            <p>Груп не знайдено.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((group) => (
                <Card key={group.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      <Link to={`/groups/${group.id}`} className="hover:underline">
                        {group.name}
                      </Link>
                    </h2>
                    <Badge variant="info">{group._count.students} студ.</Badge>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
                      <Link to={`/groups/${group.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          Редагувати
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deleteGroup.isPending}
                        onClick={() => {
                          if (group._count.students > 0) {
                            toast.error(`У групі ${group.name} є студенти (${group._count.students}), видалити її не можна`);
                            return;
                          }
                          if (confirm(`Видалити групу ${group.name}?`)) deleteGroup.mutate(group.id);
                        }}
                      >
                        Видалити
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <span>
              {data.pagination.page} / {Math.max(data.pagination.totalPages, 1)}
            </span>
            <Button
              variant="secondary"
              disabled={!data.pagination.hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Далі
            </Button>
          </div>
        </>
      )}
    </section>
  );
}