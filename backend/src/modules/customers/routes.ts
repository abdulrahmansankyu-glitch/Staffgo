import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { bulkImport } from '../../lib/bulkImport';

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  name: z.string().min(1),
  trn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  creditTerms: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || '';
  const customers = await prisma.customer.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json({ customers });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { contacts: true, interactions: { orderBy: { date: 'desc' } } },
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json({ customer });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data });
  res.status(201).json({ customer });
}));

router.patch('/:id', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = customerSchema.partial().parse(req.body);
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
  res.json({ customer });
}));

router.post('/import', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const { rows } = schema.parse(req.body);

  interface Row { name: string; phone?: string; email?: string; address?: string; city?: string; country?: string; trn?: string; creditTerms?: string }
  const result = await bulkImport<Row>(
    rows,
    (row) => {
      if (!row.name?.trim()) return { skip: 'Missing name' };
      return {
        name: row.name.trim(),
        phone: row.phone || undefined,
        email: row.email || undefined,
        address: row.address || undefined,
        city: row.city || undefined,
        country: row.country || undefined,
        trn: row.trn || undefined,
        creditTerms: row.creditterms || row['credit terms'] || undefined,
      };
    },
    (data) => prisma.customer.create({ data })
  );
  res.json(result);
}));

router.post('/:id/contacts', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(1), role: z.string().optional(), phone: z.string().optional(), email: z.string().optional() });
  const data = schema.parse(req.body);
  const contact = await prisma.customerContact.create({ data: { ...data, customerId: req.params.id } });
  res.status(201).json({ contact });
}));

router.post('/:id/interactions', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ type: z.string().min(1), note: z.string().min(1) });
  const data = schema.parse(req.body);
  const interaction = await prisma.customerInteraction.create({ data: { ...data, customerId: req.params.id } });
  res.status(201).json({ interaction });
}));

export default router;
