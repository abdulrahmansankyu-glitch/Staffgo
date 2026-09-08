import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/routes';
import customerRoutes from './modules/customers/routes';
import supplierRoutes from './modules/suppliers/routes';
import itemRoutes from './modules/items/routes';
import warehouseRoutes from './modules/warehouses/routes';
import employeeRoutes from './modules/employees/routes';
import quotationRoutes from './modules/sales/quotations';
import salesOrderRoutes from './modules/sales/salesOrders';
import invoiceRoutes from './modules/invoices/routes';
import deliveryNoteRoutes from './modules/delivery-notes/routes';
import purchaseOrderRoutes from './modules/purchasing/purchaseOrders';
import purchaseBillRoutes from './modules/purchasing/purchaseBills';
import inventoryRoutes from './modules/inventory/routes';
import materialRequestRoutes from './modules/inventory/materialRequests';
import projectRoutes from './modules/projects/routes';
import financeRoutes from './modules/finance/routes';
import contractRoutes from './modules/contracts/routes';
import dashboardRoutes from './modules/dashboard/routes';
import settingsRoutes from './modules/settings/routes';
import clientInquiryRoutes from './modules/inquiries/clientInquiries';
import supplierInquiryRoutes from './modules/inquiries/supplierInquiries';
import supplierQuotationRoutes from './modules/inquiries/supplierQuotations';
import customerPoRoutes from './modules/inquiries/customerPOs';
import followUpRoutes from './modules/inquiries/followUps';
import publicRoutes from './modules/documents/publicRoutes';

const app = express();

// In production, restrict to the deployed frontend origin (Netlify); locally
// reflect any origin so the Vite dev server on any port still works.
const allowedOrigin = process.env.FRONTEND_URL;
app.use(cors({ origin: allowedOrigin || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Public, unauthenticated share-link routes
app.use('/api/v1/public', publicRoutes);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/sales-orders', salesOrderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/delivery-notes', deliveryNoteRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/purchase-bills', purchaseBillRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/material-requests', materialRequestRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/client-inquiries', clientInquiryRoutes);
app.use('/api/v1/supplier-inquiries', supplierInquiryRoutes);
app.use('/api/v1/supplier-quotations', supplierQuotationRoutes);
app.use('/api/v1/customer-pos', customerPoRoutes);
app.use('/api/v1/follow-ups', followUpRoutes);

// Serve built frontend in production (single-origin deployment)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`StaffGo backend listening on http://localhost:${config.port}`);
});
