import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { money } from '../../lib/format';

export function InventoryPage() {
  const [tab, setTab] = useState<'levels' | 'valuation' | 'low'>('levels');
  const [stocks, setStocks] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    api.get('/inventory/stock-levels').then((res) => setStocks(res.data.stocks));
    api.get('/inventory/valuation').then((res) => { setValuation(res.data.valuation); setTotalValue(res.data.totalValue); });
    api.get('/inventory/low-stock').then((res) => setLowStock(res.data.lowStock));
  }, []);

  const tabs = [
    { key: 'levels', label: 'Stock Levels' },
    { key: 'valuation', label: 'Valuation' },
    { key: 'low', label: `Low Stock (${lowStock.length})` },
  ] as const;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Inventory</h1>
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'levels' && (
        <DataTable
          rows={stocks}
          keyField={(s) => s.id}
          columns={[
            { header: 'Item', render: (s) => s.item?.name },
            { header: 'Warehouse', render: (s) => s.warehouse?.name },
            { header: 'Qty On Hand', render: (s) => s.qtyOnHand },
            { header: 'Reorder Level', render: (s) => s.reorderLevel },
          ]}
        />
      )}

      {tab === 'valuation' && (
        <div>
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <span className="text-slate-500">Total Stock Value:</span> <span className="font-semibold">SAR {money(totalValue)}</span>
          </div>
          <DataTable
            rows={valuation}
            keyField={(v) => `${v.itemId}-${v.warehouseId}`}
            columns={[
              { header: 'Item', render: (v) => v.itemName },
              { header: 'Warehouse', render: (v) => v.warehouseName },
              { header: 'Qty', render: (v) => v.qtyOnHand },
              { header: 'Avg Cost', render: (v) => money(v.avgCost) },
              { header: 'Value', render: (v) => money(v.value) },
            ]}
          />
        </div>
      )}

      {tab === 'low' && (
        <DataTable
          rows={lowStock}
          keyField={(s) => s.id}
          emptyLabel="No items at or below reorder level."
          columns={[
            { header: 'Item', render: (s) => s.item?.name },
            { header: 'Warehouse', render: (s) => s.warehouse?.name },
            { header: 'Qty On Hand', render: (s) => <span className="font-medium text-red-600">{s.qtyOnHand}</span> },
            { header: 'Reorder Level', render: (s) => s.reorderLevel },
          ]}
        />
      )}
    </div>
  );
}
