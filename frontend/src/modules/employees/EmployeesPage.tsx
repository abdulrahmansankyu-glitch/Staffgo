import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';
import { ImportButton } from '../../components/ImportButton';

const IMPORT_COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'designation', label: 'Designation' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'salary', label: 'Salary' },
];

export function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', designation: '', phone: '', salary: '' });

  function load() {
    api.get('/employees').then((res) => setEmployees(res.data.employees));
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/employees', { ...form, salary: form.salary ? Number(form.salary) : undefined });
    setForm({ name: '', designation: '', phone: '', salary: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Employees</h1>
        {user?.role === 'ADMIN' && (
          <div className="flex items-center gap-2">
            <ImportButton entityLabel="Employees" columns={IMPORT_COLUMNS} onImport={(rows) => api.post('/employees/import', { rows }).then((r) => r.data)} onDone={load} />
            <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Employee'}</Button>
          </div>
        )}
      </div>

      {showForm && (
        <Card title="New Employee" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Salary"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={employees}
        keyField={(e) => e.id}
        columns={[
          { header: 'Name', render: (e) => <span className="font-medium text-slate-800">{e.name}</span> },
          { header: 'Designation', render: (e) => e.designation ?? '-' },
          { header: 'Phone', render: (e) => e.phone ?? '-' },
          { header: 'Join Date', render: (e) => fmtDate(e.joinDate) },
          { header: 'Salary', render: (e) => e.salary ? money(e.salary) : '-' },
        ]}
      />
    </div>
  );
}
