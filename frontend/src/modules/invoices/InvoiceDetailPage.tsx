import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiOrigin } from '../../lib/api';
import { Badge, Button, Card, Field, Input } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [payment, setPayment] = useState({ amount: '', method: 'Bank Transfer', reference: '' });

  function load() {
    api.get(`/invoices/${id}`).then((res) => setInvoice(res.data.invoice));
  }
  useEffect(load, [id]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'ACCOUNTANT';

  async function handleShare() {
    const res = await api.post(`/invoices/${id}/share`);
    setShareUrl(window.location.origin + res.data.url);
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    await api.post(`/invoices/${id}/payments`, { ...payment, amount: Number(payment.amount) });
    setPayment({ amount: '', method: 'Bank Transfer', reference: '' });
    load();
  }

  if (!invoice) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{invoice.number}</h1>
          <p className="text-sm text-slate-500">{invoice.customer?.name} · {fmtDate(invoice.invoiceDate)} {invoice.dueDate && `· Due ${fmtDate(invoice.dueDate)}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={invoice.status} />
          <a href={`${apiOrigin}/api/v1/invoices/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary">Download PDF</Button></a>
          {canManage && <Button variant="secondary" onClick={handleShare}>Get Share Link</Button>}
        </div>
      </div>

      {shareUrl && <Card className="mb-6"><p className="text-sm text-slate-600">Shareable link: <a className="text-blue-600 underline" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a></p></Card>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Lines" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2 text-right">Amount</th></tr></thead>
            <tbody>
              {invoice.lines.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-2">{l.item?.name ?? l.description}</td><td className="py-2">{l.qty} {l.unit}</td>
                  <td className="py-2 text-right font-medium">{money(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(invoice.vatAmount)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(invoice.total)}</span></div>
            <div className="flex justify-between text-green-700"><span>Paid</span><span>{money(invoice.amountPaid)}</span></div>
            <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span>{money(invoice.balanceDue)}</span></div>
          </div>
        </Card>

        <div className="space-y-6">
          {canManage && invoice.status !== 'PAID' && (
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
            {invoice.payments?.length ? (
              <ul className="space-y-2 text-sm">
                {invoice.payments.map((p: any) => (
                  <li key={p.id} className="flex justify-between border-b border-slate-100 pb-2">
                    <span>{fmtDate(p.date)} · {p.method}</span><span className="font-medium">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No payments recorded.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
