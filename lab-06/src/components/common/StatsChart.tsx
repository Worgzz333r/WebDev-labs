import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartDatum {
  name: string;
  value: number;
}

interface StatsChartProps {
  data: ChartDatum[];
  seriesName: string;
  title: string;
  unit?: string;
  max?: number;
}

// Стовпчикова діаграма на Recharts. Бібліотека важка — підключайте її через
// lazy-імпорт (див. StatsSection), щоб не потрапляла в початковий бандл.
export default function StatsChart({ data, seriesName, title, unit = '', max }: StatsChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af55" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} textAnchor="end" />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={max ? [0, max] : undefined}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip formatter={(v) => `${v}${unit}`} />
          <Legend />
          <Bar dataKey="value" name={seriesName} fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
