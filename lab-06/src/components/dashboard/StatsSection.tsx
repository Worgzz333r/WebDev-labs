import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatsChart from '@/components/common/StatsChart';
import Skeleton from '@/components/common/Skeleton';
import { useGroupOptions } from '@/hooks/useLookups';
import { groupsService } from '@/services/groups';
import { reportsService } from '@/services/reports';

// Секція статистики Dashboard (завдання 9). Імпортується через React.lazy —
// Recharts потрапляє в окремий chunk і не збільшує початкове завантаження.
export default function StatsSection() {
  const { data: groups } = useGroupOptions();
  const [groupId, setGroupId] = useState('');

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ['reports', 'attendance-summary', groupId],
    queryFn: () => reportsService.attendanceSummary(Number(groupId)),
    enabled: groupId !== '',
  });

  const { data: groupsPage, isPending: groupsPending } = useQuery({
    queryKey: ['groups', 'stats'],
    queryFn: () => groupsService.getAll({ limit: 100, sortBy: 'id', order: 'asc' }),
  });

  if (groupsPending) return <Skeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="stats-group" className="text-sm text-gray-500">
          Група для звіту відвідуваності:
        </label>
        <select
          id="stats-group"
          className="rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="">Оберіть групу</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <StatsChart
        title="Студентів у групах"
        seriesName="Студентів"
        unit=""
        data={(groupsPage?.data ?? []).map((g) => ({ name: g.name, value: g._count.students }))}
      />

      {groupId === '' ? (
        <p className="text-gray-500">Оберіть групу, щоб побудувати звіт відвідуваності.</p>
      ) : summaryPending ? (
        <Skeleton className="h-80" />
      ) : (
        <StatsChart
          title="Відвідуваність, % (за всіма заняттями групи)"
          seriesName="Відвідуваність"
          unit="%"
          max={100}
          data={(summary ?? []).map((r) => ({ name: r.fullName, value: r.attendancePercent }))}
        />
      )}
    </div>
  );
}
