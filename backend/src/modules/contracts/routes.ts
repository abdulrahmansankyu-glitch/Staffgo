import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { MANAGE_ADMIN, READ_ONLY_FINANCE_VIEW } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

const contractSchema = z.object({
  type: z.enum(['EMPLOYMENT', 'CUSTOMER', 'SUPPLIER']),
  relatedCustomerId: z.string().optional(),
  relatedSupplierId: z.string().optional(),
  employeeId: z.string().optional(),
  templateUsed: z.string().optional(),
  fileUrl: z.string().optional(),
  signedDate: z.coerce.date().optional(),
});

router.get('/', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (_req, res) => {
  const contracts = await prisma.contract.findMany({ include: { employee: true }, orderBy: { createdAt: 'desc' } });
  res.json({ contracts });
}));

router.post('/', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const data = contractSchema.parse(req.body);
  const contract = await prisma.contract.create({ data });
  res.status(201).json({ contract });
}));

// Document templates (editable HTML the owner can tweak without a code change)
router.get('/templates', requireRole(...MANAGE_ADMIN), asyncHandler(async (_req, res) => {
  const templates = await prisma.documentTemplate.findMany();
  res.json({ templates });
}));

router.post('/templates', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const schema = z.object({ type: z.string().min(1), name: z.string().min(1), htmlBody: z.string().min(1) });
  const data = schema.parse(req.body);
  const template = await prisma.documentTemplate.upsert({
    where: { type: data.type },
    update: { name: data.name, htmlBody: data.htmlBody },
    create: data,
  });
  res.status(201).json({ template });
}));

export default router;
