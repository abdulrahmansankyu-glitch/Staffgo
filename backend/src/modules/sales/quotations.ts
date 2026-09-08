import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { ALL_ROLES, MANAGE_SALES } from '../../lib/roles';
import { nextDocumentNumber } from '../../lib/numbering';
import { computeTotals } from './lineHelpers';
import { renderTemplate, htmlToPdfBuffer } from '../../lib/pdf';
import { htmlToDocxBuffer } from '../../lib/docx';
import { generateSlug, generateToken } from '../../lib/share';
import { QUOTATION_TEMPLATE, QUOTATION_TEMPLATE_DOCX, PDF_HEADER_TEMPLATE, PDF_FOOTER_TEMPLATE, PDF_MARGINS } from '../documents/templates';
import { getCompanySettings, settingsForPdf } from '../../lib/companySettings';
import fs from 'fs';
import path from 'path';

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

const phaseSchema = z.object({ text: z.string().min(1) });
const escalationSchema = z.object({ description: z.string().min(1), additionalPrice: z.string().min(1), notes: z.string().optional() });

const quotationSchema = z.object({
  customerId: z.string(),
  projectId: z.string().optional(),
  inquiryId: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  projectTitle: z.string().optional(),
  location: z.string().optional(),
  validityText: z.string().optional(),
  leadTimeText: z.string().optional(),
  scopeIntro: z.string().optional(),
  scopeItems: z.string().optional(),
  furtherDetails: z.string().optional(),
  exclusionsIntro: z.string().optional(),
  exclusionsItems: z.string().optional(),
  technicalSpecs: z.string().optional(),
  termsText: z.string().optional(),
  paymentTerms: z.string().optional(),
  lines: z.array(lineSchema).min(1),
  phases: z.array(phaseSchema).optional(),
  escalationLines: z.array(escalationSchema).optional(),
});

const quotationInclude = {
  customer: true,
  project: true,
  lines: { include: { item: true } },
  phases: { orderBy: { order: 'asc' as const } },
  escalationLines: { orderBy: { order: 'asc' as const } },
};

router.get('/', requireRole(...ALL_ROLES), asyncHandler(async (_req, res) => {
  const quotations = await prisma.quotation.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ quotations });
}));

router.get('/:id', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  res.json({ quotation });
}));

router.post('/', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = quotationSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);
  const number = await nextDocumentNumber('QUOTATION');

  const quotation = await prisma.$transaction(async (tx) => {
    const created = await tx.quotation.create({
      data: {
        number,
        customerId: data.customerId,
        projectId: data.projectId,
        inquiryId: data.inquiryId,
        validUntil: data.validUntil,
        projectTitle: data.projectTitle,
        location: data.location,
        validityText: data.validityText,
        leadTimeText: data.leadTimeText,
        scopeIntro: data.scopeIntro,
        scopeItems: data.scopeItems,
        furtherDetails: data.furtherDetails,
        exclusionsIntro: data.exclusionsIntro,
        exclusionsItems: data.exclusionsItems,
        technicalSpecs: data.technicalSpecs,
        termsText: data.termsText,
        paymentTerms: data.paymentTerms,
        subtotal,
        vatAmount,
        total,
        lines: { create: lines },
        phases: data.phases ? { create: data.phases.map((p, i) => ({ order: i + 1, text: p.text })) } : undefined,
        escalationLines: data.escalationLines ? { create: data.escalationLines.map((e, i) => ({ ...e, order: i + 1 })) } : undefined,
      },
      include: quotationInclude,
    });
    if (data.inquiryId) {
      await tx.clientInquiry.update({ where: { id: data.inquiryId }, data: { status: 'QUOTED' } });
    }
    return created;
  });
  res.status(201).json({ quotation });
}));

