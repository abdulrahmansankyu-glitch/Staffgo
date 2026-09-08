import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';

// Singleton row (id "default") — created with schema defaults on first access.
export async function getCompanySettings() {
  const existing = await prisma.companySettings.findUnique({ where: { id: 'default' } });
  if (existing) return existing;
  return prisma.companySettings.create({ data: { id: 'default' } });
}

const MIME_BY_EXT: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

// Puppeteer renders PDFs from an in-memory HTML string with no base URL, so a
// relative /uploads/... <img src> never resolves. Inline the logo as a data
// URI instead so it renders identically in the PDF regardless of context.
export function settingsForPdf<T extends { logoUrl?: string | null }>(settings: T): T {
  if (!settings.logoUrl || !settings.logoUrl.startsWith('/uploads/')) return settings;
  try {
    const filePath = path.join(__dirname, '..', '..', 'uploads', settings.logoUrl.replace(/^\/uploads\//, ''));
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'image/png';
    const base64 = fs.readFileSync(filePath).toString('base64');
    return { ...settings, logoUrl: `data:${mime};base64,${base64}` };
  } catch {
    return { ...settings, logoUrl: undefined };
  }
}
