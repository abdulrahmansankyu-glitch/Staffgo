import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Button, Card } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function SalesOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [so, setSo] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/sales-orders/${id}`).then((res) => setSo(res.data.salesOrder));
  }
  useEffect(load, [id]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleConvert() {
    setBusy(true);
    try {
      const res = await api.post(`/sales-orders/${id}/convert-to-invoice`);
      navigate(`/invoices/${res.data.invoice.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!so) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{so.number}</h1>
          <p className="text-sm text-slate-500">{so.customer?.name} · {fmtDate(so.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={so.status} />
          {canManage && so.status !== 'CONVERTED' && <Button onClick={handleConvert} disabled={busy}>Convert to Invoice</Button>}
        </div>
      </div>

      <Card title="Lines">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2 text-right">Amount</th></tr></thead>
          <tbody>
            {so.lines.map((l: any) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-2">{l.item?.name ?? l.description}</td>
                <td className="py-2">{l.qty}</td><td className="py-2">{l.unit}</td>
                <td className="py-2 text-right font-medium">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(so.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(so.vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(so.total)}</span></div>
        </div>
      </Card>
    </div>
  );
}
