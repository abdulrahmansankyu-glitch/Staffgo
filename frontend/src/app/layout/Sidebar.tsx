import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogoMark } from '../../components/LogoMark';

interface NavItem {
  to: string;
  label: string;
  roles: string[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] }],
  },
  {
    section: 'Follow-Ups',
    items: [{ to: '/follow-ups', label: 'Follow-Ups', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] }],
  },
  {
    section: 'Sales',
    items: [
      { to: '/customers', label: 'Customers', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/client-inquiries', label: 'Client Inquiries', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/quotations', label: 'Quotations', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/customer-pos', label: 'Customer POs Received', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/sales-orders', label: 'Sales Orders', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/invoices', label: 'Invoices', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/delivery-notes', label: 'Delivery Notes', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
    ],
  },
  {
    section: 'Purchasing',
    items: [
      { to: '/suppliers', label: 'Suppliers', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/supplier-inquiries', label: 'RFQs Sent', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/supplier-quotations', label: 'Supplier Quotations', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/purchase-orders', label: 'Purchase Orders', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/purchase-bills', label: 'Purchase Bills', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/items', label: 'Items', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/warehouses', label: 'Warehouses & Sites', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/inventory', label: 'Stock & Valuation', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
      { to: '/material-requests', label: 'Material Requests', roles: ['ADMIN', 'ACCOUNTANT', 'SALES', 'SITE_STAFF'] },
    ],
  },
  {
    section: 'Contracting',
    items: [{ to: '/projects', label: 'Projects', roles: ['ADMIN', 'ACCOUNTANT', 'SALES'] }],
  },
  {
    section: 'Finance',
    items: [
      { to: '/finance/expenses', label: 'Expenses', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/bank', label: 'Bank & Reconciliation', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/vat', label: 'VAT Report', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/finance/pnl', label: 'Profit & Loss', roles: ['ADMIN', 'ACCOUNTANT'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { to: '/employees', label: 'Employees', roles: ['ADMIN', 'ACCOUNTANT'] },
      { to: '/contracts', label: 'Contracts', roles: ['ADMIN'] },
      { to: '/users', label: 'Users', roles: ['ADMIN'] },
      { to: '/settings', label: 'Company Settings', roles: ['ADMIN'] },
    ],
  },
];

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <LogoMark size={32} />
        <div className="text-lg font-semibold text-slate-800">StaffGo</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((section) => {
          const items = section.items.filter((i) => i.roles.includes(user.role));
          if (items.length === 0) return null;
          return (
            <div key={section.section} className="mb-4">
              <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.section}</div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
