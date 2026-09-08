import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Input, Select } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

interface Line { itemId: string; description: string; qty: string; unit: string; unitPrice: string; vatRate: string }
const emptyLine = (): Line => ({ itemId: '', description: '', qty: '1', unit: 'ton', unitPrice: '0', vatRate: '15' });

export function PurchaseBillsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const navigate = useNavigate();

  function load() {
    api.get('/purchase-bills').then((res) => setRows(res.data.purchaseBills));
  }
  useEffect(() => {
    load();
    api.get('/suppliers').then((res) => setSuppliers(res.data.suppliers));
    api.get('/warehouses').then((res) => setWarehouses(res.data.warehouses));
    api.get('/items').then((res) => setItems(res.data.items));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/purchase-bills', {
      supplierId, warehouseId,
      lines: lines.map((l) => ({ itemId: l.itemId || undefined, description: l.description || undefined, qty: Number(l.qty), unit: l.unit, unitPrice: Number(l.unitPrice), vatRate: Number(l.vatRate) })),
    });
    setSupplierId(''); setWarehouseId(''); setLines([emptyLine()]); setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Purchase Bills</h1>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New Purchase Bill'}</Button>}
      </div>

      {showForm && (
        <Card title="New Purchase Bill" className="mb-6">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Receiving warehouse...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                <div className="sm:col-span-2"><Input placeholder="Description" value={line.description} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, description: e.target.value } : l))} /></div>
                <Select value={line.itemId} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, itemId: e.target.value } : l))}>
                  <option value="">No stock item</option>
                  {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={line.qty} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, qty: e.target.value } : l))} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unit: e.target.value } : l))} />
                <Input type="number" placeholder="Unit Price" value={line.unitPrice} onChange={(e) => setLines((p) => p.map((l, idx) => idx === i ? { ...l, unitPrice: e.target.value } : l))} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setLines((p) => [...p, emptyLine()])}>+ Add Line</Button>
              <Button type="submit">Save Bill & Receive Stock</Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        rows={rows}
        keyField={(r) => r.id}
        onRowClick={(r) => navigate(`/purchase-bills/${r.id}`)}
        columns={[
          { header: 'Number', render: (r) => <span className="font-medium text-slate-800">{r.number}</span> },
          { header: 'Supplier', render: (r) => r.supplier?.name },
          { header: 'Date', render: (r) => fmtDate(r.billDate) },
          { header: 'Total', render: (r) => money(r.total) },
          { header: 'Balance Due', render: (r) => money(r.balanceDue) },
          { header: 'Status', render: (r) => <Badge status={r.status} /> },
        ]}
      />
    </div>
  );
}
