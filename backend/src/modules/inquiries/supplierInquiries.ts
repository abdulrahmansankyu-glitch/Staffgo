import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PURCHASING } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  supplierId: z.string(),
  subject: z.string().min(1),
  description: z.string().optional(),
  sentDate: z.coerce.date().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const inquiries = await prisma.supplierInquiry.findMany({
    include: { supplier: true, quotationsReceived: { select: { id: true, referenceNumber: true, amount: true } } },
    orderBy: { sentDate: 'desc' },
  });
  res.json({ inquiries, total: inquiries.length });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const inquiry = await prisma.supplierInquiry.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, quotationsReceived: true },
  });
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  res.json({ inquiry });
}));

router.post('/', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const number = await nextDocumentNumber('SUPPLIER_INQUIRY');
  const inquiry = await prisma.supplierInquiry.create({ data: { ...data, number } });
  res.status(201).json({ inquiry });
}));

router.patch('/:id/status', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const { status } = z.object({ status: z.enum(['SENT', 'QUOTED', 'CLOSED']) }).parse(req.body);
  const inquiry = await prisma.supplierInquiry.update({ where: { id: req.params.id }, data: { status } });
  res.json({ inquiry });
}));

export default router;
