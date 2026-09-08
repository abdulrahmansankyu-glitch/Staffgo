import { Link } from 'react-router-dom';
import { statusColor, titleCase } from '../lib/statusColors';

interface Breakdown {
  status: string;
  count: number;
}

interface CategoryCardProps {
  label: string;
  description: string;
  total: number;
  breakdown: Breakdown[];
  to?: string;
}

export function CategoryCard({ label, description, total, breakdown, to }: CategoryCardProps) {
  const sorted = [...breakdown].sort((a, b) => b.count - a.count);

  const content = (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="mb-1 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <span className="text-2xl font-bold text-slate-800">{total}</span>
      </div>
      <p className="mb-4 text-xs text-slate-500">{description}</p>

      {total > 0 ? (
        <>
          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
            {sorted.map((b) => (
              <div
                key={b.status}
                style={{ width: `${(b.count / total) * 100}%`, backgroundColor: statusColor(b.status) }}
                title={`${titleCase(b.status)}: ${b.count}`}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5">
            {sorted.map((b) => (
              <div key={b.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(b.status) }} />
                {titleCase(b.status)} <span className="font-semibold text-slate-800">{b.count}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-auto text-xs text-slate-400">No records yet.</div>
      )}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}
