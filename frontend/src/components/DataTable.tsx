import { ReactNode } from 'react';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}

export function DataTable<T>({ columns, rows, keyField, onRowClick, emptyLabel }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((col) => (
              <th key={col.header} className={`px-4 py-3 font-semibold ${col.className ?? ''}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">{emptyLabel ?? 'No records yet'}</td></tr>
          )}
          {rows.map((row) => (
            <tr
              key={keyField(row)}
              onClick={() => onRowClick?.(row)}
              className={`border-t border-slate-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.header} className={`px-4 py-3 ${col.className ?? ''}`}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
