import puppeteer, { Browser } from 'puppeteer';
import Handlebars from 'handlebars';

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
  return browserPromise;
}

Handlebars.registerHelper('money', (value: number) =>
  (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
);
Handlebars.registerHelper('date', (value: string | Date) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});
Handlebars.registerHelper('inc', (index: number) => index + 1);

export function renderTemplate(templateSource: string, data: Record<string, unknown>): string {
  const template = Handlebars.compile(templateSource);
  return template(data);
}

export interface PdfOptions {
  headerTemplate?: string;
  footerTemplate?: string;
  margin?: { top: string; bottom: string; left: string; right: string };
}

export async function htmlToPdfBuffer(html: string, options?: PdfOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const hasCustomChrome = Boolean(options?.headerTemplate || options?.footerTemplate);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: options?.margin ?? { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: hasCustomChrome,
      headerTemplate: options?.headerTemplate ?? '<div></div>',
      footerTemplate: options?.footerTemplate ?? '<div></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}
