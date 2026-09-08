import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';
import { MANAGE_FINANCE, READ_ONLY_FINANCE_VIEW } from '../../lib/roles';

const router = Router();
router.use(requireAuth);

// ---- Expenses ----
const expenseSchema = z.object({
  category: z.string().min(1),
  projectId: z.string().optional(),
  date: z.coerce.date().optional(),
  amount: z.number().positive(),
  vatAmount: z.number().nonnegative().optional(),
  paidFrom: z.enum(['BANK', 'CASH']).optional(),
  description: z.string().optional(),
});

router.get('/expenses', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (_req, res) => {
  const expenses = await prisma.expense.findMany({ include: { project: true }, orderBy: { date: 'desc' } });
  res.json({ expenses });
}));

router.post('/expenses', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const data = expenseSchema.parse(req.body);
  const expense = await prisma.expense.create({ data });
  res.status(201).json({ expense });
}));

// ---- Ledger accounts ----
router.get('/ledger-accounts', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (_req, res) => {
  const accounts = await prisma.ledgerAccount.findMany({ orderBy: { name: 'asc' } });
  res.json({ accounts });
}));

router.post('/ledger-accounts', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(1), type: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY']) });
  const data = schema.parse(req.body);
  const account = await prisma.ledgerAccount.create({ data });
  res.status(201).json({ account });
}));

router.post('/ledger-entries', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const schema = z.object({
    accountId: z.string(), date: z.coerce.date().optional(),
    debit: z.number().nonnegative().optional(), credit: z.number().nonnegative().optional(),
  });
  const data = schema.parse(req.body);
  const entry = await prisma.ledgerEntry.create({ data });
  res.status(201).json({ entry });
}));

router.get('/ledger-entries', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (req, res) => {
  const accountId = req.query.accountId as string | undefined;
  const entries = await prisma.ledgerEntry.findMany({
    where: accountId ? { accountId } : undefined,
    include: { account: true },
    orderBy: { date: 'desc' },
    take: 500,
  });
  res.json({ entries });
}));

// ---- Bank accounts & reconciliation ----
router.get('/bank-accounts', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (_req, res) => {
  const accounts = await prisma.bankAccount.findMany({ orderBy: { name: 'asc' } });
  res.json({ accounts });
}));

router.post('/bank-accounts', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const schema = z.object({ name: z.string().min(1), bank: z.string().optional(), currency: z.string().optional() });
  const data = schema.parse(req.body);
  const account = await prisma.bankAccount.create({ data });
  res.status(201).json({ account });
}));

router.post('/bank-accounts/:id/transactions', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const schema = z.object({ date: z.coerce.date().optional(), amount: z.number(), description: z.string().optional() });
  const data = schema.parse(req.body);
  const transaction = await prisma.bankTransaction.create({ data: { ...data, bankAccountId: req.params.id } });
  res.status(201).json({ transaction });
}));

router.get('/bank-accounts/:id/transactions', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (req, res) => {
  const transactions = await prisma.bankTransaction.findMany({ where: { bankAccountId: req.params.id }, orderBy: { date: 'desc' } });
  res.json({ transactions });
}));

router.patch('/bank-transactions/:id/reconcile', requireRole(...MANAGE_FINANCE), asyncHandler(async (req, res) => {
  const schema = z.object({ matchedPaymentId: z.string().optional() });
  const data = schema.parse(req.body);
  const transaction = await prisma.bankTransaction.update({
    where: { id: req.params.id },
    data: { reconciled: true, matchedPaymentId: data.matchedPaymentId },
  });
  res.json({ transaction });
}));

// ---- VAT report: output VAT (sales invoices) vs input VAT (purchase bills), by date range ----
router.get('/vat-report', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();

  const [invoices, bills] = await Promise.all([
    prisma.invoice.findMany({ where: { invoiceDate: { gte: from, lte: to }, status: { not: 'DRAFT' } } }),
    prisma.purchaseBill.findMany({ where: { billDate: { gte: from, lte: to } } }),
  ]);

  const outputVat = invoices.reduce((s, i) => s + i.vatAmount, 0);
  const inputVat = bills.reduce((s, b) => s + b.vatAmount, 0);

  res.json({
    period: { from, to },
    outputVat,
    inputVat,
    netVatPayable: outputVat - inputVat,
    salesSubtotal: invoices.reduce((s, i) => s + i.subtotal, 0),
    purchasesSubtotal: bills.reduce((s, b) => s + b.subtotal, 0),
  });
}));

// ---- Overall & per-project P&L ----
router.get('/pnl', requireRole(...READ_ONLY_FINANCE_VIEW), asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();

  const [invoices, bills, expenses] = await Promise.all([
    prisma.invoice.findMany({ where: { invoiceDate: { gte: from, lte: to }, status: { not: 'DRAFT' } } }),
    prisma.purchaseBill.findMany({ where: { billDate: { gte: from, lte: to } } }),
    prisma.expense.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const revenue = invoices.reduce((s, i) => s + i.subtotal, 0);
  const cogs = bills.reduce((s, b) => s + b.subtotal, 0);
  const operatingExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = revenue - cogs - operatingExpenses;

  res.json({ period: { from, to }, revenue, cogs, operatingExpenses, netProfit });
}));

export default router;
