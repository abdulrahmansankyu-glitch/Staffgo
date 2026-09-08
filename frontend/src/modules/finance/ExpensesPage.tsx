import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Button, Card, Field, Input, Select } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '', paidFrom: 'BANK', description: '', projectId: '' });

  function load() {
    api.get('/finance/expenses').then((res) => setExpenses(res.data.expenses));
  }
  useEffect(() => {
    load();
    api.get('/projects').then((res) => setProjects(res.data.projects));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/finance/expenses', { ...form, amount: Number(form.amount), projectId: form.projectId || undefined });
    setForm({ category: '', amount: '', paidFrom: 'BANK', description: '', projectId: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Expenses</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Expense'}</Button>
      </div>

      {showForm && (
        <Card title="New Expense" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Category"><Input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Fuel, Rent" /></Field>
            <Field label="Amount"><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Paid From">
              <Select value={form.paidFrom} onChange={(e) => setForm({ ...form, paidFrom: e.target.value })}>
                <option value="BANK">Bank</option><option value="CASH">Cash</option>
              </Select>
            </Field>
            <Field label="Project">
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">General (no project)</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save Expense</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={expenses}
        keyField={(e) => e.id}
        columns={[
          { header: 'Date', render: (e) => fmtDate(e.date) },
          { header: 'Category', render: (e) => e.category },
          { header: 'Project', render: (e) => e.project?.name ?? '-' },
          { header: 'Paid From', render: (e) => e.paidFrom },
          { header: 'Description', render: (e) => e.description ?? '-' },
          { header: 'Amount', render: (e) => money(e.amount) },
        ]}
      />
    </div>
  );
}
