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

const itemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  baseUnit: z.string().min(1),
  costingMethod: z.string().optional(),
  units: z.array(z.object({ unitName: z.string().min(1), conversionFactorToBase: z.number().positive() })).optional(),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const q = (req.query.q as string) || '';
  const items = await prisma.item.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : undefined,
    include: { units: true },
    orderBy: { name: 'asc' },
  });
  res.json({ items });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const item = await prisma.item.findUnique({
    where: { id: req.params.id },
    include: { units: true, warehouseStocks: { include: { warehouse: true } } },
  });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ item });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const { units, ...data } = itemSchema.parse(req.body);
  const item = await prisma.item.create({
    data: { ...data, units: units ? { create: units } : undefined },
    include: { units: true },
  });
  res.status(201).json({ item });
}));

router.patch('/:id', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const { units, ...data } = itemSchema.partial().parse(req.body);
  const item = await prisma.item.update({ where: { id: req.params.id }, data });
  if (units) {
    await prisma.itemUnit.deleteMany({ where: { itemId: req.params.id } });
    await prisma.itemUnit.createMany({ data: units.map((u) => ({ ...u, itemId: req.params.id })) });
  }
  res.json({ item });
}));

router.delete('/:id', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Block deletion if the item has any real transactional history — only
  // unused items (never quoted, ordered, delivered, or stocked) can be removed.
  const [rateHistory, qLines, soLines, invLines, dnLines, poLines, pbLines, mrLines, stockEntries, stocks] = await Promise.all([
    prisma.supplierRateHistory.count({ where: { itemId: id } }),
    prisma.quotationLine.count({ where: { itemId: id } }),
    prisma.salesOrderLine.count({ where: { itemId: id } }),
    prisma.invoiceLine.count({ where: { itemId: id } }),
    prisma.deliveryNoteLine.count({ where: { itemId: id } }),
    prisma.purchaseOrderLine.count({ where: { itemId: id } }),
    prisma.purchaseBillLine.count({ where: { itemId: id } }),
    prisma.materialRequestLine.count({ where: { itemId: id } }),
    prisma.stockLedgerEntry.count({ where: { itemId: id } }),
    prisma.itemWarehouseStock.count({ where: { itemId: id } }),
  ]);
  const inUse = rateHistory + qLines + soLines + invLines + dnLines + poLines + pbLines + mrLines + stockEntries + stocks;
  if (inUse > 0) {
    return res.status(409).json({ error: 'This item is used in existing quotations, orders, invoices, or stock records and cannot be deleted.' });
  }

  await prisma.itemUnit.deleteMany({ where: { itemId: id } });
  await prisma.item.delete({ where: { id } });
  res.json({ ok: true });
}));

router.post('/import', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ rows: z.array(z.record(z.string())) });
  const { rows } = schema.parse(req.body);

  interface Row { sku: string; name: string; category?: string; baseUnit: string }
  const result = await bulkImport<Row>(
    rows,
    (row) => {
      if (!row.sku?.trim() || !row.name?.trim() || !row.baseunit?.trim()) {
        return { skip: 'Missing sku, name, or baseUnit' };
      }
      return {
        sku: row.sku.trim(),
        name: row.name.trim(),
        category: row.category || undefined,
        baseUnit: row.baseunit.trim(),
      };
    },
    (data) => prisma.item.create({ data })
  );
  res.json(result);
}));

export default router;
