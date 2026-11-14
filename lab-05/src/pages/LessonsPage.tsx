import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import Input from '@/components/common/Input';
import { TableSkeleton } from '@/components/common/Skeleton';
import Table, { type Column } from '@/components/common/Table';
import { useDebounce } from '@/hooks/useDebounce';
import { useGroupOptions, useSubjectOptions } from '@/hooks/useLookups';
import { lessonsService } from '@/services/lessons';
import { useAuthStore } from '@/stores/authStore';
import type { Lesson } from '@/types/api.types';

const selectClass =
  'rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900';

export default function LessonsPage() {
  const canEdit = useAuthStore((s) => s.user?.role === 'ADMIN' || s.user?.role === 'TEACHER');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sort, setSort] = useState('date:desc');
  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const { data: groups } = useGroupOptions();
  const { data: subjects } = useSubjectOptions();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['lessons', { page, search: debouncedSearch, groupId, subjectId, sort }],
    queryFn: () => {
      const [sortBy, order] = sort.split(':') as ['id' | 'date' | 'topic', 'asc' | 'desc'];
      return lessonsService.getAll({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        groupId: groupId ? Number(groupId) : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        sortBy,
        order,
      });
    },
    placeholderData: keepPreviousData,
  });

  const deleteLesson = useMutation({
    mutationFn: lessonsService.remove,
    onSuccess: () => {
      toast.success('Заняття видалено');
      return queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(message ?? 'Не вдалося видалити заняття');
    },
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<Lesson>[] = [
    {
      header: 'Дата',
      render: (l) => new Date(l.date).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    { header: 'Тема', render: (l) => l.topic ?? '—' },
    { header: 'Предмет', render: (l) => l.subject.name },
    { header: 'Група', render: (l) => l.group.name },
    { header: 'Викладач', render: (l) => l.teacher.fullName },
    ...(canEdit
      ? [
          {
            header: 'Дії',
            render: (l: Lesson) => (
              <div className="flex gap-2">
                <Link to={`/lessons/${l.id}/edit`}>
                  <Button size="sm" variant="secondary">
                    Редагувати
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={deleteLesson.isPending}
                  onClick={() => {
                    if (confirm('Видалити це заняття?')) deleteLesson.mutate(l.id);
                  }}
                >
                  Видалити
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Головна', to: '/dashboard' }, { label: 'Заняття' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Заняття</h1>
        {canEdit && (
          <Link to="/lessons/create">
            <Button>Додати заняття</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <Input
            aria-label="Пошук занять"
            placeholder="Пошук за темою..."
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
          />
        </div>
        <select
          aria-label="Група"
          className={selectClass}
          value={groupId}
          onChange={(e) => resetPage(setGroupId)(e.target.value)}
        >
          <option value="">Усі групи</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Предмет"
          className={selectClass}
          value={subjectId}
          onChange={(e) => resetPage(setSubjectId)(e.target.value)}
        >
          <option value="">Усі предмети</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Сортування"
          className={selectClass}
          value={sort}
          onChange={(e) => resetPage(setSort)(e.target.value)}
        >
          <option value="date:desc">Дата: нові спочатку</option>
          <option value="date:asc">Дата: старі спочатку</option>
          <option value="topic:asc">Тема: А → Я</option>
          <option value="topic:desc">Тема: Я → А</option>
        </select>
      </div>

      {isPending && <TableSkeleton />}
      {isError && <ErrorMessage message={error.message} />}

      {data && (
        <>
          {data.data.length === 0 ? (
            <p>Занять не знайдено.</p>
          ) : (
            <Table columns={columns} rows={data.data} getKey={(l) => l.id} />
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