import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatCard } from '../../components/ui';
import { money } from '../../lib/format';

export function PnlPage() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    api.get('/finance/pnl').then((res) => setReport(res.data));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Profit & Loss</h1>
      {!report ? <div className="text-slate-400">Loading...</div> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue" value={money(report.revenue)} />
          <StatCard label="Cost of Goods Sold" value={money(report.cogs)} />
          <StatCard label="Operating Expenses" value={money(report.operatingExpenses)} />
          <StatCard label="Net Profit" value={money(report.netProfit)} />
        </div>
      )}
    </div>
  );
}
