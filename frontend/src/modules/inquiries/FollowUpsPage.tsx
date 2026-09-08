import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

interface FollowUps {
  clientInquiriesPending: { id: string; number: string; subject: string; customer: string; daysOpen: number }[];
  quotationsAwaitingResponse: { id: string; number: string; customer: string; total: number; daysOpen: number }[];
  supplierInquiriesPending: { id: string; number: string; subject: string; supplier: string; daysOpen: number }[];
  invoicesNeedingFollowup: { id: string; number: string; customer: string; balanceDue: number; dueDate: string | null; status: string }[];
  billsPendingPayment: { id: string; number: string; supplier: string; balanceDue: number; dueDate: string | null; status: string }[];
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Card title={`${title} (${count})`}>
      {count === 0 ? <p className="py-4 text-center text-sm text-slate-400">Nothing needs attention here.</p> : children}
    </Card>
  );
}

export function FollowUpsPage() {
  const [data, setData] = useState<FollowUps | null>(null);

  useEffect(() => {
    api.get('/follow-ups').then((res) => setData(res.data));
  }, []);

  if (!data) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Follow-Ups</h1>
        <p className="text-sm text-slate-500">Everything waiting on a reply, a decision, or a payment — client and supplier side.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Client Inquiries Awaiting a Quotation" count={data.clientInquiriesPending.length}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.clientInquiriesPending.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <div><span className="font-medium">{i.customer}</span> — {i.subject}</div>
                <span className="text-xs text-amber-600">{i.daysOpen}d open</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Quotations Sent, No Response Yet" count={data.quotationsAwaitingResponse.length}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.quotationsAwaitingResponse.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-2">
                <Link to={`/quotations/${q.id}`} className="text-blue-600 hover:underline">{q.number} — {q.customer}</Link>
                <span className="text-xs text-slate-500">{money(q.total)} · {q.daysOpen}d</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Supplier RFQs Awaiting a Quote" count={data.supplierInquiriesPending.length}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.supplierInquiriesPending.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <div><span className="font-medium">{i.supplier}</span> — {i.subject}</div>
                <span className="text-xs text-amber-600">{i.daysOpen}d open</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Client Payments to Chase" count={data.invoicesNeedingFollowup.length}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.invoicesNeedingFollowup.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2">
                <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">{inv.number} — {inv.customer}</Link>
                <span className="text-xs text-red-600">{money(inv.balanceDue)} due{inv.dueDate && ` · ${fmtDate(inv.dueDate)}`}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Supplier Payments Due" count={data.billsPendingPayment.length}>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.billsPendingPayment.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <Link to={`/purchase-bills/${b.id}`} className="text-blue-600 hover:underline">{b.number} — {b.supplier}</Link>
                <span className="text-xs text-amber-600">{money(b.balanceDue)} due{b.dueDate && ` · ${fmtDate(b.dueDate)}`}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
