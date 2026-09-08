import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { postStockMove } from '../inventory/stockService';
import { renderTemplate, htmlToPdfBuffer } from '../../lib/pdf';
import { DELIVERY_NOTE_TEMPLATE, PDF_HEADER_TEMPLATE, PDF_FOOTER_TEMPLATE, PDF_MARGINS } from '../documents/templates';
import { getCompanySettings, settingsForPdf } from '../../lib/companySettings';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({ itemId: z.string(), qty: z.number().positive(), unit: z.string().min(1) });

const deliveryNoteSchema = z.object({
  customerId: z.string(),
  salesOrderId: z.string().optional(),
  warehouseId: z.string(),
  lines: z.array(lineSchema).min(1),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const deliveryNotes = await prisma.deliveryNote.findMany({
    include: { customer: true, warehouse: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ deliveryNotes });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id: req.params.id },
    include: { customer: true, warehouse: true, lines: { include: { item: true } } },
  });
  if (!deliveryNote) return res.status(404).json({ error: 'Delivery note not found' });
  res.json({ deliveryNote });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = deliveryNoteSchema.parse(req.body);
  const number = await nextDocumentNumber('DELIVERY_NOTE');

  const deliveryNote = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryNote.create({
      data: {
        number,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId,
        warehouseId: data.warehouseId,
        status: 'SENT',
        lines: { create: data.lines },
      },
      include: { lines: true },
    });

    for (const line of created.lines) {
      await postStockMove(tx, {
        itemId: line.itemId,
        warehouseId: data.warehouseId,
        direction: 'OUT',
        qty: line.qty,
        unit: line.unit,
        refType: 'DELIVERY_NOTE',
        refId: created.id,
      });
    }

    return created;
  });

  res.status(201).json({ deliveryNote });
}));

router.get('/:id/pdf', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id: req.params.id },
    include: { customer: true, warehouse: true, lines: { include: { item: true } } },
  });
  if (!deliveryNote) return res.status(404).json({ error: 'Delivery note not found' });
  const settings = await getCompanySettings();

  const html = renderTemplate(DELIVERY_NOTE_TEMPLATE, {
    deliveryNote,
    customer: deliveryNote.customer,
    warehouse: deliveryNote.warehouse,
    lines: deliveryNote.lines,
    settings,
  });
  const buffer = await htmlToPdfBuffer(html, {
    headerTemplate: renderTemplate(PDF_HEADER_TEMPLATE, { settings: settingsForPdf(settings) }),
    footerTemplate: PDF_FOOTER_TEMPLATE,
    margin: PDF_MARGINS,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${deliveryNote.number}.pdf"`);
  res.send(buffer);
}));

export default router;
