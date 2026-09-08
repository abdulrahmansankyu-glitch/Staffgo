import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_PURCHASING } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { computeTotals } from '../sales/lineHelpers';
import { renderTemplate, htmlToPdfBuffer } from '../../lib/pdf';
import { PURCHASE_ORDER_TEMPLATE, PDF_HEADER_TEMPLATE, PDF_FOOTER_TEMPLATE, PDF_MARGINS } from '../documents/templates';
import { getCompanySettings, settingsForPdf } from '../../lib/companySettings';

const router = Router();
router.use(requireAuth);

const lineSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  qty: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().optional(),
});

const poSchema = z.object({
  supplierId: z.string(),
  projectId: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ purchaseOrders });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, lines: { include: { item: true } }, bills: true },
  });
  if (!purchaseOrder) return res.status(404).json({ error: 'Purchase order not found' });
  res.json({ purchaseOrder });
}));

router.post('/', requireRole(...MANAGE_PURCHASING), asyncHandler(async (req, res) => {
  const data = poSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);
  const number = await nextDocumentNumber('PURCHASE_ORDER');

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      number,
      supplierId: data.supplierId,
      projectId: data.projectId,
      subtotal,
      vatAmount,
      total,
      lines: { create: lines },
    },
    include: { lines: true },
  });
  res.status(201).json({ purchaseOrder });
}));

router.get('/:id/pdf', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, lines: { include: { item: true } } },
  });
  if (!purchaseOrder) return res.status(404).json({ error: 'Purchase order not found' });
  const settings = await getCompanySettings();

  const html = renderTemplate(PURCHASE_ORDER_TEMPLATE, {
    purchaseOrder,
    supplier: purchaseOrder.supplier,
    lines: purchaseOrder.lines,
    settings,
  });
  const buffer = await htmlToPdfBuffer(html, {
    headerTemplate: renderTemplate(PDF_HEADER_TEMPLATE, { settings: settingsForPdf(settings) }),
    footerTemplate: PDF_FOOTER_TEMPLATE,
    margin: PDF_MARGINS,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${purchaseOrder.number}.pdf"`);
  res.send(buffer);
}));

export default router;
