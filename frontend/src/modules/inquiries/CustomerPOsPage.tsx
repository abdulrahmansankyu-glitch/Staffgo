import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { fmtDate, money } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function CustomerPOsPage() {
  const { user } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ poNumber: '', customerId: '', quotationId: '', amount: '' });

  function load() {
    api.get('/customer-pos').then((res) => setPos(res.data.purchaseOrders));
  }
  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data.customers));
    api.get('/quotations').then((res) => setQuotations(res.data.quotations));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/customer-pos', {
      poNumber: form.poNumber,
      customerId: form.customerId,
      quotationId: form.quotationId || undefined,
      amount: Number(form.amount),
    });
    setForm({ poNumber: '', customerId: '', quotationId: '', amount: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Customer POs Received</h1>
          <p className="text-sm text-slate-500">Purchase orders clients have sent us confirming an order.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log Customer PO'}</Button>}
      </div>

      {showForm && (
        <Card title="New Customer PO" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Client's PO Number"><Input required value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} /></Field>
            <Field label="Customer">
              <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Related Quotation (optional)">
              <Select value={form.quotationId} onChange={(e) => setForm({ ...form, quotationId: e.target.value })}>
                <option value="">None</option>
                {quotations.map((q) => <option key={q.id} value={q.id}>{q.number} - {q.customer?.name}</option>)}
              </Select>
            </Field>
            <Field label="Amount"><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <div><Button type="submit">Save PO</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={pos}
        keyField={(p) => p.id}
        columns={[
          { header: 'PO Number', render: (p) => p.poNumber },
          { header: 'Customer', render: (p) => p.customer?.name },
          { header: 'Related Quotation', render: (p) => p.quotation?.number ?? '-' },
          { header: 'Received', render: (p) => fmtDate(p.receivedDate) },
          { header: 'Amount', render: (p) => money(p.amount) },
          { header: 'Status', render: (p) => <Badge status={p.status} /> },
        ]}
      />
    </div>
  );
}
