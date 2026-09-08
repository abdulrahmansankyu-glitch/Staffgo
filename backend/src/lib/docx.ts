import HTMLtoDOCX from 'html-to-docx';

export async function htmlToDocxBuffer(html: string): Promise<Buffer> {
  return HTMLtoDOCX(html, null, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 }, // twentieths of a point (720 = 0.5in)
    font: 'Arial',
    fontSize: 22, // half-points (22 = 11pt)
  });
}
