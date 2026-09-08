import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState<any>(null);

  useEffect(() => {
    api.get(`/suppliers/${id}`).then((res) => setSupplier(res.data.supplier));
  }, [id]);

  if (!supplier) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">{supplier.name}</h1>
      <p className="mb-6 text-sm text-slate-500">{supplier.phone} · {supplier.trn && `TRN ${supplier.trn}`}</p>

      <Card title="Rate History">
        {supplier.rateHistory?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Item</th><th className="pb-2">Rate</th><th className="pb-2">Date</th></tr></thead>
            <tbody>
              {supplier.rateHistory.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2">{r.item?.name}</td>
                  <td className="py-2">{r.currency} {money(r.rate)}</td>
                  <td className="py-2 text-slate-500">{fmtDate(r.effectiveDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-slate-400">No rate history recorded.</p>}
      </Card>
    </div>
  );
}
