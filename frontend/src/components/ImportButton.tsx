import { useRef, useState } from 'react';
import { parseCsvToObjects, buildCsvTemplate } from '../lib/csv';
import { Button, Card } from './ui';

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportButtonProps {
  entityLabel: string;
  columns: ImportColumn[];
  onImport: (rows: Record<string, string>[]) => Promise<{ created: number; skipped: number; errors: string[] }>;
  onDone?: () => void;
}

export function ImportButton({ entityLabel, columns, onImport, onDone }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsvToObjects(String(reader.result));
      setRows(parsed);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function downloadTemplate() {
    const csv = buildCsvTemplate(columns.map((c) => c.key));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityLabel.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmImport() {
    if (!rows) return;
    setImporting(true);
    try {
      const res = await onImport(rows);
      setResult(res);
      setRows(null);
      onDone?.();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" id={`import-${entityLabel}`} />
      <label htmlFor={`import-${entityLabel}`}>
        <span className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Import CSV
        </span>
      </label>

      {rows && (
        <Card title={`Import ${rows.length} row(s) from ${fileName}`} className="mt-3">
          <div className="mb-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-400">{columns.map((c) => <th key={c.key} className="pb-1 pr-4">{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">{columns.map((c) => <td key={c.key} className="py-1 pr-4">{r[c.key.toLowerCase()] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && <p className="mt-1 text-xs text-slate-400">...and {rows.length - 5} more row(s)</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={confirmImport} disabled={importing}>{importing ? 'Importing...' : `Import ${rows.length} Row(s)`}</Button>
            <Button variant="secondary" onClick={() => setRows(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {result && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
          <p>Imported <strong>{result.created}</strong> record(s){result.skipped > 0 && <> · skipped <strong>{result.skipped}</strong></>}.</p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-red-600">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={downloadTemplate} className="mt-2 block text-xs text-blue-600 underline">
        Download {entityLabel} CSV template
      </button>
    </div>
  );
}
