import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogoMark } from '../../components/LogoMark';
import { api } from '../../lib/api';

interface NavItem {
  to: string;
  label: string;
  roles: string[];
  countKey?: string;
}

interface NavSection {
  section: string;
  color: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    section: 'Overview',
    color: '#334155', // slate
    items: [{ to: '/', label: 'Dashboard', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] }],
  },
  {
    section: 'Follow-Ups',
    color: '#d97706', // amber
    items: [{ to: '/follow-ups', label: 'Follow-Ups', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] }],
  },
  {
    section: 'Sales',
    color: '#2563eb', // blue
    items: [
      { to: '/customers', label: 'Customers', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/client-inquiries', label: 'Client Inquiries', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'clientInquiriesReceivedCount' },
      { to: '/quotations', label: 'Quotations', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'quotations' },
      { to: '/customer-pos', label: 'Customer POs Received', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'customerPOsReceivedCount' },
      { to: '/sales-orders', label: 'Sales Orders', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'salesOrders' },
      { to: '/invoices', label: 'Invoices', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'invoices' },
      { to: '/delivery-notes', label: 'Delivery Notes', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
    ],
  },
  {
    section: 'Purchasing',
    color: '#7c3aed', // violet
    items: [
      { to: '/suppliers', label: 'Suppliers', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/supplier-inquiries', label: 'RFQs Sent', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'supplierInquiriesSentCount' },
      { to: '/supplier-quotations', label: 'Supplier Quotations', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'supplierQuotationsReceivedCount' },
      { to: '/purchase-orders', label: 'Purchase Orders', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'purchaseOrders' },
      { to: '/purchase-bills', label: 'Purchase Bills', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'purchaseBills' },
    ],
  },
  {
    section: 'Inventory',
    color: '#059669', // emerald
    items: [
      { to: '/items', label: 'Items', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/warehouses', label: 'Warehouses & Sites', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/inventory', label: 'Stock & Valuation', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/material-requests', label: 'Material Requests', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'], countKey: 'materialRequests' },
    ],
  },
  {
    section: 'Contracting',
    color: '#4f46e5', // indigo
    items: [{ to: '/projects', label: 'Projects', roles: ['ADMIN', 'ACCOUNTANT', 'SALES'], countKey: 'activeProjects' }],
  },
  {
    section: 'Finance',
    color: '#0d9488', // teal
    items: [
      { to: '/finance/expenses', label: 'Expenses', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/bank', label: 'Bank & Reconciliation', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/vat', label: 'VAT Report', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/pnl', label: 'Profit & Loss', roles: ['ADMIN', 'ACCOUNTANT'] },
    ],
  },
  {
    section: 'Admin',
    color: '#57534e', // stone
    items: [
      { to: '/employees', label: 'Employees', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/contracts', label: 'Contracts', roles: ['ADMIN'] },
      { to: '/users', label: 'Users', roles: ['ADMIN'] },
      { to: '/settings', label: 'Company Settings', roles: ['ADMIN'] },
    ],
  },
];

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Sidebar() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get('/dashboard/summary').then((res) => {
      const flat: Record<string, number> = {
        clientInquiriesReceivedCount: res.data.clientInquiriesReceivedCount,
        customerPOsReceivedCount: res.data.customerPOsReceivedCount,
        supplierInquiriesSentCount: res.data.supplierInquiriesSentCount,
        supplierQuotationsReceivedCount: res.data.supplierQuotationsReceivedCount,
        activeProjects: res.data.activeProjects,
      };
      for (const c of res.data.categories ?? []) flat[c.key] = c.total;
      setCounts(flat);
    }).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <LogoMark size={34} />
        <div className="text-lg font-semibold text-slate-800">StaffGo</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => {
          const items = section.items.filter((i) => i.roles.includes(user.role));
          if (items.length === 0) return null;
          return (
            <div key={section.section} className="mb-5">
              <div
                className="mb-1.5 flex items-center gap-2 rounded px-2 py-1 text-xs font-bold uppercase tracking-wide"
                style={{ color: section.color, backgroundColor: hexToRgba(section.color, 0.08) }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ backgroundColor: section.color }} />
                {section.section}
              </div>
              <div className="ml-[7px] space-y-0.5 border-l pl-2.5" style={{ borderColor: hexToRgba(section.color, 0.25) }}>
                {items.map((item) => {
                  const count = item.countKey ? counts[item.countKey] : undefined;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onMouseEnter={() => setHovered(item.to)}
                      onMouseLeave={() => setHovered(null)}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-600 transition-colors"
                      style={({ isActive }) => ({
                        backgroundColor: isActive ? section.color : hovered === item.to ? hexToRgba(section.color, 0.08) : 'transparent',
                        color: isActive ? '#fff' : undefined,
                        fontWeight: isActive ? 600 : 400,
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <span>{item.label}</span>
                          {count !== undefined && (
                            <span
                              className="rounded px-1.5 text-xs font-semibold"
                              style={{
                                color: isActive ? '#fff' : section.color,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : hexToRgba(section.color, 0.1),
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
