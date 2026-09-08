import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { computeTotals } from './lineHelpers';

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

const salesOrderSchema = z.object({
  customerId: z.string(),
  projectId: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const salesOrders = await prisma.salesOrder.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ salesOrders });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { id: req.params.id },
    include: { customer: true, lines: { include: { item: true } }, invoices: true, deliveryNotes: true },
  });
  if (!salesOrder) return res.status(404).json({ error: 'Sales order not found' });
  res.json({ salesOrder });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = salesOrderSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);
  const number = await nextDocumentNumber('SALES_ORDER');

  const salesOrder = await prisma.salesOrder.create({
    data: {
      number,
      customerId: data.customerId,
      projectId: data.projectId,
      subtotal,
      vatAmount,
      total,
      lines: { create: lines },
    },
    include: { lines: true },
  });
  res.status(201).json({ salesOrder });
}));

router.post('/:id/convert-to-invoice', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const so = await prisma.salesOrder.findUnique({ where: { id: req.params.id }, include: { lines: true } });
  if (!so) return res.status(404).json({ error: 'Sales order not found' });

  const number = await nextDocumentNumber('INVOICE');
  const invoice = await prisma.invoice.create({
    data: {
      number,
      customerId: so.customerId,
      salesOrderId: so.id,
      projectId: so.projectId,
      subtotal: so.subtotal,
      vatAmount: so.vatAmount,
      total: so.total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lines: {
        create: so.lines.map((l) => ({
          itemId: l.itemId,
          description: l.description,
          note: l.note,
          qty: l.qty,
          unit: l.unit,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });
  await prisma.salesOrder.update({ where: { id: so.id }, data: { status: 'CONVERTED' } });
  res.status(201).json({ invoice });
}));

export default router;
