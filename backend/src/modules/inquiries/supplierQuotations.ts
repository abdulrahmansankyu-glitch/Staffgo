import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PURCHASING } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  supplierId: z.string(),
  supplierInquiryId: z.string().optional(),
  referenceNumber: z.string().optional(),
  receivedDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const quotations = await prisma.supplierQuotation.findMany({
    include: { supplier: true, supplierInquiry: { select: { id: true, number: true } } },
    orderBy: { receivedDate: 'desc' },
  });
  res.json({ quotations, total: quotations.length });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const quotation = await prisma.supplierQuotation.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, supplierInquiry: true, purchaseOrders: true },
  });
  if (!quotation) return res.status(404).json({ error: 'Supplier quotation not found' });
  res.json({ quotation });
}));

router.post('/', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);

  const quotation = await prisma.$transaction(async (tx) => {
    const created = await tx.supplierQuotation.create({ data });
    if (data.supplierInquiryId) {
      await tx.supplierInquiry.update({ where: { id: data.supplierInquiryId }, data: { status: 'QUOTED' } });
    }
    return created;
  });
  res.status(201).json({ quotation });
}));

router.patch('/:id/status', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['RECEIVED', 'ACCEPTED', 'REJECTED']) }).parse(req.body);
  const quotation = await prisma.supplierQuotation.update({ where: { id: req.params.id }, data: { status } });
  res.json({ quotation });
}));

export default router;
