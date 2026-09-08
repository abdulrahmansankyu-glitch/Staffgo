import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export interface StockMoveInput {
  itemId: string;
  warehouseId: string;
  direction: 'IN' | 'OUT';
  qty: number;
  unit: string;
  unitCost?: number;
  refType: string;
  refId?: string;
}

// Writes one ledger entry and updates the cached ItemWarehouseStock balance
// atomically. Called inside a $transaction from delivery notes, purchase
// bills, and material request fulfillment so stock never drifts from the ledger.
export async function postStockMove(tx: Tx, move: StockMoveInput) {
  await tx.stockLedgerEntry.create({
    data: {
      itemId: move.itemId,
      warehouseId: move.warehouseId,
      direction: move.direction,
      qty: move.qty,
      unit: move.unit,
      unitCost: move.unitCost ?? 0,
      refType: move.refType,
      refId: move.refId,
    },
  });

  const delta = move.direction === 'IN' ? move.qty : -move.qty;

  const existing = await tx.itemWarehouseStock.findUnique({
    where: { itemId_warehouseId: { itemId: move.itemId, warehouseId: move.warehouseId } },
  });

  if (existing) {
    await tx.itemWarehouseStock.update({
      where: { id: existing.id },
      data: { qtyOnHand: existing.qtyOnHand + delta },
    });
  } else {
    await tx.itemWarehouseStock.create({
      data: { itemId: move.itemId, warehouseId: move.warehouseId, qtyOnHand: delta },
    });
  }
}
