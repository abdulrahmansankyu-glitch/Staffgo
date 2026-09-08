import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

router.get('/stock-levels', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const stocks = await prisma.itemWarehouseStock.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    include: { item: true, warehouse: true },
    orderBy: { item: { name: 'asc' } },
  });
  res.json({ stocks });
}));

router.get('/low-stock', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const stocks = await prisma.itemWarehouseStock.findMany({
    include: { item: true, warehouse: true },
  });
  const low = stocks.filter((s) => s.reorderLevel > 0 && s.qtyOnHand <= s.reorderLevel);
  res.json({ lowStock: low });
}));

router.get('/ledger', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const itemId = req.query.itemId as string | undefined;
  const warehouseId = req.query.warehouseId as string | undefined;
  const entries = await prisma.stockLedgerEntry.findMany({
    where: { itemId, warehouseId },
    include: { item: true, warehouse: true },
    orderBy: { date: 'desc' },
    take: 500,
  });
  res.json({ entries });
}));

// Weighted-average stock valuation: for each item/warehouse, average cost
// from IN-direction ledger entries x current qty on hand.
router.get('/valuation', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const stocks = await prisma.itemWarehouseStock.findMany({ include: { item: true, warehouse: true } });

  const results = [];
  for (const stock of stocks) {
    const inEntries = await prisma.stockLedgerEntry.findMany({
      where: { itemId: stock.itemId, warehouseId: stock.warehouseId, direction: 'IN' },
    });
    const totalInQty = inEntries.reduce((sum, e) => sum + e.qty, 0);
    const totalInCost = inEntries.reduce((sum, e) => sum + e.qty * e.unitCost, 0);
    const avgCost = totalInQty > 0 ? totalInCost / totalInQty : 0;
    results.push({
      itemId: stock.itemId,
      itemName: stock.item.name,
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      qtyOnHand: stock.qtyOnHand,
      avgCost,
      value: stock.qtyOnHand * avgCost,
    });
  }
  res.json({ valuation: results, totalValue: results.reduce((s, r) => s + r.value, 0) });
}));

export default router;
