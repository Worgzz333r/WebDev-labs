import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import Input from '@/components/common/Input';
import { TableSkeleton } from '@/components/common/Skeleton';
import Table, { type Column } from '@/components/common/Table';
import { useDebounce } from '@/hooks/useDebounce';
import { useGroupOptions } from '@/hooks/useLookups';
import { ROLES, roleLabels } from '@/schemas/user.schema';
import { usersService } from '@/services/users';
import { useAuthStore } from '@/stores/authStore';
import type { Role, UserRecord } from '@/types/api.types';

const selectClass =
  'rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900';

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [groupId, setGroupId] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const { data: groups } = useGroupOptions();
  const groupNames = new Map(groups?.map((g) => [g.id, g.name]));

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['users', { page, search: debouncedSearch, role, groupId, sort }],
    queryFn: () => {
      const [sortBy, order] = sort.split(':') as ['id' | 'fullName' | 'email' | 'createdAt', 'asc' | 'desc'];
      return usersService.getAll({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        role: (role as Role) || undefined,
        groupId: groupId ? Number(groupId) : undefined,
        sortBy,
        order,
      });
    },
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });

  const deleteUser = useMutation({
    mutationFn: usersService.remove,
    onSuccess: () => {
      toast.success('Користувача видалено');
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      toast.error(
        message === 'Related record does not exist'
          ? 'Не можна видалити користувача, поки є пов’язані заняття або відвідуваність'
          : (message ?? 'Не вдалося видалити користувача'),
      );
    },
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const columns: Column<UserRecord>[] = [
    { header: 'ID', render: (u) => u.id },
    { header: 'Ім’я', render: (u) => u.fullName },
    { header: 'Email', render: (u) => u.email },
    { header: 'Роль', render: (u) => <Badge variant="info">{roleLabels[u.role]}</Badge> },
    { header: 'Група', render: (u) => (u.groupId ? (groupNames.get(u.groupId) ?? `#${u.groupId}`) : '—') },
    { header: 'Створено', render: (u) => new Date(u.createdAt).toLocaleDateString('uk-UA') },
    {
      header: 'Дії',
      render: (u) => (
        <div className="flex gap-2">
          <Link to={`/users/${u.id}/edit`}>
            <Button size="sm" variant="secondary">
              Редагувати
            </Button>
          </Link>
          {u.id !== currentUser?.id && (
            <Button
              size="sm"
              variant="danger"
              disabled={deleteUser.isPending}
              onClick={() => {
                if (confirm(`Видалити користувача ${u.fullName}?`)) deleteUser.mutate(u.id);
              }}
            >
              Видалити
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Головна', to: '/dashboard' }, { label: 'Користувачі' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Користувачі</h1>
        <Link to="/users/create">
          <Button>Додати користувача</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <Input
            aria-label="Пошук користувачів"
            placeholder="Пошук за іменем або email..."
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
          />
        </div>
        <select aria-label="Роль" className={selectClass} value={role} onChange={(e) => resetPage(setRole)(e.target.value)}>
          <option value="">Усі ролі</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
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
        <select aria-label="Сортування" className={selectClass} value={sort} onChange={(e) => resetPage(setSort)(e.target.value)}>
          <option value="createdAt:desc">Нові спочатку</option>
          <option value="createdAt:asc">Старі спочатку</option>
          <option value="fullName:asc">Ім’я: А → Я</option>
          <option value="fullName:desc">Ім’я: Я → А</option>
          <option value="email:asc">Email: А → Я</option>
        </select>
      </div>

      {isPending && <TableSkeleton />}
      {isError && <ErrorMessage message={error.message} />}

      {data && (
        <>
          {data.data.length === 0 ? (
            <p>Користувачів не знайдено.</p>
          ) : (
            <Table columns={columns} rows={data.data} getKey={(u) => u.id} />
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