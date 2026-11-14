import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ErrorMessage from '@/components/common/ErrorMessage';
import Input from '@/components/common/Input';
import { CardGridSkeleton } from '@/components/common/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { subjectsService } from '@/services/subjects';
import { useAuthStore } from '@/stores/authStore';

export default function SubjectsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name:asc');
  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['subjects', { page, search: debouncedSearch, sort }],
    queryFn: () => {
      const [sortBy, order] = sort.split(':') as ['id' | 'name', 'asc' | 'desc'];
      return subjectsService.getAll({ page, limit: 9, search: debouncedSearch || undefined, sortBy, order });
    },
    placeholderData: keepPreviousData,
  });

  const deleteSubject = useMutation({
    mutationFn: subjectsService.remove,
    onSuccess: () => {
      toast.success('Предмет видалено');
      return queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(
        message === 'Related record does not exist'
          ? 'Не можна видалити предмет, поки є пов’язані заняття'
          : (message ?? 'Не вдалося видалити предмет'),
      );
    },
  });

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Головна', to: '/dashboard' }, { label: 'Предмети' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Предмети</h1>
        {isAdmin && (
          <Link to="/subjects/create">
            <Button>Додати предмет</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <Input
            aria-label="Пошук предметів"
            placeholder="Пошук предмета..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          aria-label="Сортування"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="name:asc">Назва: А → Я</option>
          <option value="name:desc">Назва: Я → А</option>
          <option value="id:desc">Нові спочатку</option>
          <option value="id:asc">Старі спочатку</option>
        </select>
      </div>

      {isPending && <CardGridSkeleton />}
      {isError && <ErrorMessage message={error.message} />}

      {data && (
        <>
          {data.data.length === 0 ? (
            <p>Предметів не знайдено.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((subject) => (
                <Card key={subject.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{subject.name}</h2>
                    <Badge variant="info">#{subject.id}</Badge>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
                      <Link to={`/subjects/${subject.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          Редагувати
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deleteSubject.isPending}
                        onClick={() => {
                          if (confirm(`Видалити предмет ${subject.name}?`)) deleteSubject.mutate(subject.id);
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
            <Button variant="secondary" disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)}>
              Далі
            </Button>
          </div>
        </>
      )}
    </section>
  );
}