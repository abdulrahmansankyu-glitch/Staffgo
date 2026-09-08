import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiOrigin } from '../../lib/api';
import { money, fmtDate } from '../../lib/format';

export function PublicDocumentPage() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/documents/${slug}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error ?? 'This link is not available.'));
  }, [slug]);

  if (error) return <div className="flex h-screen items-center justify-center text-slate-500">{error}</div>;
  if (!data) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;

  const isQuotation = data.documentType === 'QUOTATION';
  const doc = isQuotation ? data.quotation : data.invoice;

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="text-lg font-bold text-blue-700">{data.settings?.name}</div>
            <div className="text-xs text-slate-500">{data.settings?.addressLine} · CR {data.settings?.crNumber} · VAT {data.settings?.vatNumber}</div>
          </div>
          <a href={`${apiOrigin}/api/v1/public/documents/${slug}/pdf`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Download PDF</a>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {isQuotation ? 'Quote' : 'Invoice'} No.: <span className="font-medium text-slate-800">{doc.number}</span> · Date: {fmtDate(isQuotation ? doc.date : doc.invoiceDate)}
        </div>

        {isQuotation && doc.projectTitle && <h1 className="mb-2 text-xl font-bold uppercase text-blue-700">{doc.projectTitle}</h1>}
        <h2 className="mb-6 text-base font-semibold">{data.customer?.name}</h2>

        <table className="mb-6 w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400"><th className="pb-2">Description</th><th className="pb-2">Qty</th><th className="pb-2">Unit</th><th className="pb-2 text-right">Amount</th></tr></thead>
          <tbody>
            {data.lines.map((l: any) => (
              <tr key={l.id} className="border-b border-slate-100">
                <td className="py-2">
                  <div className="font-medium">{l.item?.name ?? l.description}</div>
                  {l.note && <div className="text-xs text-slate-400">{l.note}</div>}
                </td>
                <td className="py-2">{l.qty}</td><td className="py-2">{l.unit}</td>
                <td className="py-2 text-right">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(doc.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>{money(doc.vatAmount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total</span><span>{money(doc.total)}</span></div>
          {!isQuotation && (
            <>
              <div className="flex justify-between text-green-700"><span>Paid</span><span>{money(doc.amountPaid)}</span></div>
              <div className="flex justify-between font-semibold text-red-600"><span>Balance Due</span><span>{money(doc.balanceDue)}</span></div>
            </>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">Powered by StaffGo</div>
      </div>
    </div>
  );
}
