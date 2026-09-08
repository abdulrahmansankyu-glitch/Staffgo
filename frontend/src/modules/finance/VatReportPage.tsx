import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatCard } from '../../components/ui';
import { money } from '../../lib/format';

export function VatReportPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/finance/vat-report').then((res) => setReport(res.data));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">VAT Report</h1>
      {!report ? <div className="text-slate-400">Loading...</div> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Output VAT (Sales)" value={money(report.outputVat)} />
          <StatCard label="Input VAT (Purchases)" value={money(report.inputVat)} />
          <StatCard label="Net VAT Payable" value={money(report.netVatPayable)} />
          <StatCard label="Sales / Purchases Subtotal" value={`${money(report.salesSubtotal)} / ${money(report.purchasesSubtotal)}`} />
        </div>
      )}
    </div>
  );
}
