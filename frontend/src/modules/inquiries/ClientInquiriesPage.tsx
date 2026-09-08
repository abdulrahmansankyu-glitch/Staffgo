import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select, Textarea } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function ClientInquiriesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: '', subject: '', description: '' });

  function load() {
    api.get('/client-inquiries').then((res) => setInquiries(res.data.inquiries));
  }
  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data.customers));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/client-inquiries', form);
    setForm({ customerId: '', subject: '', description: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Client Inquiries</h1>
          <p className="text-sm text-slate-500">Every inquiry received from a customer, before a quotation is sent.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log Inquiry'}</Button>}
      </div>

      {showForm && (
        <Card title="New Client Inquiry" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Customer">
              <Select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subject"><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Cement supply for new project" /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div><Button type="submit">Save Inquiry</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={inquiries}
        keyField={(i) => i.id}
        columns={[
          { header: 'Number', render: (i) => i.number },
          { header: 'Customer', render: (i) => i.customer?.name },
          { header: 'Subject', render: (i) => i.subject },
          { header: 'Received', render: (i) => fmtDate(i.receivedDate) },
          { header: 'Status', render: (i) => <Badge status={i.status} /> },
          { header: 'Quotation', render: (i) => i.quotations?.[0] ? <Link className="text-blue-600 underline" to={`/quotations/${i.quotations[0].id}`}>{i.quotations[0].number}</Link> : '-' },
        ]}
      />
    </div>
  );
}
