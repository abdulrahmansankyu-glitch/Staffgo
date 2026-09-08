import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  poNumber: z.string().min(1),
  customerId: z.string(),
  quotationId: z.string().optional(),
  receivedDate: z.coerce.date().optional(),
  amount: z.number().nonnegative(),
  attachmentUrl: z.string().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const purchaseOrders = await prisma.customerPO.findMany({
    include: { customer: true, quotation: { select: { id: true, number: true } } },
    orderBy: { receivedDate: 'desc' },
  });
  res.json({ purchaseOrders, total: purchaseOrders.length });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const purchaseOrder = await prisma.customerPO.findUnique({
    where: { id: req.params.id },
    include: { customer: true, quotation: true },
  });
  if (!purchaseOrder) return res.status(404).json({ error: 'Customer PO not found' });
  res.json({ purchaseOrder });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const purchaseOrder = await prisma.customerPO.create({ data });
  res.status(201).json({ purchaseOrder });
}));

router.patch('/:id/status', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['RECEIVED', 'FULFILLED']) }).parse(req.body);
  const purchaseOrder = await prisma.customerPO.update({ where: { id: req.params.id }, data: { status } });
  res.json({ purchaseOrder });
}));

export default router;
