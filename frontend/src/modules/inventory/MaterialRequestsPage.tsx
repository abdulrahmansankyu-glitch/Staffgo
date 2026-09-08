import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Input, Select } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

interface Line { materialText: string; qtyRequested: string; unit: string }
const emptyLine = (): Line => ({ materialText: '', qtyRequested: '1', unit: 'bag' });

export function MaterialRequestsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  function load() {
    api.get('/material-requests').then((res) => setRows(res.data.materialRequests));
  }
  useEffect(() => {
    load();
    api.get('/warehouses').then((res) => { setSites(res.data.warehouses.filter((w: any) => w.type === 'SITE')); setWarehouses(res.data.warehouses.filter((w: any) => w.type === 'WAREHOUSE')); });
    api.get('/items').then((res) => setItems(res.data.items));
  }, []);

  const canApprove = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/material-requests', {
      siteId,
      lines: lines.map((l) => {
        const match = items.find((it) => it.name.trim().toLowerCase() === l.materialText.trim().toLowerCase());
        return {
          itemId: match?.id,
          itemName: match ? undefined : l.materialText.trim(),
          qtyRequested: Number(l.qtyRequested),
          unit: l.unit,
        };
      }),
    });
    setSiteId(''); setLines([emptyLine()]); setShowForm(false);
    load();
  }

  async function approve(mr: any) {
    await api.patch(`/material-requests/${mr.id}/approve`, {
      lines: mr.lines.map((l: any) => ({ id: l.id, qtyApproved: l.qtyRequested })),
    });
    load();
  }

  async function fulfill(mr: any) {
    const fromWarehouseId = warehouses[0]?.id;
    if (!fromWarehouseId) return alert('No warehouse available to fulfill from.');
    await api.post(`/material-requests/${mr.id}/fulfill`, { fromWarehouseId });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Material Requests</h1>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Request'}</Button>
      </div>

      {showForm && (
        <Card title="New Material Request" className="mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <Select required value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select site...</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <datalist id="mr-items-list">
              {items.map((it) => <option key={it.id} value={it.name} />)}
            </datalist>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  list="mr-items-list"
                  required
                  placeholder="Type or pick a material..."
                  value={line.materialText}
                  onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, materialText: e.target.value } : l))}
                />
                <Input type="number" placeholder="Qty" value={line.qtyRequested} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, qtyRequested: e.target.value } : l))} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unit: e.target.value } : l))} />
              </div>
            ))}
            <p className="text-xs text-slate-400">Pick a material from the list, or just type a name for something not yet in the catalog.</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>+ Add Line</Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        rows={rows}
        keyField={(r) => r.id}
        columns={[
          { header: 'Number', render: (r) => <span className="font-medium text-slate-800">{r.number}</span> },
          { header: 'Site', render: (r) => r.site?.name },
          { header: 'Requested By', render: (r) => r.requestedBy?.name },
          { header: 'Date', render: (r) => fmtDate(r.date) },
          { header: 'Status', render: (r) => <Badge status={r.status} /> },
          ...(canApprove ? [{
            header: 'Actions', render: (r: any) => (
              <div className="flex gap-2">
                {r.status === 'PENDING' && <Button variant="secondary" onClick={() => approve(r)}>Approve</Button>}
                {r.status === 'APPROVED' && <Button onClick={() => fulfill(r)}>Fulfill</Button>}
              </div>
            ),
          }] : []),
        ]}
      />
    </div>
  );
}
