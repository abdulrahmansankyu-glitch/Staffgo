import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireRole } from './auth/RequireRole';
import { AppShell } from './app/layout/AppShell';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { CustomersPage } from './modules/customers/CustomersPage';
import { CustomerDetailPage } from './modules/customers/CustomerDetailPage';
import { SuppliersPage } from './modules/suppliers/SuppliersPage';
import { SupplierDetailPage } from './modules/suppliers/SupplierDetailPage';
import { ItemsPage } from './modules/items/ItemsPage';
import { WarehousesPage } from './modules/warehouses/WarehousesPage';
import { EmployeesPage } from './modules/employees/EmployeesPage';
import { QuotationsPage } from './modules/quotations/QuotationsPage';
import { QuotationFormPage } from './modules/quotations/QuotationFormPage';
import { QuotationDetailPage } from './modules/quotations/QuotationDetailPage';
import { SalesOrdersPage } from './modules/salesOrders/SalesOrdersPage';
import { SalesOrderDetailPage } from './modules/salesOrders/SalesOrderDetailPage';
import { InvoicesPage } from './modules/invoices/InvoicesPage';
import { InvoiceDetailPage } from './modules/invoices/InvoiceDetailPage';
import { DeliveryNotesPage } from './modules/deliveryNotes/DeliveryNotesPage';
import { PurchaseOrdersPage } from './modules/purchaseOrders/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from './modules/purchaseOrders/PurchaseOrderDetailPage';
import { PurchaseBillsPage } from './modules/purchaseBills/PurchaseBillsPage';
import { PurchaseBillDetailPage } from './modules/purchaseBills/PurchaseBillDetailPage';
import { InventoryPage } from './modules/inventory/InventoryPage';
import { MaterialRequestsPage } from './modules/inventory/MaterialRequestsPage';
import { ProjectsPage } from './modules/projects/ProjectsPage';
import { ProjectDetailPage } from './modules/projects/ProjectDetailPage';
import { ExpensesPage } from './modules/finance/ExpensesPage';
import { BankPage } from './modules/finance/BankPage';
import { VatReportPage } from './modules/finance/VatReportPage';
import { PnlPage } from './modules/finance/PnlPage';
import { ContractsPage } from './modules/contracts/ContractsPage';
import { UsersPage } from './modules/admin/UsersPage';
import { SettingsPage } from './modules/admin/SettingsPage';
import { PublicDocumentPage } from './modules/public/PublicDocumentPage';
import { FaviconUpdater } from './components/FaviconUpdater';
import { ClientInquiriesPage } from './modules/inquiries/ClientInquiriesPage';
import { SupplierInquiriesPage } from './modules/inquiries/SupplierInquiriesPage';
import { SupplierQuotationsPage } from './modules/inquiries/SupplierQuotationsPage';
import { CustomerPOsPage } from './modules/inquiries/CustomerPOsPage';
import { FollowUpsPage } from './modules/inquiries/FollowUpsPage';

const MANAGE_SALES = ['ADMIN', 'SALES'];
const MANAGE_PROJECTS = ['ADMIN', 'SALES'];
const MANAGE_FINANCE = ['ADMIN', 'ACCOUNTANT'];
const ADMIN_ONLY = ['ADMIN'];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FaviconUpdater />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/s/:slug" element={<PublicDocumentPage />} />

          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/" element={<DashboardPage />} />

            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />

            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/client-inquiries" element={<ClientInquiriesPage />} />
            <Route path="/supplier-inquiries" element={<SupplierInquiriesPage />} />
            <Route path="/supplier-quotations" element={<SupplierQuotationsPage />} />
            <Route path="/customer-pos" element={<CustomerPOsPage />} />

            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/quotations/new" element={<RequireRole roles={MANAGE_SALES}><QuotationFormPage /></RequireRole>} />
            <Route path="/quotations/:id" element={<QuotationDetailPage />} />
            <Route path="/quotations/:id/edit" element={<RequireRole roles={MANAGE_SALES}><QuotationFormPage /></RequireRole>} />
            <Route path="/sales-orders" element={<SalesOrdersPage />} />
            <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/delivery-notes" element={<DeliveryNotesPage />} />

            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/purchase-bills" element={<PurchaseBillsPage />} />
            <Route path="/purchase-bills/:id" element={<PurchaseBillDetailPage />} />

            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/material-requests" element={<MaterialRequestsPage />} />

            <Route path="/projects" element={<RequireRole roles={MANAGE_PROJECTS}><ProjectsPage /></RequireRole>} />
            <Route path="/projects/:id" element={<RequireRole roles={MANAGE_PROJECTS}><ProjectDetailPage /></RequireRole>} />

            <Route path="/finance/expenses" element={<RequireRole roles={MANAGE_FINANCE}><ExpensesPage /></RequireRole>} />
            <Route path="/finance/bank" element={<RequireRole roles={MANAGE_FINANCE}><BankPage /></RequireRole>} />
            <Route path="/finance/vat" element={<RequireRole roles={MANAGE_FINANCE}><VatReportPage /></RequireRole>} />
            <Route path="/finance/pnl" element={<RequireRole roles={MANAGE_FINANCE}><PnlPage /></RequireRole>} />

            <Route path="/employees" element={<RequireRole roles={MANAGE_FINANCE}><EmployeesPage /></RequireRole>} />
            <Route path="/contracts" element={<RequireRole roles={ADMIN_ONLY}><ContractsPage /></RequireRole>} />
            <Route path="/users" element={<RequireRole roles={ADMIN_ONLY}><UsersPage /></RequireRole>} />
            <Route path="/settings" element={<RequireRole roles={ADMIN_ONLY}><SettingsPage /></RequireRole>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
