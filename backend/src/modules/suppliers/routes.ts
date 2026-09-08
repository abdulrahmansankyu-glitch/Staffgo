import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PURCHASING } from '../../lib/roles';
import { bulkImport } from '../../lib/bulkImport';

const router = Router();
router.use(requireAuth);

const supplierSchema = z.object({
  name: z.string().min(1),
  trn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || '';
  const suppliers = await prisma.supplier.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json({ suppliers });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: { rateHistory: { include: { item: true }, orderBy: { effectiveDate: 'desc' } } },
  });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ supplier });
}));

router.post('/', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json({ supplier });
}));

router.patch('/:id', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = supplierSchema.partial().parse(req.body);
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
  res.json({ supplier });
}));

router.post('/import', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const { rows } = schema.parse(req.body);

  interface Row { name: string; phone?: string; email?: string; address?: string; trn?: string; paymentTerms?: string }
  const result = await bulkImport<Row>(
    rows,
    (row) => {
      if (!row.name?.trim()) return { skip: 'Missing name' };
      return {
        name: row.name.trim(),
        phone: row.phone || undefined,
        email: row.email || undefined,
        address: row.address || undefined,
        trn: row.trn || undefined,
        paymentTerms: row.paymentterms || row['payment terms'] || undefined,
      };
    },
    (data) => prisma.supplier.create({ data })
  );
  res.json(result);
}));

router.post('/:id/rates', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const schema = z.object({ itemId: z.string(), rate: z.number().positive(), currency: z.string().optional() });
  const data = schema.parse(req.body);
  const rate = await prisma.supplierRateHistory.create({ data: { ...data, supplierId: req.params.id } });
  res.status(201).json({ rate });
}));

export default router;
