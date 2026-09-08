export const PDF_MARGINS = { top: '34mm', bottom: '14mm', left: '15mm', right: '15mm' };

// Repeats on every page via Puppeteer's native header/footer chrome — this is
// how the branded top band (contact info + logo) and bottom accent bar repeat
// across a multi-page document, matching the reference StaffGo quote format.
export const PDF_HEADER_TEMPLATE = `
<div style="width:100%; font-family: Arial, Helvetica, sans-serif; box-sizing:border-box; padding:4mm 15mm 0;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div style="font-size:7px; line-height:1.6; color:#444;">
      <div>{{settings.addressLine}}</div>
      <div>CR No.: {{settings.crNumber}}</div>
      <div>VAT No.: {{settings.vatNumber}}</div>
      <div>Phone No.: {{settings.phone}}</div>
    </div>
    <div style="text-align:right;">
      {{#if settings.logoUrl}}
        <img src="{{settings.logoUrl}}" style="height:9mm;" />
      {{else}}
        <div style="font-size:15px; font-weight:bold; color:#1f6fb2;">{{settings.name}}</div>
      {{/if}}
    </div>
  </div>
  <div style="height:1.2mm; margin-top:2.5mm; background:linear-gradient(90deg,#f5a623,#1f6fb2);"></div>
</div>
`;

export const PDF_FOOTER_TEMPLATE = `
<div style="width:100%; padding:0 15mm; box-sizing:border-box;">
  <div style="height:1.2mm; background:linear-gradient(90deg,#f5a623,#1f6fb2);"></div>
</div>
`;

const BASE_STYLE = `
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #262626; font-size: 12px; line-height: 1.5; }
  .doc-meta { color: #666; font-size: 12px; margin-bottom: 14px; }
  .project-title { font-size: 19px; font-weight: bold; color: #1f6fb2; text-transform: uppercase; margin: 0 0 14px; }
  .client-name { font-size: 15px; font-weight: bold; color: #262626; margin: 0 0 16px; }
  .doc-title { font-size: 20px; font-weight: bold; text-align: right; color: #1f6fb2; }
  .doc-number { text-align: right; color: #555; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1f6fb2; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-size: 20px; font-weight: bold; color: #1f6fb2; }
  .meta-grid { display: flex; justify-content: space-between; margin-bottom: 18px; }
  .meta-box { width: 48%; }
  .meta-box h4 { margin: 0 0 4px; color: #1f6fb2; font-size: 12px; text-transform: uppercase; }

  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #dbe4ee; }
  .info-table th { background: #eef4fb; color: #1f6fb2; text-align: left; padding: 8px 10px; font-size: 12px; border: 1px solid #dbe4ee; }
  .info-table td { padding: 8px 10px; border: 1px solid #dbe4ee; font-size: 12px; }
  .info-table td:first-child { font-weight: bold; width: 30%; background: #f7fafd; }

  .section-heading { color: #1f6fb2; font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 22px 0 4px; padding-bottom: 4px; border-bottom: 2px solid #f5a623; }
  .sub-heading { font-size: 12.5px; font-weight: bold; margin: 14px 0 4px; }
  .body-text { margin: 4px 0 8px; color: #333; }
  ul.bullet-list, ol.numbered-list { margin: 6px 0 10px; padding-left: 20px; }
  ul.bullet-list li, ol.numbered-list li { margin-bottom: 5px; }
  ul.bullet-list.dotted li { list-style-type: disc; }
  .phases div { margin-bottom: 4px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1f6fb2; color: #fff; text-align: left; padding: 8px; font-size: 12px; }
  td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; vertical-align: top; }

  .pricing-table th:first-child, .pricing-table td:first-child { width: 30px; text-align: center; }
  .pricing-table .amount-cell { background: #fdf1d3; font-weight: bold; text-align: right; white-space: nowrap; }
  .line-note { color: #666; font-size: 11px; margin-top: 2px; }
  .pricing-table tfoot td { border: none; padding: 8px 10px; }
  .totals-row { background: #1f6fb2; color: #fff; font-weight: bold; }
  .totals-row td:first-child { text-align: right; }
  .totals-row td:last-child { text-align: right; width: 140px; }
  .totals-row.grand { background: #17578f; }

  .escalation-table th:first-child, .escalation-table td:first-child { width: 30px; text-align: center; }

  .totals { width: 280px; margin-left: auto; }
  .totals td { padding: 6px 8px; }
  .totals .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #1f6fb2; }
  .footer { margin-top: 30px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 10px; }
  .terms { margin-top: 20px; font-size: 11px; color: #555; }
</style>
`;

