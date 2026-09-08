import { FormEvent, useEffect, useState } from 'react';
import { api, apiOrigin } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

interface Line { itemId: string; qty: string; unit: string }
const emptyLine = (): Line => ({ itemId: '', qty: '1', unit: 'bag' });

export function DeliveryNotesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function load() {
    api.get('/delivery-notes').then((res) => setRows(res.data.deliveryNotes));
  }
  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data.customers));
    api.get('/warehouses').then((res) => setWarehouses(res.data.warehouses));
    api.get('/items').then((res) => setItems(res.data.items));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/delivery-notes', {
      customerId, warehouseId,
      lines: lines.map((l) => ({ itemId: l.itemId, qty: Number(l.qty), unit: l.unit })),
    });
    setCustomerId(''); setWarehouseId(''); setLines([emptyLine()]); setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Delivery Notes</h1>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Delivery Note'}</Button>}
      </div>

      {showForm && (
        <Card title="New Delivery Note" className="mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Customer">
                <Select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Ship From Warehouse">
                <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <Select required value={line.itemId} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, itemId: e.target.value } : l))}>
                  <option value="">Select item...</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={line.qty} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, qty: e.target.value } : l))} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unit: e.target.value } : l))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>+ Add Line</Button>
              <Button type="submit">Save & Post Stock</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        rows={rows}
        keyField={(r) => r.id}
        columns={[
          { header: 'Number', render: (r) => (
            <a className="font-medium text-slate-800 hover:underline" href={`${apiOrigin}/api/v1/delivery-notes/${r.id}/pdf`} target="_blank" rel="noreferrer">{r.number}</a>
          ) },
          { header: 'Customer', render: (r) => r.customer?.name },
          { header: 'Warehouse', render: (r) => r.warehouse?.name },
          { header: 'Date', render: (r) => fmtDate(r.date) },
          { header: 'Status', render: (r) => <Badge status={r.status} /> },
        ]}
      />
    </div>
  );
}
