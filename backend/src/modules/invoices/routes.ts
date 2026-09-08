import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { computeTotals } from '../sales/lineHelpers';
import { renderTemplate, htmlToPdfBuffer } from '../../lib/pdf';
import { generateSlug, generateToken } from '../../lib/share';
import { INVOICE_TEMPLATE, PDF_HEADER_TEMPLATE, PDF_FOOTER_TEMPLATE, PDF_MARGINS } from '../documents/templates';
import { getCompanySettings, settingsForPdf } from '../../lib/companySettings';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  qty: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().optional(),
});

const invoiceSchema = z.object({
  customerId: z.string(),
  projectId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  lines: z.array(lineSchema).min(1),
});

function deriveStatus(total: number, amountPaid: number, dueDate: Date | null, currentStatus: string): string {
  if (currentStatus === 'VOID' || currentStatus === 'DRAFT') return currentStatus;
  if (amountPaid >= total && total > 0) return 'PAID';
  if (amountPaid > 0) return 'PARTIAL';
  if (dueDate && dueDate.getTime() < Date.now()) return 'OVERDUE';
  return 'SENT';
}

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    invoices: invoices.map((inv) => ({ ...inv, balanceDue: inv.total - inv.amountPaid })),
  });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, lines: { include: { item: true } }, payments: true, project: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice: { ...invoice, balanceDue: invoice.total - invoice.amountPaid } });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = invoiceSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);
  const number = await nextDocumentNumber('INVOICE');

  const invoice = await prisma.invoice.create({
    data: {
      number,
      customerId: data.customerId,
      projectId: data.projectId,
      dueDate: data.dueDate,
      subtotal,
      vatAmount,
      total,
      status: 'SENT',
      lines: { create: lines },
    },
    include: { lines: true },
  });
  res.status(201).json({ invoice });
}));

router.post('/:id/payments', requireRole(...MANAGE_SALES, 'ACCOUNTANT'), asyncHandler(async (req, res) => {
  const schema = z.object({ amount: z.number().positive(), method: z.string().optional(), reference: z.string().optional(), date: z.coerce.date().optional() });
  const data = schema.parse(req.body);

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { invoiceId: invoice.id, direction: 'IN', amount: data.amount, method: data.method, reference: data.reference, date: data.date ?? new Date() },
    });
    const newAmountPaid = invoice.amountPaid + data.amount;
    const status = deriveStatus(invoice.total, newAmountPaid, invoice.dueDate, invoice.status);
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status },
    });
    return { payment, updated };
  });

  res.status(201).json({ payment: result.payment, invoice: result.updated });
}));

router.get('/:id/pdf', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, lines: { include: { item: true } } },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const settings = await getCompanySettings();

  const html = renderTemplate(INVOICE_TEMPLATE, {
    invoice: { ...invoice, balanceDue: invoice.total - invoice.amountPaid },
    customer: invoice.customer,
    lines: invoice.lines,
    settings,
  });
  const buffer = await htmlToPdfBuffer(html, {
    headerTemplate: renderTemplate(PDF_HEADER_TEMPLATE, { settings: settingsForPdf(settings) }),
    footerTemplate: PDF_FOOTER_TEMPLATE,
    margin: PDF_MARGINS,
  });

  const dir = path.join(__dirname, '..', '..', '..', 'uploads', 'pdf', 'invoice');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${invoice.number}.pdf`), buffer);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
  res.send(buffer);
}));

router.post('/:id/share', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const slug = generateSlug();
  const token = generateToken();
  await prisma.shareLink.create({ data: { documentType: 'INVOICE', invoiceId: invoice.id, slug, token } });
  res.status(201).json({ url: `/s/${slug}` });
}));

export default router;
