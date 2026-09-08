import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

// One screen pulling together everything that needs a human follow-up:
// unanswered client inquiries, quotations sitting without a reply, open
// supplier RFQs, and outstanding payments on both sides.
router.get('/', asyncHandler(async (_req, res) => {
  const [clientInquiries, quotations, supplierInquiries, invoices, bills] = await Promise.all([
    prisma.clientInquiry.findMany({ where: { status: 'NEW' }, include: { customer: true }, orderBy: { receivedDate: 'asc' } }),
    prisma.quotation.findMany({ where: { status: 'SENT' }, include: { customer: true }, orderBy: { date: 'asc' } }),
    prisma.supplierInquiry.findMany({ where: { status: 'SENT' }, include: { supplier: true }, orderBy: { sentDate: 'asc' } }),
    prisma.invoice.findMany({ where: { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } }, include: { customer: true }, orderBy: { dueDate: 'asc' } }),
    prisma.purchaseBill.findMany({ where: { status: { in: ['SENT', 'PARTIAL'] } }, include: { supplier: true }, orderBy: { dueDate: 'asc' } }),
  ]);

  res.json({
    clientInquiriesPending: clientInquiries.map((i) => ({ id: i.id, number: i.number, subject: i.subject, customer: i.customer.name, daysOpen: daysSince(i.receivedDate) })),
    quotationsAwaitingResponse: quotations.map((q) => ({ id: q.id, number: q.number, customer: q.customer.name, total: q.total, daysOpen: daysSince(q.date) })),
    supplierInquiriesPending: supplierInquiries.map((i) => ({ id: i.id, number: i.number, subject: i.subject, supplier: i.supplier.name, daysOpen: daysSince(i.sentDate) })),
    invoicesNeedingFollowup: invoices.map((inv) => ({ id: inv.id, number: inv.number, customer: inv.customer.name, balanceDue: inv.total - inv.amountPaid, dueDate: inv.dueDate, status: inv.status })),
    billsPendingPayment: bills.map((b) => ({ id: b.id, number: b.number, supplier: b.supplier.name, balanceDue: b.total - b.amountPaid, dueDate: b.dueDate, status: b.status })),
  });
}));

export default router;
