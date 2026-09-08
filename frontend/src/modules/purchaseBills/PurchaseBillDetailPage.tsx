import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Button, Card, Field, Input } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function PurchaseBillDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [bill, setBill] = useState<any>(null);
  const [payment, setPayment] = useState({ amount: '', method: 'Bank Transfer', reference: '' });

  function load() {
    api.get(`/purchase-bills/${id}`).then((res) => setBill(res.data.purchaseBill));
  }
  useEffect(load, [id]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'ACCOUNTANT';

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    await api.post(`/purchase-bills/${id}/payments`, { ...payment, amount: Number(payment.amount) });
    setPayment({ amount: '', method: 'Bank Transfer', reference: '' });
    load();
  }

  if (!bill) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{bill.number}</h1>
          <p className="text-sm text-slate-500">{bill.supplier?.name} · {fmtDate(bill.billDate)}</p>
        </div>
        <Badge status={bill.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Lines" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2 text-right">Amount</th></tr></thead>
            <tbody>
              {bill.lines.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-2">{l.item?.name ?? l.description}</td><td className="py-2">{l.qty} {l.unit}</td>
                  <td className="py-2 text-right font-medium">{money(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(bill.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(bill.vatAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(bill.total)}</span></div>
            <div className="flex justify-between text-green-700"><span>Paid</span><span>{money(bill.amountPaid)}</span></div>
            <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span>{money(bill.balanceDue)}</span></div>
          </div>
        </Card>

        <div className="space-y-6">
          {canManage && bill.status !== 'PAID' && (
            <Card title="Record Payment">
              <form onSubmit={recordPayment} className="space-y-3">
                <Field label="Amount"><Input type="number" step="any" required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></Field>
                <Field label="Method"><Input value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} /></Field>
                <Field label="Reference"><Input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></Field>
                <Button type="submit" className="w-full">Record Payment</Button>
              </form>
            </Card>
          )}
          <Card title="Payment History">
            {bill.payments?.length ? (
              <ul className="space-y-2 text-sm">
                {bill.payments.map((p: any) => (
                  <li key={p.id} className="flex justify-between border-b border-slate-100 pb-2"><span>{fmtDate(p.date)} · {p.method}</span><span className="font-medium">{money(p.amount)}</span></li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No payments recorded.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
