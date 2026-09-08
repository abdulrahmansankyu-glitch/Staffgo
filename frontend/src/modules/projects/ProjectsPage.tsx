import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { money } from '../../lib/format';

export function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', customerId: '', contractValue: '' });
  const navigate = useNavigate();

  function load() {
    api.get('/projects').then((res) => setProjects(res.data.projects));
  }
  useEffect(() => {
    load();
    api.get('/customers').then((res) => setCustomers(res.data.customers));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/projects', { ...form, contractValue: form.contractValue ? Number(form.contractValue) : undefined, customerId: form.customerId || undefined });
    setForm({ code: '', name: '', customerId: '', contractValue: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Projects</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Project'}</Button>
      </div>

      {showForm && (
        <Card title="New Project" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Code"><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PRJ-002" /></Field>
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Customer">
              <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">None</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Contract Value"><Input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={projects}
        keyField={(p) => p.id}
        onRowClick={(p) => navigate(`/projects/${p.id}`)}
        columns={[
          { header: 'Code', render: (p) => p.code },
          { header: 'Name', render: (p) => <span className="font-medium text-slate-800">{p.name}</span> },
          { header: 'Customer', render: (p) => p.customer?.name ?? '-' },
          { header: 'Contract Value', render: (p) => p.contractValue ? money(p.contractValue) : '-' },
          { header: 'Status', render: (p) => <Badge status={p.status} /> },
        ]}
      />
    </div>
  );
}
