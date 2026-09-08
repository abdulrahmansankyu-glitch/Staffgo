import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input, Select } from '../../components/ui';
import { ImportButton } from '../../components/ImportButton';

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'type', label: 'Type (WAREHOUSE or SITE)' },
  { key: 'address', label: 'Address' },
];

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'WAREHOUSE', address: '' });

  function load() {
    api.get('/warehouses').then((res) => setWarehouses(res.data.warehouses));
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/warehouses', form);
    setForm({ name: '', type: 'WAREHOUSE', address: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Warehouses & Sites</h1>
        <div className="flex items-center gap-2">
          <ImportButton entityLabel="Warehouses" columns={IMPORT_COLUMNS} onImport={(rows) => api.post('/warehouses/import', { rows }).then((r) => r.data)} onDone={load} />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New'}</Button>
        </div>
      </div>

      {showForm && (
        <Card title="New Warehouse / Site" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="SITE">Project Site</option>
              </Select>
            </Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={warehouses}
        keyField={(w) => w.id}
        columns={[
          { header: 'Name', render: (w) => <span className="font-medium text-slate-800">{w.name}</span> },
          { header: 'Type', render: (w) => w.type },
          { header: 'Address', render: (w) => w.address ?? '-' },
        ]}
      />
    </div>
  );
}
