import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui';
import { fmtDate, money } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function SupplierQuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ supplierId: '', supplierInquiryId: '', referenceNumber: '', amount: '', validUntil: '', notes: '' });

  function load() {
    api.get('/supplier-quotations').then((res) => setQuotations(res.data.quotations));
  }
  useEffect(() => {
    load();
    api.get('/suppliers').then((res) => setSuppliers(res.data.suppliers));
    api.get('/supplier-inquiries').then((res) => setInquiries(res.data.inquiries));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    await api.post('/supplier-quotations', {
      supplierId: form.supplierId,
      supplierInquiryId: form.supplierInquiryId || undefined,
      referenceNumber: form.referenceNumber || undefined,
      amount: Number(form.amount),
      validUntil: form.validUntil || undefined,
      notes: form.notes || undefined,
    });
    setForm({ supplierId: '', supplierInquiryId: '', referenceNumber: '', amount: '', validUntil: '', notes: '' });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Supplier Quotations Received</h1>
          <p className="text-sm text-slate-500">Pricing quotes suppliers have sent back to us.</p>
        </div>
        {canManage && <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Log Quotation'}</Button>}
      </div>

      {showForm && (
        <Card title="New Supplier Quotation" className="mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Supplier">
              <Select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Select supplier...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Related RFQ (optional)">
              <Select value={form.supplierInquiryId} onChange={(e) => setForm({ ...form, supplierInquiryId: e.target.value })}>
                <option value="">None</option>
                {inquiries.map((i) => <option key={i.id} value={i.id}>{i.number} - {i.subject}</option>)}
              </Select>
            </Field>
            <Field label="Supplier's Reference #"><Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} /></Field>
            <Field label="Amount"><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Valid Until"><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></Field>
            <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div><Button type="submit">Save Quotation</Button></div>
          </form>
        </Card>
      )}

      <DataTable
        rows={quotations}
        keyField={(q) => q.id}
        columns={[
          { header: 'Supplier', render: (q) => q.supplier?.name },
          { header: 'Reference #', render: (q) => q.referenceNumber ?? '-' },
          { header: 'Related RFQ', render: (q) => q.supplierInquiry?.number ?? '-' },
          { header: 'Received', render: (q) => fmtDate(q.receivedDate) },
          { header: 'Amount', render: (q) => money(q.amount) },
          { header: 'Status', render: (q) => <Badge status={q.status} /> },
        ]}
      />
    </div>
  );
}
