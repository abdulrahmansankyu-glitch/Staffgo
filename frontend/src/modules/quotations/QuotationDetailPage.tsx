import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiOrigin } from '../../lib/api';
import { Badge, Button, Card } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function QuotationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/quotations/${id}`).then((res) => setQuotation(res.data.quotation));
  }
  useEffect(load, [id]);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  async function handleShare() {
    const res = await api.post(`/quotations/${id}/share`);
    setShareUrl(window.location.origin + res.data.url);
  }

  async function handleConvert() {
    setBusy(true);
    try {
      const res = await api.post(`/quotations/${id}/convert-to-order`);
      navigate(`/sales-orders/${res.data.salesOrder.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!quotation) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{quotation.number}</h1>
          <p className="text-sm text-slate-500">{quotation.customer?.name} · {fmtDate(quotation.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={quotation.status} />
          <a href={`${apiOrigin}/api/v1/quotations/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary">Download PDF</Button></a>
          {canManage && <Button variant="secondary" onClick={handleShare}>Get Share Link</Button>}
          {canManage && <Link to={`/quotations/${id}/edit`}><Button variant="secondary">Edit</Button></Link>}
          {canManage && quotation.status !== 'CONVERTED' && <Button onClick={handleConvert} disabled={busy}>Convert to Sales Order</Button>}
        </div>
      </div>

      {shareUrl && (
        <Card className="mb-6">
          <p className="text-sm text-slate-600">Shareable link (no login required): <a className="text-blue-600 underline" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a></p>
        </Card>
      )}

      {quotation.projectTitle && (
        <Card className="mb-6">
          <h2 className="text-lg font-bold uppercase text-blue-700">{quotation.projectTitle}</h2>
          {quotation.location && <p className="text-sm text-slate-500">{quotation.location}</p>}
        </Card>
      )}

      <Card title="Pricing" className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400">
              <th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.lines.map((l: any) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="py-2">
                  <div className="font-medium">{l.item?.name ?? l.description}</div>
                  {l.note && <div className="text-xs text-slate-400">{l.note}</div>}
                </td>
                <td className="py-2">{l.qty}</td>
                <td className="py-2">{l.unit}</td>
                <td className="py-2 text-right font-medium">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(quotation.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(quotation.vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(quotation.total)}</span></div>
        </div>
      </Card>

      {quotation.escalationLines?.length > 0 && (
        <Card title="Price Escalation Table" className="mb-6">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Additional Unit Price</th><th className="pb-2">Notes</th></tr></thead>
            <tbody>
              {quotation.escalationLines.map((e: any) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{e.description}</td><td className="py-2">{e.additionalPrice}</td><td className="py-2 text-slate-500">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
