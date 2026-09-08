import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { MANAGE_ADMIN, READ_ONLY_FINANCE_VIEW } from '../../lib/roles';
import { bulkImport } from '../../lib/bulkImport';

const router = Router();
router.use(requireAuth);

const employeeSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  joinDate: z.coerce.date().optional(),
  salary: z.number().optional(),
});

router.get('/', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (_req, res) => {
  const employees = await prisma.employee.findMany({ orderBy: { name: 'asc' } });
  res.json({ employees });
}));

router.post('/', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const data = employeeSchema.parse(req.body);
  const employee = await prisma.employee.create({ data });
  res.status(201).json({ employee });
}));

router.patch('/:id', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const data = employeeSchema.partial().parse(req.body);
  const employee = await prisma.employee.update({ where: { id: req.params.id }, data });
  res.json({ employee });
}));

router.post('/import', requireRole(...MANAGE_ADMIN), asyncHandler(async (req, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const { rows } = schema.parse(req.body);

  interface Row { name: string; designation?: string; phone?: string; email?: string; salary?: number }
  const result = await bulkImport<Row>(
    rows,
    (row) => {
      if (!row.name?.trim()) return { skip: 'Missing name' };
      return {
        name: row.name.trim(),
        designation: row.designation || undefined,
        phone: row.phone || undefined,
        email: row.email || undefined,
        salary: row.salary ? Number(row.salary) : undefined,
      };
    },
    (data) => prisma.employee.create({ data })
  );
  res.json(result);
}));

export default router;
