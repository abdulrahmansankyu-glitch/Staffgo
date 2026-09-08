import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input, Select } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'EMPLOYMENT', employeeId: '', fileUrl: '' });

  function load() {
    api.get('/contracts').then((res) => setContracts(res.data.contracts));
  }
  useEffect(() => {
    load();
    api.get('/employees').then((res) => setEmployees(res.data.employees));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/contracts', { ...form, employeeId: form.employeeId || undefined });
    setForm({ type: 'EMPLOYMENT', employeeId: '', fileUrl: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Contracts</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Contract'}</Button>
      </div>

      {showForm && (
        <Card title="New Contract" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="EMPLOYMENT">Employment</option>
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
              </Select>
            </Field>
            {form.type === 'EMPLOYMENT' && (
              <Field label="Employee">
                <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                  <option value="">Select employee...</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Document Link (optional)"><Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={contracts}
        keyField={(c) => c.id}
        columns={[
          { header: 'Type', render: (c) => c.type },
          { header: 'Employee', render: (c) => c.employee?.name ?? '-' },
          { header: 'Created', render: (c) => fmtDate(c.createdAt) },
          { header: 'Document', render: (c) => c.fileUrl ? <a className="text-blue-600 underline" href={c.fileUrl} target="_blank" rel="noreferrer">View</a> : '-' },
        ]}
      />
    </div>
  );
}
