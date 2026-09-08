import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input } from '../../components/ui';
import { ImportButton } from '../../components/ImportButton';

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'trn', label: 'TRN' },
  { key: 'creditterms', label: 'Credit Terms' },
];

interface Customer {
  id: string;
  name: string;
  phone?: string;
  city?: string;
  trn?: string;
  creditTerms?: string;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', city: '', trn: '', creditTerms: '' });
  const navigate = useNavigate();

  function load() {
    api.get('/customers').then((res) => setCustomers(res.data.customers));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/customers', form);
    setForm({ name: '', phone: '', city: '', trn: '', creditTerms: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Customers</h1>
        <div className="flex items-center gap-2">
          <ImportButton entityLabel="Customers" columns={IMPORT_COLUMNS} onImport={(rows) => api.post('/customers/import', { rows }).then((r) => r.data)} onDone={load} />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Customer'}</Button>
        </div>
      </div>

      {showForm && (
        <Card title="New Customer" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="TRN (Tax Registration No.)"><Input value={form.trn} onChange={(e) => setForm({ ...form, trn: e.target.value })} /></Field>
            <Field label="Credit Terms"><Input value={form.creditTerms} onChange={(e) => setForm({ ...form, creditTerms: e.target.value })} placeholder="e.g. Net 30" /></Field>
            <div className="flex items-end"><Button type="submit">Save Customer</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={customers}
        keyField={(c) => c.id}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        columns={[
          { header: 'Name', render: (c) => <span className="font-medium text-slate-800">{c.name}</span> },
          { header: 'Phone', render: (c) => c.phone ?? '-' },
          { header: 'City', render: (c) => c.city ?? '-' },
          { header: 'TRN', render: (c) => c.trn ?? '-' },
          { header: 'Credit Terms', render: (c) => c.creditTerms ?? '-' },
        ]}
      />
    </div>
  );
}
