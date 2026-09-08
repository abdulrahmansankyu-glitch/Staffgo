import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge, Button } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';
import { useAuth } from '../../auth/AuthContext';

export function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/quotations').then((res) => setQuotations(res.data.quotations));
  }, []);

  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Quotations</h1>
        {canManage && <Link to="/quotations/new"><Button>+ New Quotation</Button></Link>}
      </div>

      <DataTable
        rows={quotations}
        keyField={(q) => q.id}
        onRowClick={(q) => navigate(`/quotations/${q.id}`)}
        columns={[
          { header: 'Number', render: (q) => <span className="font-medium text-slate-800">{q.number}</span> },
          { header: 'Customer', render: (q) => q.customer?.name },
          { header: 'Date', render: (q) => fmtDate(q.date) },
          { header: 'Total', render: (q) => money(q.total) },
          { header: 'Status', render: (q) => <Badge status={q.status} /> },
        ]}
      />
    </div>
  );
}
