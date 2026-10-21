export interface StatItem {
  label: string;
  value: string | number;
}

interface StatsBarProps {
  stats: StatItem[];
  className?: string;
}

export function StatsBar({ stats, className = '' }: StatsBarProps) {
  if (stats.length === 0) return null;
  return (
    <dl
      className={`grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4 ${className}`}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <dd className="text-3xl font-extrabold text-slate-900">{stat.value}</dd>
          <dt className="mt-1 text-sm text-slate-500">{stat.label}</dt>
        </div>
      ))}
    </dl>
  );
}
