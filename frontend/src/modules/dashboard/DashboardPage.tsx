import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { Button, Card, StatCard } from '../../components/ui';
import { CategoryCard } from '../../components/CategoryCard';
import { money, fmtDate } from '../../lib/format';
import { useBranding } from '../../lib/useBranding';
import { statusColor, titleCase } from '../../lib/statusColors';

interface Breakdown { status: string; count: number }
interface Category { key: string; label: string; description: string; total: number; breakdown: Breakdown[] }

interface Summary {
  receivables: number;
  payables: number;
  lowStockCount: number;
  activeProjects: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  invoiceStatusBreakdown: Breakdown[];
  projectStatusBreakdown: Breakdown[];
  materialRequestStatusBreakdown: Breakdown[];
  monthlyTrend: { month: string; revenue: number; expense: number }[];
  quotationsSentCount: number;
  clientInquiriesReceivedCount: number;
  customerPOsReceivedCount: number;
  supplierInquiriesSentCount: number;
  supplierQuotationsReceivedCount: number;
  categories: Category[];
}

const CATEGORY_LINKS: Record<string, string> = {
  quotations: '/quotations',
  salesOrders: '/sales-orders',
  invoices: '/invoices',
  purchaseOrders: '/purchase-orders',
  purchaseBills: '/purchase-bills',
  materialRequests: '/material-requests',
};

function StatusPie({ data, title }: { data: Breakdown[]; title: string }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return (
    <Card title={title}><p className="py-8 text-center text-sm text-slate-400">No records yet.</p></Card>
  );
  return (
    <Card title={title}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="55%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={40} outerRadius={70} paddingAngle={2}>
              {data.map((d) => <Cell key={d.status} fill={statusColor(d.status)} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.status} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor(d.status) }} />
                {titleCase(d.status)}
              </span>
              <span className="font-semibold text-slate-800">{d.count} <span className="font-normal text-slate-400">({Math.round((d.count / total) * 100)}%)</span></span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<'overview' | 'charts'>('overview');
  const branding = useBranding();

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
  }, []);

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      {/* Printable report header — hidden on screen, shown only when printing */}
      <div className="print-header mb-6 items-center justify-between border-b-2 border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {branding?.logoUrl && <img src={branding.logoUrl} alt={branding.name} style={{ height: 40 }} />}
          <div>
            <div className="text-lg font-bold">{branding?.name ?? 'StaffGo'}</div>
            <div className="text-xs text-slate-500">Business Dashboard Report</div>
          </div>
        </div>
        <div className="text-xs text-slate-500">Generated {fmtDate(new Date())}</div>
      </div>

      <div className="mb-1 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">What needs attention, and what's changed · position on {today}</p>
        </div>
        <Button variant="secondary" className="no-print" onClick={() => window.print()}>Print Report</Button>
      </div>

      <div className="no-print mb-6 mt-4 flex gap-1 border-b border-slate-200">
        {(['overview', 'charts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!summary ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className={tab === 'overview' ? 'space-y-6' : 'hidden print:block space-y-6'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Receivables" value={`SAR ${money(summary.receivables)}`} sub="Unpaid on customer invoices" valueClassName="text-blue-600" />
              <StatCard label="Payables" value={`SAR ${money(summary.payables)}`} sub="Unpaid on supplier bills" valueClassName="text-amber-600" />
              <StatCard label="Low Stock Items" value={summary.lowStockCount} sub="At or below reorder level" valueClassName={summary.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'} />
              <StatCard label="Active Projects" value={summary.activeProjects} valueClassName="text-slate-800" />
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600">Pipeline — Every Stage, By Volume</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summary.categories.map((c) => (
                  <CategoryCard key={c.key} label={c.label} description={c.description} total={c.total} breakdown={c.breakdown} to={CATEGORY_LINKS[c.key]} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600">Inquiries & Correspondence — Running Totals</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Client Inquiries" value={summary.clientInquiriesReceivedCount} />
                <StatCard label="Quotations Sent" value={summary.quotationsSentCount} />
                <StatCard label="Customer POs" value={summary.customerPOsReceivedCount} />
                <StatCard label="RFQs Sent" value={summary.supplierInquiriesSentCount} />
                <StatCard label="Supplier Quotes" value={summary.supplierQuotationsReceivedCount} />
              </div>
            </div>
          </div>

          <div className={tab === 'charts' ? 'space-y-6' : 'hidden print:block space-y-6'}>
            <Card title="Revenue vs Purchases — Last 6 Months">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={summary.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `SAR ${money(Number(v))}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#1f6fb2" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Purchases" fill="#f5a623" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <StatusPie title="Invoices — Open vs Closed" data={summary.invoiceStatusBreakdown} />
              <StatusPie title="Projects by Status" data={summary.projectStatusBreakdown} />
              <StatusPie title="Material Requests by Status" data={summary.materialRequestStatusBreakdown} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