export const QUOTATION_TEMPLATE = `
<html><head>${BASE_STYLE}</head><body>
  <div class="doc-meta">Quote No.: {{quotation.number}} | Date: {{date quotation.date}}</div>
  {{#if quotation.projectTitle}}<h1 class="project-title">{{quotation.projectTitle}}</h1>{{/if}}
  <h2 class="client-name">{{customer.name}}</h2>

  <table class="info-table">
    <tr><th>Project Information</th><th>Details</th></tr>
    <tr><td>Client</td><td>{{customer.name}}</td></tr>
    {{#if quotation.location}}<tr><td>Location</td><td>{{quotation.location}}</td></tr>{{/if}}
    <tr><td>Quote Validity</td><td>{{quotation.validityText}}</td></tr>
    {{#if quotation.leadTimeText}}<tr><td>Leadtime</td><td>{{quotation.leadTimeText}}</td></tr>{{/if}}
  </table>

  {{#if quotation.scopeIntro}}
    <h3 class="section-heading">Scope of Work:</h3>
    <p class="body-text">{{quotation.scopeIntro}}</p>
    {{#if scopeItems.length}}
    <ul class="bullet-list">
      {{#each scopeItems}}<li>{{#if label}}<strong>{{label}}:</strong> {{/if}}{{text}}</li>{{/each}}
    </ul>
    {{/if}}
  {{/if}}

  {{#if furtherDetails.length}}
    <h4 class="sub-heading">Further Details:</h4>
    <ol class="numbered-list">
      {{#each furtherDetails}}<li>{{#if label}}<strong>{{label}}:</strong> {{/if}}{{text}}</li>{{/each}}
    </ol>
  {{/if}}

  {{#if exclusionsItems.length}}
    <h4 class="sub-heading">Exclusions:</h4>
    {{#if quotation.exclusionsIntro}}<p class="body-text">{{quotation.exclusionsIntro}}</p>{{/if}}
    <ul class="bullet-list">
      {{#each exclusionsItems}}<li>{{text}}</li>{{/each}}
    </ul>
  {{/if}}

  {{#if technicalSpecs.length}}
    <h3 class="section-heading">Technical Specifications:</h3>
    <ul class="bullet-list">
      {{#each technicalSpecs}}<li>{{#if label}}<strong>{{label}}:</strong> {{/if}}{{text}}</li>{{/each}}
    </ul>
    {{#if phases.length}}
    <div class="phases">
      {{#each phases}}<div><strong>Phase {{order}}:</strong> {{text}}</div>{{/each}}
    </div>
    {{/if}}
  {{/if}}

  <h3 class="section-heading">Pricing:</h3>
  <table class="pricing-table">
    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Total Price (before VAT)</th></tr></thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{inc @index}}</td>
        <td>
          <strong>{{#if item.name}}{{item.name}}{{else}}{{description}}{{/if}}</strong>
          {{#if note}}<div class="line-note">{{note}}</div>{{/if}}
        </td>
        <td>{{qty}}</td>
        <td>{{unit}}</td>
        <td class="amount-cell">{{money lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr class="totals-row"><td colspan="4">Amount Before VAT ({{settings.currency}})</td><td>{{money quotation.subtotal}}</td></tr>
      <tr class="totals-row"><td colspan="4">VAT {{settings.defaultVatRate}}%</td><td>{{money quotation.vatAmount}}</td></tr>
      <tr class="totals-row grand"><td colspan="4">Net with VAT ({{settings.currency}})</td><td>{{money quotation.total}}</td></tr>
    </tfoot>
  </table>

  {{#if escalationLines.length}}
    <h3 class="section-heading">Price Escalation Table for Additional Quantities:</h3>
    <p class="body-text">In the event of additional work or quantity increases beyond the quoted scope, the following unit rates shall apply:</p>
    <table class="escalation-table">
      <thead><tr><th>#</th><th>Description</th><th>Additional Unit Price ({{settings.currency}})</th><th>Notes</th></tr></thead>
      <tbody>
        {{#each escalationLines}}
        <tr><td>{{order}}</td><td><strong>{{description}}</strong></td><td>{{additionalPrice}}</td><td>{{notes}}</td></tr>
        {{/each}}
      </tbody>
    </table>
  {{/if}}

  {{#if termsItems.length}}
    <h3 class="section-heading">Terms and Conditions:</h3>
    <ul class="bullet-list dotted">
      {{#each termsItems}}<li>{{#if label}}<strong>{{label}}:</strong> {{/if}}{{text}}</li>{{/each}}
    </ul>
  {{/if}}

  {{#if paymentTermsItems.length}}
    <h3 class="section-heading">Payment Terms:</h3>
    <ul class="bullet-list dotted">
      {{#each paymentTermsItems}}<li>{{#if label}}<strong>{{label}}</strong>{{else}}{{text}}{{/if}}</li>{{/each}}
    </ul>
  {{/if}}
</body></html>
`;

