import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Badge } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function SalesOrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/sales-orders').then((res) => setRows(res.data.salesOrders));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Sales Orders</h1>
      <DataTable
        rows={rows}
        keyField={(r) => r.id}
        onRowClick={(r) => navigate(`/sales-orders/${r.id}`)}
        columns={[
          { header: 'Number', render: (r) => <span className="font-medium text-slate-800">{r.number}</span> },
          { header: 'Customer', render: (r) => r.customer?.name },
          { header: 'Date', render: (r) => fmtDate(r.date) },
          { header: 'Total', render: (r) => money(r.total) },
          { header: 'Status', render: (r) => <Badge status={r.status} /> },
        ]}
      />
    </div>
  );
}
