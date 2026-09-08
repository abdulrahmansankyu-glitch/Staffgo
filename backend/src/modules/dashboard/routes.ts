import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

function countBy<T extends { status: string }>(rows: T[]): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

router.get('/summary', asyncHandler(async (_req, res) => {
  const [invoices, bills, stocks, projects, materialRequests, quotations, clientInquiries, supplierInquiries, supplierQuotations, customerPOs] = await Promise.all([
    prisma.invoice.findMany(),
    prisma.purchaseBill.findMany(),
    prisma.itemWarehouseStock.findMany(),
    prisma.project.findMany(),
    prisma.materialRequest.findMany(),
    prisma.quotation.findMany(),
    prisma.clientInquiry.findMany(),
    prisma.supplierInquiry.findMany(),
    prisma.supplierQuotation.findMany(),
    prisma.customerPO.findMany(),
  ]);

  const receivables = invoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);
  const payables = bills.reduce((s, b) => s + (b.total - b.amountPaid), 0);
  const lowStockCount = stocks.filter((s) => s.reorderLevel > 0 && s.qtyOnHand <= s.reorderLevel).length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyRevenue = invoices
    .filter((i) => i.invoiceDate >= startOfMonth && i.status !== 'DRAFT')
    .reduce((s, i) => s + i.subtotal, 0);
  const monthlyExpense = bills
    .filter((b) => b.billDate >= startOfMonth)
    .reduce((s, b) => s + b.subtotal, 0);

  // Last 6 months revenue vs purchase-cost trend, oldest to newest.
  const monthlyTrend: { month: string; revenue: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const from = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    const to = new Date(new Date().getFullYear(), new Date().getMonth() - i + 1, 1);
    const revenue = invoices
      .filter((inv) => inv.invoiceDate >= from && inv.invoiceDate < to && inv.status !== 'DRAFT')
      .reduce((s, inv) => s + inv.subtotal, 0);
    const expense = bills
      .filter((b) => b.billDate >= from && b.billDate < to)
      .reduce((s, b) => s + b.subtotal, 0);
    monthlyTrend.push({ month: MONTH_LABELS[from.getMonth()], revenue, expense });
  }

  res.json({
    receivables,
    payables,
    lowStockCount,
    activeProjects,
    monthlyRevenue,
    monthlyExpense,
    invoiceStatusBreakdown: countBy(invoices),
    projectStatusBreakdown: countBy(projects),
    materialRequestStatusBreakdown: countBy(materialRequests),
    monthlyTrend,
    // Pipeline counts: how many of each we've sent/received, requested by the owner.
    quotationsSentCount: quotations.length,
    quotationStatusBreakdown: countBy(quotations),
    clientInquiriesReceivedCount: clientInquiries.length,
    clientInquiryStatusBreakdown: countBy(clientInquiries),
    customerPOsReceivedCount: customerPOs.length,
    supplierInquiriesSentCount: supplierInquiries.length,
    supplierQuotationsReceivedCount: supplierQuotations.length,
  });
}));

export default router;
