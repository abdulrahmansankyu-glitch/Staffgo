import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { postStockMove } from './stockService';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  itemId: z.string().optional(),
  itemName: z.string().optional(),
  qtyRequested: z.number().positive(),
  unit: z.string().min(1),
}).refine((l) => l.itemId || l.itemName, { message: 'Select an item or type a material name' });
const createSchema = z.object({ siteId: z.string(), lines: z.array(lineSchema).min(1) });

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const materialRequests = await prisma.materialRequest.findMany({
    include: { site: true, requestedBy: { select: { id: true, name: true } }, lines: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ materialRequests });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const materialRequest = await prisma.materialRequest.findUnique({
    where: { id: req.params.id },
    include: { site: true, requestedBy: { select: { id: true, name: true } }, lines: { include: { item: true } } },
  });
  if (!materialRequest) return res.status(404).json({ error: 'Material request not found' });
  res.json({ materialRequest });
}));

router.post('/', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const number = await nextDocumentNumber('MATERIAL_REQUEST');

  const materialRequest = await prisma.materialRequest.create({
    data: {
      number,
      siteId: data.siteId,
      requestedById: req.user!.id,
      lines: { create: data.lines },
    },
    include: { lines: true },
  });
  res.status(201).json({ materialRequest });
}));

router.patch('/:id/approve', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({
    lines: z.array(z.object({ id: z.string(), qtyApproved: z.number().nonnegative() })),
  });
  const data = schema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    for (const line of data.lines) {
      await tx.materialRequestLine.update({ where: { id: line.id }, data: { qtyApproved: line.qtyApproved } });
    }
    await tx.materialRequest.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } });
  });

  const materialRequest = await prisma.materialRequest.findUnique({
    where: { id: req.params.id },
    include: { lines: { include: { item: true } } },
  });
  res.json({ materialRequest });
}));

router.post('/:id/fulfill', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ fromWarehouseId: z.string() });
  const { fromWarehouseId } = schema.parse(req.body);

  const materialRequest = await prisma.materialRequest.findUnique({
    where: { id: req.params.id },
    include: { lines: true },
  });
  if (!materialRequest) return res.status(404).json({ error: 'Material request not found' });
  if (materialRequest.status !== 'APPROVED') {
    return res.status(400).json({ error: 'Only approved requests can be fulfilled' });
  }

  await prisma.$transaction(async (tx) => {
    for (const line of materialRequest.lines) {
      const qty = line.qtyApproved ?? 0;
      if (qty <= 0 || !line.itemId) continue; // manually-typed materials aren't in the item catalog, so there's no stock to move
      await postStockMove(tx, {
        itemId: line.itemId, warehouseId: fromWarehouseId, direction: 'OUT', qty, unit: line.unit,
        refType: 'MATERIAL_REQUEST', refId: materialRequest.id,
      });
      await postStockMove(tx, {
        itemId: line.itemId, warehouseId: materialRequest.siteId, direction: 'IN', qty, unit: line.unit,
        refType: 'MATERIAL_REQUEST', refId: materialRequest.id,
      });
    }
    await tx.materialRequest.update({ where: { id: materialRequest.id }, data: { status: 'FULFILLED' } });
  });

  res.json({ ok: true });
}));

router.patch('/:id/reject', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const materialRequest = await prisma.materialRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  res.json({ materialRequest });
}));

export default router;
