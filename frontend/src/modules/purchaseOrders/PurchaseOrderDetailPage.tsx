import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiOrigin } from '../../lib/api';
import { Badge, Button, Card } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const [po, setPo] = useState<any>(null);

  useEffect(() => {
    api.get(`/purchase-orders/${id}`).then((res) => setPo(res.data.purchaseOrder));
  }, [id]);

  if (!po) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{po.number}</h1>
          <p className="text-sm text-slate-500">{po.supplier?.name} · {fmtDate(po.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={po.status} />
          <a href={`${apiOrigin}/api/v1/purchase-orders/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary">Download PDF</Button></a>
        </div>
      </div>

      <Card title="Lines">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2 text-right">Amount</th></tr></thead>
          <tbody>
            {po.lines.map((l: any) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-2">{l.item?.name ?? l.description}</td><td className="py-2">{l.qty}</td><td className="py-2">{l.unit}</td>
                <td className="py-2 text-right font-medium">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(po.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(po.vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(po.total)}</span></div>
        </div>
      </Card>

      {po.bills?.length > 0 && (
        <Card title="Bills" className="mt-6">
          <ul className="space-y-1 text-sm">
            {po.bills.map((b: any) => <li key={b.id}>{b.number}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
