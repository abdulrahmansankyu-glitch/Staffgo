import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Button, Card, Field, Input, StatCard } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [costing, setCosting] = useState<any>(null);
  const [tab, setTab] = useState<'boq' | 'milestones' | 'labor' | 'equipment'>('boq');

  const [boqLine, setBoqLine] = useState({ description: '', unit: '', qty: '', rate: '' });
  const [milestone, setMilestone] = useState({ title: '', dueDate: '' });
  const [labor, setLabor] = useState({ quantity: '', rate: '' });

  function load() {
    api.get(`/projects/${id}`).then((res) => setProject(res.data.project));
    api.get(`/projects/${id}/costing`).then((res) => setCosting(res.data));
  }
  useEffect(load, [id]);

  async function addBoqLine(e: FormEvent) {
    e.preventDefault();
    await api.post(`/projects/${id}/boq`, { lines: [{ ...boqLine, qty: Number(boqLine.qty), rate: Number(boqLine.rate) }] });
    setBoqLine({ description: '', unit: '', qty: '', rate: '' });
    load();
  }

  async function addMilestone(e: FormEvent) {
    e.preventDefault();
    await api.post(`/projects/${id}/milestones`, milestone);
    setMilestone({ title: '', dueDate: '' });
    load();
  }

  async function addLabor(e: FormEvent) {
    e.preventDefault();
    await api.post(`/projects/${id}/labor`, { quantity: Number(labor.quantity), rate: Number(labor.rate) });
    setLabor({ quantity: '', rate: '' });
    load();
  }

  if (!project) return <div className="text-slate-400">Loading...</div>;

  const latestBoq = project.boqs?.[project.boqs.length - 1];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.code} · {project.customer?.name ?? 'No customer linked'}</p>
        </div>
        <Badge status={project.status} />
      </div>

      {costing && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Revenue" value={money(costing.revenue)} />
          <StatCard label="Total Cost" value={money(costing.costs.total)} sub={`Purchases ${money(costing.costs.purchases)} · Labor ${money(costing.costs.labor)} · Expenses ${money(costing.costs.expenses)} · Equipment ${money(costing.costs.equipment)}`} />
          <StatCard label="Margin" value={money(costing.margin)} sub={`${costing.marginPercent.toFixed(1)}%`} />
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {(['boq', 'milestones', 'labor', 'equipment'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500'}`}>{t === 'boq' ? 'BOQ' : t}</button>
        ))}
      </div>

      {tab === 'boq' && (
        <Card title="Bill of Quantities">
          <table className="mb-4 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Unit</th><th className="pb-2">Qty</th><th className="pb-2">Rate</th><th className="pb-2 text-right">Amount</th></tr></thead>
            <tbody>
              {latestBoq?.lines.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100"><td className="py-2">{l.description}</td><td className="py-2">{l.unit}</td><td className="py-2">{l.qty}</td><td className="py-2">{money(l.rate)}</td><td className="py-2 text-right">{money(l.amount)}</td></tr>
              )) ?? <tr><td colSpan={5} className="py-4 text-center text-slate-400">No BOQ lines yet.</td></tr>}
            </tbody>
          </table>
          <form onSubmit={addBoqLine} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            <Input placeholder="Description" required value={boqLine.description} onChange={(e) => setBoqLine({ ...boqLine, description: e.target.value })} />
            <Input placeholder="Unit" required value={boqLine.unit} onChange={(e) => setBoqLine({ ...boqLine, unit: e.target.value })} />
            <Input type="number" placeholder="Qty" required value={boqLine.qty} onChange={(e) => setBoqLine({ ...boqLine, qty: e.target.value })} />
            <Input type="number" placeholder="Rate" required value={boqLine.rate} onChange={(e) => setBoqLine({ ...boqLine, rate: e.target.value })} />
            <Button type="submit">Add Line</Button>
          </form>
        </Card>
      )}

      {tab === 'milestones' && (
        <Card title="Milestones">
          <ul className="mb-4 space-y-2 text-sm">
            {project.milestones?.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span>{m.title} {m.dueDate && <span className="text-slate-400">· due {fmtDate(m.dueDate)}</span>}</span>
                <span className="flex items-center gap-2"><Badge status={m.status} /> <span className="text-xs text-slate-400">{m.percentComplete}%</span></span>
              </li>
            )) ?? null}
            {!project.milestones?.length && <p className="text-slate-400">No milestones yet.</p>}
          </ul>
          <form onSubmit={addMilestone} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input placeholder="Title" required value={milestone.title} onChange={(e) => setMilestone({ ...milestone, title: e.target.value })} />
            <Input type="date" value={milestone.dueDate} onChange={(e) => setMilestone({ ...milestone, dueDate: e.target.value })} />
            <Button type="submit">Add Milestone</Button>
          </form>
        </Card>
      )}

      {tab === 'labor' && (
        <Card title="Labor & Subcontractor Entries">
          <table className="mb-4 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Date</th><th className="pb-2">Who</th><th className="pb-2">Qty</th><th className="pb-2">Rate</th><th className="pb-2 text-right">Amount</th></tr></thead>
            <tbody>
              {project.laborEntries?.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-2">{fmtDate(l.date)}</td>
                  <td className="py-2">{l.employee?.name ?? l.subcontractor?.name ?? '-'}</td>
                  <td className="py-2">{l.quantity}</td><td className="py-2">{money(l.rate)}</td><td className="py-2 text-right">{money(l.amount)}</td>
                </tr>
              )) ?? <tr><td colSpan={5} className="py-4 text-center text-slate-400">No labor entries yet.</td></tr>}
            </tbody>
          </table>
          <form onSubmit={addLabor} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Quantity (hours/days)"><Input type="number" required value={labor.quantity} onChange={(e) => setLabor({ ...labor, quantity: e.target.value })} /></Field>
            <Field label="Rate"><Input type="number" required value={labor.rate} onChange={(e) => setLabor({ ...labor, rate: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Add Entry</Button></div>
          </form>
        </Card>
      )}

      {tab === 'equipment' && (
        <Card title="Equipment Usage">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Equipment</th><th className="pb-2">From</th><th className="pb-2">To</th><th className="pb-2 text-right">Cost</th></tr></thead>
            <tbody>
              {project.equipmentUsage?.map((u: any) => (
                <tr key={u.id} className="border-t border-slate-100"><td className="py-2">{u.equipment?.name}</td><td className="py-2">{fmtDate(u.dateFrom)}</td><td className="py-2">{u.dateTo ? fmtDate(u.dateTo) : '-'}</td><td className="py-2 text-right">{money(u.cost)}</td></tr>
              )) ?? <tr><td colSpan={4} className="py-4 text-center text-slate-400">No equipment usage logged yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
