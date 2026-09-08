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

const warehouseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['WAREHOUSE', 'SITE']).default('WAREHOUSE'),
  address: z.string().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
  res.json({ warehouses });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = warehouseSchema.parse(req.body);
  const warehouse = await prisma.warehouse.create({ data });
  res.status(201).json({ warehouse });
}));

router.patch('/:id', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = warehouseSchema.partial().parse(req.body);
  const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data });
  res.json({ warehouse });
}));

router.post('/import', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const { rows } = schema.parse(req.body);

  interface Row { name: string; type: string; address?: string }
  const result = await bulkImport<Row>(
    rows,
    (row) => {
      if (!row.name?.trim()) return { skip: 'Missing name' };
      const type = row.type?.trim().toUpperCase() === 'SITE' ? 'SITE' : 'WAREHOUSE';
      return { name: row.name.trim(), type, address: row.address || undefined };
    },
    (data) => prisma.warehouse.create({ data })
  );
  res.json(result);
}));

export default router;
