import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../../lib/api';
import { Button, Card, StatCard } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useBranding } from '../../lib/useBranding';

interface Summary {
  receivables: number;
  payables: number;
  lowStockCount: number;
  activeProjects: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  invoiceStatusBreakdown: { status: string; count: number }[];
  projectStatusBreakdown: { status: string; count: number }[];
  materialRequestStatusBreakdown: { status: string; count: number }[];
  monthlyTrend: { month: string; revenue: number; expense: number }[];
  quotationsSentCount: number;
  clientInquiriesReceivedCount: number;
  customerPOsReceivedCount: number;
  supplierInquiriesSentCount: number;
  supplierQuotationsReceivedCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8', SENT: '#3b82f6', PARTIAL: '#f59e0b', PAID: '#22c55e', OVERDUE: '#ef4444',
  APPROVED: '#22c55e', REJECTED: '#ef4444', FULFILLED: '#22c55e', CONVERTED: '#a855f7',
  VOID: '#cbd5e1', ACTIVE: '#3b82f6', COMPLETED: '#22c55e', PENDING: '#f59e0b',
};

function StatusPie({ data, title }: { data: { status: string; count: number }[]; title: string }) {
  if (!data.length) return (
    <Card title={title}><p className="py-8 text-center text-sm text-slate-400">No records yet.</p></Card>
  );
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? '#94a3b8'} />)}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const branding = useBranding();

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
  }, []);

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

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <Button variant="secondary" className="no-print" onClick={() => window.print()}>Print Report</Button>
      </div>

      {!summary ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Outstanding Receivables" value={`SAR ${money(summary.receivables)}`} sub="Unpaid balance on customer invoices" />
            <StatCard label="Outstanding Payables" value={`SAR ${money(summary.payables)}`} sub="Unpaid balance on supplier bills" />
            <StatCard label="Low Stock Items" value={summary.lowStockCount} sub="At or below reorder level" />
            <StatCard label="Active Projects" value={summary.activeProjects} />
            <StatCard label="Revenue This Month" value={`SAR ${money(summary.monthlyRevenue)}`} />
            <StatCard label="Purchases This Month" value={`SAR ${money(summary.monthlyExpense)}`} />
          </div>

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

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-600">Sales & Purchasing Pipeline — Running Totals</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Client Inquiries Received" value={summary.clientInquiriesReceivedCount} />
              <StatCard label="Quotations Sent to Clients" value={summary.quotationsSentCount} />
              <StatCard label="Customer POs Received" value={summary.customerPOsReceivedCount} />
              <StatCard label="RFQs Sent to Suppliers" value={summary.supplierInquiriesSentCount} />
              <StatCard label="Supplier Quotations Received" value={summary.supplierQuotationsReceivedCount} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
