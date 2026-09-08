declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    orientation?: 'portrait' | 'landscape';
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    title?: string;
    font?: string;
    fontSize?: number;
  }
  function HTMLtoDOCX(
    htmlString: string,
    headerHtmlString?: string | null,
    options?: HtmlToDocxOptions,
    footerHtmlString?: string | null
  ): Promise<Buffer>;
  export default HTMLtoDOCX;
}
