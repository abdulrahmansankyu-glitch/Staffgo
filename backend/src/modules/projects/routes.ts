import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PROJECTS } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

const projectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  customerId: z.string().optional(),
  contractValue: z.number().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const projects = await prisma.project.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });
  res.json({ projects });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      boqs: { include: { lines: true } },
      milestones: true,
      laborEntries: { include: { employee: true, subcontractor: true } },
      equipmentUsage: { include: { equipment: true } },
    },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
}));

router.post('/', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const data = projectSchema.parse(req.body);
  const project = await prisma.project.create({ data });
  res.status(201).json({ project });
}));

router.patch('/:id', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const data = projectSchema.partial().parse(req.body);
  const project = await prisma.project.update({ where: { id: req.params.id }, data });
  res.json({ project });
}));

// ---- BOQ ----
router.post('/:id/boq', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({
    lines: z.array(z.object({
      description: z.string().min(1), unit: z.string().min(1), qty: z.number().positive(), rate: z.number().nonnegative(), category: z.string().optional(),
    })).min(1),
  });
  const { lines } = schema.parse(req.body);
  const priorCount = await prisma.boq.count({ where: { projectId: req.params.id } });

  const boq = await prisma.boq.create({
    data: {
      projectId: req.params.id,
      version: priorCount + 1,
      lines: { create: lines.map((l) => ({ ...l, amount: l.qty * l.rate })) },
    },
    include: { lines: true },
  });
  res.status(201).json({ boq });
}));

// ---- Milestones ----
router.post('/:id/milestones', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({ title: z.string().min(1), dueDate: z.coerce.date().optional() });
  const data = schema.parse(req.body);
  const milestone = await prisma.milestone.create({ data: { ...data, projectId: req.params.id } });
  res.status(201).json({ milestone });
}));

router.patch('/:id/milestones/:milestoneId', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED']).optional(), percentComplete: z.number().min(0).max(100).optional() });
  const data = schema.parse(req.body);
  const milestone = await prisma.milestone.update({ where: { id: req.params.milestoneId }, data });
  res.json({ milestone });
}));

// ---- Labor entries ----
router.post('/:id/labor', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({
    employeeId: z.string().optional(),
    subcontractorId: z.string().optional(),
    date: z.coerce.date().optional(),
    quantity: z.number().positive(),
    rate: z.number().nonnegative(),
  });
  const data = schema.parse(req.body);
  const laborEntry = await prisma.laborEntry.create({
    data: { ...data, projectId: req.params.id, amount: data.quantity * data.rate },
  });
  res.status(201).json({ laborEntry });
}));

// ---- Equipment usage ----
router.post('/:id/equipment-usage', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({
    equipmentId: z.string(),
    dateFrom: z.coerce.date(),
    dateTo: z.coerce.date().optional(),
    cost: z.number().nonnegative(),
  });
  const data = schema.parse(req.body);
  const usage = await prisma.equipmentUsageLog.create({ data: { ...data, projectId: req.params.id } });
  res.status(201).json({ usage });
}));

// ---- Job costing report: revenue (invoices) vs cost (bills+expenses+labor+equipment) ----
router.get('/:id/costing', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const projectId = req.params.id;

  const [invoices, bills, expenses, labor, equipment] = await Promise.all([
    prisma.invoice.findMany({ where: { projectId } }),
    prisma.purchaseBill.findMany({ where: { purchaseOrder: { projectId } } }),
    prisma.expense.findMany({ where: { projectId } }),
    prisma.laborEntry.findMany({ where: { projectId } }),
    prisma.equipmentUsageLog.findMany({ where: { projectId } }),
  ]);

  const revenue = invoices.reduce((s, i) => s + i.subtotal, 0);
  const purchaseCost = bills.reduce((s, b) => s + b.subtotal, 0);
  const expenseCost = expenses.reduce((s, e) => s + e.amount, 0);
  const laborCost = labor.reduce((s, l) => s + l.amount, 0);
  const equipmentCost = equipment.reduce((s, e) => s + e.cost, 0);
  const totalCost = purchaseCost + expenseCost + laborCost + equipmentCost;

  res.json({
    revenue,
    costs: { purchases: purchaseCost, expenses: expenseCost, labor: laborCost, equipment: equipmentCost, total: totalCost },
    margin: revenue - totalCost,
    marginPercent: revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0,
  });
}));

// ---- Subcontractors & Equipment masters ----
router.get('/masters/subcontractors', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const subcontractors = await prisma.subcontractor.findMany({ orderBy: { name: 'asc' } });
  res.json({ subcontractors });
}));

router.post('/masters/subcontractors', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(1), trade: z.string().optional(), contact: z.string().optional() });
  const data = schema.parse(req.body);
  const subcontractor = await prisma.subcontractor.create({ data });
  res.status(201).json({ subcontractor });
}));

router.get('/masters/equipment', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const equipment = await prisma.equipment.findMany({ orderBy: { name: 'asc' } });
  res.json({ equipment });
}));

router.post('/masters/equipment', requireRole(...MANAGE_PROJECTS), asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(1), type: z.string().optional(), ownedOrRented: z.enum(['OWNED', 'RENTED']).optional() });
  const data = schema.parse(req.body);
  const equipment = await prisma.equipment.create({ data });
  res.status(201).json({ equipment });
}));

export default router;
