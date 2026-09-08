import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '../../components/ui';
import { fmtDate, money } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function SupplierInquiriesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', subject: '', description: '' });

  function load() {
    api.get('/supplier-inquiries').then((res) => setInquiries(res.data.inquiries));
  }
  useEffect(() => {
    load();
    api.get('/suppliers').then((res) => setSuppliers(res.data.suppliers));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/supplier-inquiries', form);
    setForm({ supplierId: '', subject: '', description: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Supplier Inquiries (RFQs Sent)</h1>
          <p className="text-sm text-slate-500">Requests for quotation we've sent out to suppliers.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log RFQ'}</Button>}
      </div>

      {showForm && (
        <Card title="New Supplier Inquiry" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Supplier">
              <Select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Subject"><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Rebar 10mm - 20 tons" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div><Button type="submit">Save RFQ</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={inquiries}
        keyField={(i) => i.id}
        columns={[
          { header: 'Number', render: (i) => i.number },
          { header: 'Supplier', render: (i) => i.supplier?.name },
          { header: 'Subject', render: (i) => i.subject },
          { header: 'Sent', render: (i) => fmtDate(i.sentDate) },
          { header: 'Status', render: (i) => <Badge status={i.status} /> },
          { header: 'Quotes Received', render: (i) => i.quotationsReceived?.length ? i.quotationsReceived.map((q: any) => `${q.referenceNumber ?? 'Quote'} (${money(q.amount)})`).join(', ') : '-' },
        ]}
      />
    </div>
  );
}
