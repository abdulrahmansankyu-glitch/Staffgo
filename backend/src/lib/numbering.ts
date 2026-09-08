import { prisma } from './prisma';
import { getCompanySettings } from './companySettings';

type DocType = 'QUOTATION' | 'SALES_ORDER' | 'INVOICE' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'MATERIAL_REQUEST'
  | 'CLIENT_INQUIRY' | 'SUPPLIER_INQUIRY' | 'SUPPLIER_QUOTATION' | 'CUSTOMER_PO';

const PREFIX_FIELD: Record<DocType, string> = {
  QUOTATION: 'quotationPrefix',
  SALES_ORDER: 'salesOrderPrefix',
  INVOICE: 'invoicePrefix',
  DELIVERY_NOTE: 'deliveryNotePrefix',
  PURCHASE_ORDER: 'purchaseOrderPrefix',
  PURCHASE_BILL: 'purchaseBillPrefix',
  MATERIAL_REQUEST: 'materialRequestPrefix',
  CLIENT_INQUIRY: 'clientInquiryPrefix',
  SUPPLIER_INQUIRY: 'supplierInquiryPrefix',
  SUPPLIER_QUOTATION: 'supplierQuotationPrefix',
  CUSTOMER_PO: 'customerPoPrefix',
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Atomically increments the per-month counter for a doc type and returns a
// formatted, sequential, gap-free document number, e.g. STG-JAN-2026-005.
// Sequential numbering is required for VAT-compliant invoices in KSA/UAE.
export async function nextDocumentNumber(docType: DocType): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const settings = await getCompanySettings();
  const prefix = (settings as unknown as Record<string, string>)[PREFIX_FIELD[docType]];

  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentCounter.findUnique({
      where: { docType_year_month: { docType, year, month } },
    });

    if (!existing) {
      return tx.documentCounter.create({ data: { docType, year, month, lastNumber: 1 } });
    }

    return tx.documentCounter.update({
      where: { id: existing.id },
      data: { lastNumber: existing.lastNumber + 1 },
    });
  });

  const seq = String(counter.lastNumber).padStart(3, '0');
  return `${prefix}-${MONTHS[month - 1]}-${year}-${seq}`;
}
