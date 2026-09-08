import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PURCHASING } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { computeTotals } from '../sales/lineHelpers';
import { postStockMove } from '../inventory/stockService';

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

const billSchema = z.object({
  supplierId: z.string(),
  purchaseOrderId: z.string().optional(),
  warehouseId: z.string(),
  dueDate: z.coerce.date().optional(),
  lines: z.array(lineSchema).min(1),
});

function deriveStatus(total: number, amountPaid: number, currentStatus: string): string {
  if (currentStatus === 'VOID') return currentStatus;
  if (amountPaid >= total && total > 0) return 'PAID';
  if (amountPaid > 0) return 'PARTIAL';
  return 'SENT';
}

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const purchaseBills = await prisma.purchaseBill.findMany({
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ purchaseBills: purchaseBills.map((b) => ({ ...b, balanceDue: b.total - b.amountPaid })) });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const purchaseBill = await prisma.purchaseBill.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, lines: { include: { item: true } }, payments: true },
  });
  if (!purchaseBill) return res.status(404).json({ error: 'Purchase bill not found' });
  res.json({ purchaseBill: { ...purchaseBill, balanceDue: purchaseBill.total - purchaseBill.amountPaid } });
}));

router.post('/', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = billSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);
  const number = await nextDocumentNumber('PURCHASE_BILL');

  const purchaseBill = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseBill.create({
      data: {
        number,
        supplierId: data.supplierId,
        purchaseOrderId: data.purchaseOrderId,
        warehouseId: data.warehouseId,
        dueDate: data.dueDate,
        subtotal,
        vatAmount,
        total,
        status: 'SENT',
        lines: { create: lines },
      },
      include: { lines: true },
    });

    for (const line of created.lines) {
      if (!line.itemId) continue; // service/labor lines don't move stock
      await postStockMove(tx, {
        itemId: line.itemId,
        warehouseId: data.warehouseId,
        direction: 'IN',
        qty: line.qty,
        unit: line.unit,
        unitCost: line.unitPrice,
        refType: 'PURCHASE_BILL',
        refId: created.id,
      });
    }

    return created;
  });

  res.status(201).json({ purchaseBill });
}));

router.post('/:id/payments', requireRole(...MANAGE_PURCHASING, 'ACCOUNTANT'), asyncHandler(async (req, res) => {
  const schema = z.object({ amount: z.number().positive(), method: z.string().optional(), reference: z.string().optional(), date: z.coerce.date().optional() });
  const data = schema.parse(req.body);

  const bill = await prisma.purchaseBill.findUnique({ where: { id: req.params.id } });
  if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { purchaseBillId: bill.id, direction: 'OUT', amount: data.amount, method: data.method, reference: data.reference, date: data.date ?? new Date() },
    });
    const newAmountPaid = bill.amountPaid + data.amount;
    const status = deriveStatus(bill.total, newAmountPaid, bill.status);
    const updated = await tx.purchaseBill.update({ where: { id: bill.id }, data: { amountPaid: newAmountPaid, status } });
    return { payment, updated };
  });

  res.status(201).json({ payment: result.payment, purchaseBill: result.updated });
}));

export default router;
