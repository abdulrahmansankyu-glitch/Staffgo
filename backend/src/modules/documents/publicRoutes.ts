import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../middleware/errorHandler';
import { renderTemplate, htmlToPdfBuffer } from '../../lib/pdf';
import { QUOTATION_TEMPLATE, INVOICE_TEMPLATE, PDF_HEADER_TEMPLATE, PDF_FOOTER_TEMPLATE, PDF_MARGINS } from './templates';
import { getCompanySettings, settingsForPdf } from '../../lib/companySettings';
import { buildQuotationTemplateData } from '../sales/quotations';

const router = Router();

const quotationInclude = {
  customer: true,
  lines: { include: { item: true } },
  phases: { orderBy: { order: 'asc' as const } },
  escalationLines: { orderBy: { order: 'asc' as const } },
};

// Public, unauthenticated: minimal branding (name + logo) for the login screen,
// shown before anyone has a session.
router.get('/branding', asyncHandler(async (_req, res) => {
  const settings = await getCompanySettings();
  res.json({ name: settings.name, logoUrl: settings.logoUrl });
}));

// Public, unauthenticated: resolves a share slug to a read-only rendered
// document. Safe to send over WhatsApp/email since it only exposes one document.
router.get('/documents/:slug', asyncHandler(async (req, res) => {
  const link = await prisma.shareLink.findUnique({ where: { slug: req.params.slug } });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return res.status(410).json({ error: 'This link has expired' });
  }

  await prisma.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } });
  const settings = await getCompanySettings();

  if (link.documentType === 'QUOTATION' && link.quotationId) {
    const quotation = await prisma.quotation.findUnique({ where: { id: link.quotationId }, include: quotationInclude });
    if (!quotation) return res.status(404).json({ error: 'Document not found' });
    return res.json({ documentType: 'QUOTATION', ...buildQuotationTemplateData(quotation, settings) });
  }

  if (link.documentType === 'INVOICE' && link.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: link.invoiceId },
      include: { customer: true, lines: { include: { item: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Document not found' });
    return res.json({
      documentType: 'INVOICE',
      invoice: { ...invoice, balanceDue: invoice.total - invoice.amountPaid },
      customer: invoice.customer,
      lines: invoice.lines,
      settings,
    });
  }

  res.status(404).json({ error: 'Document not found' });
}));

router.get('/documents/:slug/pdf', asyncHandler(async (req, res) => {
  const link = await prisma.shareLink.findUnique({ where: { slug: req.params.slug } });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  const settings = await getCompanySettings();
  const pdfOptions = {
    headerTemplate: renderTemplate(PDF_HEADER_TEMPLATE, { settings: settingsForPdf(settings) }),
    footerTemplate: PDF_FOOTER_TEMPLATE,
    margin: PDF_MARGINS,
  };

  if (link.documentType === 'QUOTATION' && link.quotationId) {
    const quotation = await prisma.quotation.findUnique({ where: { id: link.quotationId }, include: quotationInclude });
    if (!quotation) return res.status(404).json({ error: 'Document not found' });
    const html = renderTemplate(QUOTATION_TEMPLATE, buildQuotationTemplateData(quotation, settings));
    const buffer = await htmlToPdfBuffer(html, pdfOptions);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(buffer);
  }

  if (link.documentType === 'INVOICE' && link.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: link.invoiceId },
      include: { customer: true, lines: { include: { item: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Document not found' });
    const html = renderTemplate(INVOICE_TEMPLATE, {
      invoice: { ...invoice, balanceDue: invoice.total - invoice.amountPaid },
      customer: invoice.customer,
      lines: invoice.lines,
      settings,
    });
    const buffer = await htmlToPdfBuffer(html, pdfOptions);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(buffer);
  }

  res.status(404).json({ error: 'Document not found' });
}));

export default router;
