import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

interface Line { itemId: string; description: string; qty: string; unit: string; unitPrice: string; vatRate: string }
const emptyLine = (): Line => ({ itemId: '', description: '', qty: '1', unit: 'EA', unitPrice: '0', vatRate: '15' });

export function InvoicesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const navigate = useNavigate();

  function load() {
    api.get('/invoices').then((res) => setRows(res.data.invoices));
  }
  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data.customers));
    api.get('/items').then((res) => setItems(res.data.items));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/invoices', {
      customerId,
      lines: lines.map((l) => ({ itemId: l.itemId || undefined, description: l.description || undefined, qty: Number(l.qty), unit: l.unit, unitPrice: Number(l.unitPrice), vatRate: Number(l.vatRate) })),
    });
    setCustomerId(''); setLines([emptyLine()]); setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Invoices</h1>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Invoice'}</Button>}
      </div>

      {showForm && (
        <Card title="New Invoice" className="mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Customer">
              <Select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                <div className="sm:col-span-2"><Input placeholder="Description" value={line.description} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, description: e.target.value } : l))} /></div>
                <Select value={line.itemId} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, itemId: e.target.value } : l))}>
                  <option value="">No stock item</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={line.qty} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, qty: e.target.value } : l))} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unit: e.target.value } : l))} />
                <Input type="number" placeholder="Unit Price" value={line.unitPrice} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unitPrice: e.target.value } : l))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>+ Add Line</Button>
              <Button type="submit">Save Invoice</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        rows={rows}
        keyField={(r) => r.id}
        onRowClick={(r) => navigate(`/invoices/${r.id}`)}
        columns={[
          { header: 'Number', render: (r) => <span className="font-medium text-slate-800">{r.number}</span> },
          { header: 'Customer', render: (r) => r.customer?.name },
          { header: 'Date', render: (r) => fmtDate(r.invoiceDate) },
          { header: 'Total', render: (r) => money(r.total) },
          { header: 'Balance Due', render: (r) => money(r.balanceDue) },
          { header: 'Status', render: (r) => <Badge status={r.status} /> },
        ]}
      />
    </div>
  );
}
