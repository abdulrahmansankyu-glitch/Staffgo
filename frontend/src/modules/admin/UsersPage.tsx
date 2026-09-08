import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES' });

  function load() {
    api.get('/auth/users').then((res) => setUsers(res.data.users));
  }
  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/auth/users', form);
    setForm({ name: '', email: '', password: '', role: 'SALES' });
    setShowForm(false);
    load();
  }

  async function toggleActive(u: any) {
    await api.patch(`/auth/users/${u.id}`, { isActive: !u.isActive });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New User'}</Button>
      </div>

      {showForm && (
        <Card title="New User" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password"><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Admin</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="SALES">Sales / Office</option>
                <option value="SITE_STAFF">Site / Store Staff</option>
              </Select>
            </Field>
            <div className="flex items-end"><Button type="submit">Save User</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={users}
        keyField={(u) => u.id}
        columns={[
          { header: 'Name', render: (u) => <span className="font-medium text-slate-800">{u.name}</span> },
          { header: 'Email', render: (u) => u.email },
          { header: 'Role', render: (u) => u.role },
          { header: 'Created', render: (u) => fmtDate(u.createdAt) },
          { header: 'Status', render: (u) => <Badge status={u.isActive ? 'ACTIVE' : 'VOID'} /> },
          { header: 'Actions', render: (u) => <Button variant="secondary" onClick={() => toggleActive(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button> },
        ]}
      />
    </div>
  );
}
