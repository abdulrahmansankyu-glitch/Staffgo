import { config } from '../../config';

export interface LineInput {
  itemId?: string;
  description?: string;
  note?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  vatRate?: number;
}

export interface ComputedLine extends LineInput {
  vatRate: number;
  lineTotal: number;
}

export interface Totals {
  subtotal: number;
  vatAmount: number;
  total: number;
  lines: ComputedLine[];
}

// Shared subtotal/VAT/total computation used by quotations, sales orders,
// invoices, purchase orders and purchase bills so VAT math stays consistent.
export function computeTotals(lines: LineInput[]): Totals {
  let subtotal = 0;
  let vatAmount = 0;
  const computed: ComputedLine[] = lines.map((line) => {
    const vatRate = line.vatRate ?? config.defaultVatRate;
    const base = line.qty * line.unitPrice;
    const vat = base * (vatRate / 100);
    subtotal += base;
    vatAmount += vat;
    return { ...line, vatRate, lineTotal: base };
  });
  return { subtotal, vatAmount, total: subtotal + vatAmount, lines: computed };
}
