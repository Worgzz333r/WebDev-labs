import { useState } from 'react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import Loading from '@/components/common/Loading';
import type { User } from '@/types/api.types';
import { formatDate, formatPrice } from '@/utils/format';

const DEMO_USERS: User[] = [
  {
    id: 1,
    name: 'Олена Коваль',
    email: 'olena@example.com',
    role: 'ADMIN',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 2,
    name: 'Іван Петренко',
    email: 'ivan@example.com',
    role: 'USER',
    createdAt: '2026-10-12T14:30:00Z',
  },
  {
    id: 3,
    name: 'Марія Шевчук',
    email: 'maria@example.com',
    role: 'MODERATOR',
    createdAt: '2026-10-25T09:15:00Z',
  },
];

const roleVariant = { USER: 'info', ADMIN: 'danger', MODERATOR: 'warning' } as const;

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReload = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const filtered = DEMO_USERS.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Головна</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Пошук за іменем..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleReload} isLoading={isLoading} className="sm:w-48">
          Оновити
        </Button>
        <Button variant="secondary" onClick={() => setQuery('')}>
          Скинути
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((user) => (
            <Card key={user.id}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{user.name}</h2>
                <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              <p className="mt-2 text-sm">Зареєстрований: {formatDate(user.createdAt)}</p>
            </Card>
          ))}
          <Card>
            <p className="text-sm text-gray-600 dark:text-gray-400">Приклад formatPrice</p>
            <p className="text-2xl font-bold">{formatPrice(1499.5)}</p>
          </Card>
        </div>
      )}

      {!isLoading && filtered.length === 0 && <p>Нікого не знайдено.</p>}
    </section>
  );
}
