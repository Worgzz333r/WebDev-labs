import { useEffect, useState } from 'react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import Loading from '@/components/common/Loading';
import { getErrorMessage } from '@/services/errors';
import { getGroups } from '@/services/groups';
import type { Group } from '@/types/api.types';
import { formatDate } from '@/utils/format';

interface Result {
  search: string;
  groups?: Group[];
  error?: string;
  fetchedAt: string;
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  // Завантаження триває, поки результат не відповідає поточному пошуку
  const isLoading = result?.search !== search;

  useEffect(() => {
    let ignore = false;
    getGroups(search || undefined)
      .then((res) => {
        if (!ignore) setResult({ search, groups: res.data, fetchedAt: new Date().toISOString() });
      })
      .catch((err: unknown) => {
        if (!ignore)
          setResult({ search, error: getErrorMessage(err), fetchedAt: new Date().toISOString() });
      });
    return () => {
      ignore = true;
    };
  }, [search]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(query.trim());
  };

  const handleReset = () => {
    setQuery('');
    setSearch('');
  };

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Групи</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Пошук групи..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit">Знайти</Button>
        <Button type="button" variant="secondary" onClick={handleReset}>
          Скинути
        </Button>
      </form>

      {isLoading && <Loading label="Завантаження груп..." />}

      {!isLoading && result?.error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800">
          {result.error}
        </p>
      )}

      {!isLoading && result?.groups && (
        <>
          {result.groups.length === 0 ? (
            <p>Груп не знайдено.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.groups.map((group) => (
                <Card key={group.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{group.name}</h2>
                    <Badge variant="info">{group._count.students} студ.</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">Оновлено: {formatDate(result.fetchedAt)}</p>
        </>
      )}
    </section>
  );
}