export const INVOICE_TEMPLATE = `
<html><head>${BASE_STYLE}</head><body>
  <div class="doc-meta">Invoice No.: {{invoice.number}} | Date: {{date invoice.invoiceDate}}</div>
  <h1 class="project-title">TAX INVOICE</h1>
  <table class="info-table">
    <tr><th>Bill To</th><th>Details</th></tr>
    <tr><td>Customer</td><td>{{customer.name}}</td></tr>
    {{#if customer.trn}}<tr><td>Customer TRN</td><td>{{customer.trn}}</td></tr>{{/if}}
    <tr><td>Our VAT No.</td><td>{{settings.vatNumber}}</td></tr>
    {{#if invoice.dueDate}}<tr><td>Due Date</td><td>{{date invoice.dueDate}}</td></tr>{{/if}}
    <tr><td>Status</td><td>{{invoice.status}}</td></tr>
  </table>

  <table class="pricing-table">
    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>VAT%</th><th>Amount</th></tr></thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{inc @index}}</td>
        <td><strong>{{#if item.name}}{{item.name}}{{else}}{{description}}{{/if}}</strong>{{#if note}}<div class="line-note">{{note}}</div>{{/if}}</td>
        <td>{{qty}}</td>
        <td>{{unit}}</td>
        <td>{{money unitPrice}}</td>
        <td>{{vatRate}}%</td>
        <td class="amount-cell">{{money lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr class="totals-row"><td colspan="6">Subtotal</td><td>{{money invoice.subtotal}}</td></tr>
      <tr class="totals-row"><td colspan="6">VAT</td><td>{{money invoice.vatAmount}}</td></tr>
      <tr class="totals-row grand"><td colspan="6">Total</td><td>{{money invoice.total}}</td></tr>
      <tr class="totals-row"><td colspan="6">Paid</td><td>{{money invoice.amountPaid}}</td></tr>
      <tr class="totals-row"><td colspan="6">Balance Due</td><td>{{money invoice.balanceDue}}</td></tr>
    </tfoot>
  </table>
</body></html>
`;

export const PURCHASE_ORDER_TEMPLATE = `
<html><head>${BASE_STYLE}</head><body>
  <div class="doc-meta">PO No.: {{purchaseOrder.number}} | Date: {{date purchaseOrder.date}}</div>
  <h1 class="project-title">PURCHASE ORDER</h1>
  <table class="info-table">
    <tr><th>Supplier</th><th>Details</th></tr>
    <tr><td>Name</td><td>{{supplier.name}}</td></tr>
    {{#if supplier.trn}}<tr><td>Supplier TRN</td><td>{{supplier.trn}}</td></tr>{{/if}}
    <tr><td>Address</td><td>{{supplier.address}}</td></tr>
  </table>

  <table class="pricing-table">
    <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>VAT%</th><th>Amount</th></tr></thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{inc @index}}</td>
        <td><strong>{{#if item.name}}{{item.name}}{{else}}{{description}}{{/if}}</strong>{{#if note}}<div class="line-note">{{note}}</div>{{/if}}</td>
        <td>{{qty}}</td>
        <td>{{unit}}</td>
        <td>{{money unitPrice}}</td>
        <td>{{vatRate}}%</td>
        <td class="amount-cell">{{money lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr class="totals-row"><td colspan="6">Subtotal</td><td>{{money purchaseOrder.subtotal}}</td></tr>
      <tr class="totals-row"><td colspan="6">VAT</td><td>{{money purchaseOrder.vatAmount}}</td></tr>
      <tr class="totals-row grand"><td colspan="6">Total</td><td>{{money purchaseOrder.total}}</td></tr>
    </tfoot>
  </table>
</body></html>
`;

export const DELIVERY_NOTE_TEMPLATE = `
<html><head>${BASE_STYLE}</head><body>
  <div class="doc-meta">DN No.: {{deliveryNote.number}} | Date: {{date deliveryNote.date}}</div>
  <h1 class="project-title">DELIVERY NOTE</h1>
  <table class="info-table">
    <tr><th>Customer</th><th>Details</th></tr>
    <tr><td>Name</td><td>{{customer.name}}</td></tr>
    <tr><td>Address</td><td>{{customer.address}}</td></tr>
    <tr><td>Warehouse</td><td>{{warehouse.name}}</td></tr>
  </table>
  <table class="pricing-table">
    <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Unit</th></tr></thead>
    <tbody>
      {{#each lines}}
      <tr><td>{{inc @index}}</td><td>{{item.name}}</td><td>{{qty}}</td><td>{{unit}}</td></tr>
      {{/each}}
    </tbody>
  </table>
</body></html>
`;