// Full replace of a draft quotation's content (masters + lines + phases + escalation table).
router.patch('/:id', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const data = quotationSchema.parse(req.body);
  const { subtotal, vatAmount, total, lines } = computeTotals(data.lines);

  const quotation = await prisma.$transaction(async (tx) => {
    await tx.quotationLine.deleteMany({ where: { quotationId: req.params.id } });
    await tx.quotationPhase.deleteMany({ where: { quotationId: req.params.id } });
    await tx.quotationEscalationLine.deleteMany({ where: { quotationId: req.params.id } });

    return tx.quotation.update({
      where: { id: req.params.id },
      data: {
        customerId: data.customerId,
        projectId: data.projectId,
        validUntil: data.validUntil,
        projectTitle: data.projectTitle,
        location: data.location,
        validityText: data.validityText,
        leadTimeText: data.leadTimeText,
        scopeIntro: data.scopeIntro,
        scopeItems: data.scopeItems,
        furtherDetails: data.furtherDetails,
        exclusionsIntro: data.exclusionsIntro,
        exclusionsItems: data.exclusionsItems,
        technicalSpecs: data.technicalSpecs,
        termsText: data.termsText,
        paymentTerms: data.paymentTerms,
        subtotal,
        vatAmount,
        total,
        lines: { create: lines },
        phases: data.phases ? { create: data.phases.map((p, i) => ({ order: i + 1, text: p.text })) } : undefined,
        escalationLines: data.escalationLines ? { create: data.escalationLines.map((e, i) => ({ ...e, order: i + 1 })) } : undefined,
      },
      include: quotationInclude,
    });
  });

  res.json({ quotation });
}));

router.patch('/:id/status', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const schema = z.object({ status: z.enum(['DRAFT', 'SENT', 'VOID']) });
  const { status } = schema.parse(req.body);
  const quotation = await prisma.quotation.update({ where: { id: req.params.id }, data: { status } });
  res.json({ quotation });
}));

router.post('/:id/convert-to-order', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { lines: true } });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

  const number = await nextDocumentNumber('SALES_ORDER');
  const salesOrder = await prisma.salesOrder.create({
    data: {
      number,
      quotationId: quotation.id,
      customerId: quotation.customerId,
      projectId: quotation.projectId,
      subtotal: quotation.subtotal,
      vatAmount: quotation.vatAmount,
      total: quotation.total,
      lines: {
        create: quotation.lines.map((l) => ({
          itemId: l.itemId,
          description: l.description,
          note: l.note,
          qty: l.qty,
          unit: l.unit,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          lineTotal: l.lineTotal,
        })),
      },
    },
  });
  await prisma.quotation.update({ where: { id: quotation.id }, data: { status: 'CONVERTED' } });
  res.status(201).json({ salesOrder });
}));

router.get('/:id/pdf', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  const settings = await getCompanySettings();

  const html = renderTemplate(QUOTATION_TEMPLATE, buildQuotationTemplateData(quotation, settings));
  const buffer = await htmlToPdfBuffer(html, {
    headerTemplate: renderTemplate(PDF_HEADER_TEMPLATE, { settings: settingsForPdf(settings) }),
    footerTemplate: PDF_FOOTER_TEMPLATE,
    margin: PDF_MARGINS,
  });

  const dir = path.join(__dirname, '..', '..', '..', 'uploads', 'pdf', 'quotation');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${quotation.number}.pdf`), buffer);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${quotation.number}.pdf"`);
  res.send(buffer);
}));

router.get('/:id/docx', requireRole(...ALL_ROLES), asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  const settings = settingsForPdf(await getCompanySettings());

  const html = renderTemplate(QUOTATION_TEMPLATE_DOCX, buildQuotationTemplateData(quotation, settings));
  const buffer = await htmlToDocxBuffer(html);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${quotation.number}.docx"`);
  res.send(buffer);
}));

router.post('/:id/share', requireRole(...MANAGE_SALES), asyncHandler(async (req, res) => {
  const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

  const slug = generateSlug();
  const token = generateToken();
  await prisma.shareLink.create({
    data: { documentType: 'QUOTATION', quotationId: quotation.id, slug, token },
  });
  res.status(201).json({ url: `/s/${slug}` });
}));

// Splits a newline-separated bullet field into {label?, text} parts, bolding
// a leading "Label: text" segment (used for Technical Specs / Payment Terms).
export function splitBullets(value: string | null | undefined): { label?: string; text: string }[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([^:]{1,60}):\s*(.+)$/);
      if (match) return { label: match[1], text: match[2] };
      return { text: line };
    });
}

export function buildQuotationTemplateData(quotation: any, settings: any) {
  return {
    quotation,
    settings,
    customer: quotation.customer,
    lines: quotation.lines,
    phases: quotation.phases,
    escalationLines: quotation.escalationLines,
    scopeItems: splitBullets(quotation.scopeItems),
    exclusionsItems: splitBullets(quotation.exclusionsItems),
    technicalSpecs: splitBullets(quotation.technicalSpecs),
    furtherDetails: splitBullets(quotation.furtherDetails),
    termsItems: splitBullets(quotation.termsText),
    paymentTermsItems: splitBullets(quotation.paymentTerms),
  };
}

export default router;
