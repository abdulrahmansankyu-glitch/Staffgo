import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input } from '../../components/ui';
import { ImportButton } from '../../components/ImportButton';

const IMPORT_COLUMNS = [
  { key: 'sku', label: 'SKU', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'category', label: 'Category' },
  { key: 'baseunit', label: 'Base Unit', required: true },
];

export function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', category: '', baseUnit: '' });

  function load() {
    api.get('/items').then((res) => setItems(res.data.items));
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/items', form);
    setForm({ sku: '', name: '', category: '', baseUnit: '' });
    setShowForm(false);
    load();
  }

  async function handleDelete(item: any) {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/items/${item.id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Could not delete this item.');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Items</h1>
        <div className="flex items-center gap-2">
          <ImportButton entityLabel="Items" columns={IMPORT_COLUMNS} onImport={(rows) => api.post('/items/import', { rows }).then((r) => r.data)} onDone={load} />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Item'}</Button>
        </div>
      </div>

      {showForm && (
        <Card title="New Item" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="SKU"><Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label="Base Unit"><Input required placeholder="e.g. bag, ton, piece" value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save Item</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={items}
        keyField={(i) => i.id}
        columns={[
          { header: 'SKU', render: (i) => i.sku },
          { header: 'Name', render: (i) => <span className="font-medium text-slate-800">{i.name}</span> },
          { header: 'Category', render: (i) => i.category ?? '-' },
          { header: 'Base Unit', render: (i) => i.baseUnit },
          { header: 'Other Units', render: (i) => i.units?.map((u: any) => `${u.unitName} (${u.conversionFactorToBase}x)`).join(', ') || '-' },
          { header: '', render: (i) => <Button variant="danger" onClick={() => handleDelete(i)}>Delete</Button> },
        ]}
      />
    </div>
  );
}
