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
  { key: 'trn', label: 'TRN' },
  { key: 'paymentterms', label: 'Payment Terms' },
];

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', trn: '', paymentTerms: '' });
  const navigate = useNavigate();

  function load() {
    api.get('/suppliers').then((res) => setSuppliers(res.data.suppliers));
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/suppliers', form);
    setForm({ name: '', phone: '', trn: '', paymentTerms: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Suppliers</h1>
        <div className="flex items-center gap-2">
          <ImportButton entityLabel="Suppliers" columns={IMPORT_COLUMNS} onImport={(rows) => api.post('/suppliers/import', { rows }).then((r) => r.data)} onDone={load} />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Supplier'}</Button>
        </div>
      </div>

      {showForm && (
        <Card title="New Supplier" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="TRN"><Input value={form.trn} onChange={(e) => setForm({ ...form, trn: e.target.value })} /></Field>
            <Field label="Payment Terms"><Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="e.g. Net 15" /></Field>
            <div className="flex items-end"><Button type="submit">Save Supplier</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={suppliers}
        keyField={(s) => s.id}
        onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
        columns={[
          { header: 'Name', render: (s) => <span className="font-medium text-slate-800">{s.name}</span> },
          { header: 'Phone', render: (s) => s.phone ?? '-' },
          { header: 'TRN', render: (s) => s.trn ?? '-' },
          { header: 'Payment Terms', render: (s) => s.paymentTerms ?? '-' },
        ]}
      />
    </div>
  );
}
