import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nextDocumentNumber } from '../src/lib/numbering';
import { getCompanySettings } from '../src/lib/companySettings';

const prisma = new PrismaClient();

async function main() {
  await getCompanySettings(); // ensures the CompanySettings singleton row exists

  // ---- Users (one per role) ----
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@staffgo.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@staffgo.com', passwordHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'accountant@staffgo.com' },
    update: {},
    create: { name: 'Accountant User', email: 'accountant@staffgo.com', passwordHash, role: 'ACCOUNTANT' },
  });
  await prisma.user.upsert({
    where: { email: 'sales@staffgo.com' },
    update: {},
    create: { name: 'Sales User', email: 'sales@staffgo.com', passwordHash, role: 'SALES' },
  });
  const siteStaff = await prisma.user.upsert({
    where: { email: 'site@staffgo.com' },
    update: {},
    create: { name: 'Site Staff User', email: 'site@staffgo.com', passwordHash, role: 'SITE_STAFF' },
  });

  // ---- Masters ----
  const customer = await prisma.customer.create({
    data: { name: 'Al Riyadh Construction Co.', trn: '300012345600003', phone: '+966501234567', address: 'Riyadh, KSA', city: 'Riyadh', country: 'Saudi Arabia', creditTerms: 'Net 30' },
  });
  await prisma.customer.create({ data: { name: 'Jeddah Builders LLC', phone: '+966502223344', city: 'Jeddah', country: 'Saudi Arabia' } });

  const supplier = await prisma.supplier.create({
    data: { name: 'Gulf Steel Supplies', trn: '300099998800003', phone: '+966509998877', paymentTerms: 'Net 15' },
  });
  await prisma.supplier.create({ data: { name: 'National Cement Traders', phone: '+966505556677' } });

  const cementBag = await prisma.item.create({
    data: {
      sku: 'CEM-001', name: 'Cement (OPC)', category: 'Cement', baseUnit: 'bag',
      units: { create: [{ unitName: 'ton', conversionFactorToBase: 20 }] },
    },
  });
  const rebar = await prisma.item.create({
    data: { sku: 'STL-010', name: 'Rebar 10mm', category: 'Steel', baseUnit: 'ton' },
  });
  const block = await prisma.item.create({
    data: { sku: 'BLK-020', name: 'Concrete Block', category: 'Blocks', baseUnit: 'piece' },
  });

  const mainWarehouse = await prisma.warehouse.create({ data: { name: 'Main Warehouse - Riyadh', type: 'WAREHOUSE', address: 'Industrial City, Riyadh' } });
  const site1 = await prisma.warehouse.create({ data: { name: 'Site A - Al Malaz Project', type: 'SITE' } });

  const employee = await prisma.employee.create({
    data: { name: 'Mohammed Al-Otaibi', designation: 'Site Supervisor', phone: '+966501112233', joinDate: new Date('2023-01-15'), salary: 6000 },
  });
  const subcontractor = await prisma.subcontractor.create({ data: { name: 'Fast Track Plastering Co.', trade: 'Plastering' } });
  const equipment = await prisma.equipment.create({ data: { name: 'Concrete Mixer #1', type: 'Mixer', ownedOrRented: 'OWNED' } });

  // ---- Project ----
  const project = await prisma.project.create({
    data: { code: 'PRJ-001', name: 'Al Malaz Residential Building', customerId: customer.id, contractValue: 500000, startDate: new Date(), status: 'ACTIVE' },
  });
  await prisma.boq.create({
    data: {
      projectId: project.id, version: 1,
      lines: {
        create: [
          { description: 'Cement supply', unit: 'bag', qty: 1000, rate: 20, amount: 20000, category: 'Materials' },
          { description: 'Rebar supply', unit: 'ton', qty: 15, rate: 3000, amount: 45000, category: 'Materials' },
        ],
      },
    },
  });
  await prisma.milestone.create({ data: { projectId: project.id, title: 'Foundation complete', dueDate: new Date(Date.now() + 30 * 86400000), percentComplete: 40 } });
  await prisma.laborEntry.create({ data: { projectId: project.id, employeeId: employee.id, quantity: 20, rate: 200, amount: 4000 } });
  await prisma.laborEntry.create({ data: { projectId: project.id, subcontractorId: subcontractor.id, quantity: 1, rate: 8000, amount: 8000 } });
  await prisma.equipmentUsageLog.create({ data: { equipmentId: equipment.id, projectId: project.id, dateFrom: new Date(), cost: 1500 } });

  // ---- Sales chain: Quotation -> Sales Order -> Invoice -> partial payment ----
  const qtyCement = 500, priceCement = 22, vat = 15;
  const cementSubtotal = qtyCement * priceCement;
  const cementVat = cementSubtotal * (vat / 100);

  const quotation = await prisma.quotation.create({
    data: {
      number: await nextDocumentNumber('QUOTATION'),
      customerId: customer.id, projectId: project.id,
      validUntil: new Date(Date.now() + 14 * 86400000),
      termsText: '50% advance, balance on delivery.',
      subtotal: cementSubtotal, vatAmount: cementVat, total: cementSubtotal + cementVat,
      status: 'SENT',
      lines: { create: [{ itemId: cementBag.id, description: 'OPC Cement', qty: qtyCement, unit: 'bag', unitPrice: priceCement, vatRate: vat, lineTotal: cementSubtotal }] },
    },
  });

  // ---- A second, richer contracting-services quotation (Scope of Work / Exclusions /
  // Technical Specs / Phases / Pricing / Price Escalation / Terms), matching the
  // business's real quotation format for renovation/contracting projects ----
  const kanooz = await prisma.customer.create({
    data: { name: 'Kanooz Contracting Establishment', city: 'Rabigh', country: 'Saudi Arabia' },
  });
  const renovationLines = [
    { description: 'Design and Approval of Fire and Safety Systems (Fire Extinguishing System and Fire Alarm System)', qty: 1, unit: 'EA', unitPrice: 20000 },
    { description: 'Roof Sheet Removal & Installation with Thermal Insulation', note: 'Quantity: 150 m²', qty: 1, unit: 'LM', unitPrice: 26000 },
    { description: 'False Ceiling Replacement & Installation', note: 'Quantity: 80 m²', qty: 1, unit: 'LM', unitPrice: 67500 },
    { description: 'Painting Works (Walls Only)', note: 'Quantity: 300 m²', qty: 1, unit: 'LM', unitPrice: 10500 },
    { description: 'Electrical Works (Lighting, Wiring, Sockets, Cables)', qty: 1, unit: 'LM', unitPrice: 75000 },
    { description: 'Plumbing Maintenance & Toilet Accessories', qty: 1, unit: 'LM', unitPrice: 30000 },
    { description: 'CCTV Installation (4 Cameras)', qty: 1, unit: 'LM', unitPrice: 20000 },
    { description: 'General Cleaning & Housekeeping', qty: 1, unit: 'LM', unitPrice: 1000 },
  ];
  const renovationSubtotal = renovationLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const renovationVat = renovationSubtotal * 0.15;

  await prisma.quotation.create({
    data: {
      number: await nextDocumentNumber('QUOTATION'),
      customerId: kanooz.id,
      status: 'SENT',
      projectTitle: 'Renovation Building Project - Rabigh',
      location: 'Rabigh Branch',
      validityText: '30 days from quote date',
      leadTimeText: '1 to 2 weeks from the date of contract approval and receipt of advance payment.',
      scopeIntro: 'Staffgo Industrial Services is committed to providing comprehensive renovation and restoration services for your building project in Rabigh. Our team of experienced professionals will ensure the highest quality standards throughout all phases of the project. The following services are included in this quotation:',
      scopeItems: [
        'Roof Sheet Removal & Installation of Damaged Parts (Thermal Insulation)',
        'False Ceiling Replacement & Installation of Damaged Parts',
        'Painting (Walls Only)',
        'Electrical Works - Existing Issues (Lighting, Wiring, Sockets, and Cables)',
        'Plumbing Maintenance including Toilet Accessories',
        'CCTV Installation (Maximum 4 Cameras)',
        'Design and Approval of Fire and Safety Systems (Fire Extinguishing System and Fire Alarm System)',
        'General Cleaning & Housekeeping',
      ].join('\n'),
      furtherDetails: [
        'Quality Assurance: All services will be performed in accordance with the highest standards of quality and professionalism.',
        'Services Included: Roof sheet removal and installation with thermal insulation, false ceiling replacement, wall painting, electrical and plumbing works, CCTV installation, fire and safety systems design, and general cleaning.',
        'Project Completion: As per agreed schedule upon Purchase Order confirmation.',
      ].join('\n'),
      exclusionsIntro: 'The following items are NOT included in this quotation and shall be the responsibility of Kanooz Company:',
      exclusionsItems: [
        'Tower Light provision (if required for the project)',
        'Any work outside the defined scope of work',
        'Structural modifications or reinforcements',
        'Supply and installation of fire safety equipment (design and approval only)',
        'Any additional materials or services not explicitly mentioned in the scope of work',
        'Waste disposal outside the approved disposal area',
        'Any permits, licenses, or regulatory approvals required from authorities',
      ].join('\n'),
      technicalSpecs: [
        'Materials Quality: All materials used shall be of premium quality and sourced from reputable suppliers.',
        'Workmanship: All work shall be executed by skilled and experienced technicians under professional supervision.',
        'Compliance: All work shall comply with applicable Saudi Arabian building codes and safety regulations.',
        'Quality Standards: All workmanship shall meet or exceed industry standards and shall be subject to inspection and approval by the client.',
      ].join('\n'),
      termsText: [
        'Services shall be performed at the delivery address specified in this quotation.',
        'Quoted prices are valid for 30 days from quotation date.',
        'Prices have been clearly indicated before and after VAT.',
        'Project timeline to be confirmed upon Purchase Order approval.',
        'All materials and workmanship shall comply with the highest industry standards.',
        'Tower Light Provision: If tower lighting is required for the project, such provision shall be the responsibility of Kanooz Company.',
        'Price Adjustments: Prices are subject to change in case of significant market fluctuations in material costs.',
      ].join('\n'),
      paymentTerms: [
        '50% Advance Payment upon contract approval',
        '50% Balance Payment upon delivery of all documents within 30 days',
      ].join('\n'),
      subtotal: renovationSubtotal,
      vatAmount: renovationVat,
      total: renovationSubtotal + renovationVat,
      lines: { create: renovationLines.map((l) => ({ ...l, vatRate: 15, lineTotal: l.qty * l.unitPrice })) },
      phases: {
        create: [
          'Roof Sheet Damaged Parts Removal & Installation',
          'False Ceiling Works',
          'Electrical Works (Parallel with Phase 2)',
          'Painting',
          'Plumbing Works',
          'Fire and Safety Systems Design & Approval',
          'General Cleaning & Handover',
        ].map((text, i) => ({ order: i + 1, text })),
      },
      escalationLines: {
        create: [
          { order: 1, description: 'Roof Sheet Removal & Installation', additionalPrice: '450 / m²', notes: 'For any area exceeding 150 m²' },
          { order: 2, description: 'False Ceiling Replacement', additionalPrice: '325 / m²', notes: 'For any area exceeding 80 m²' },
          { order: 3, description: 'Painting Works', additionalPrice: '35 / m²', notes: 'For any area exceeding 300 m²' },
          { order: 4, description: 'Additional CCTV Camera', additionalPrice: '5,000 / camera', notes: 'For each camera beyond the 4 included' },
          { order: 5, description: 'Additional Electrical or Plumbing Works', additionalPrice: 'To be quoted separately', notes: 'Upon site assessment' },
        ],
      },
    },
  });

  const salesOrder = await prisma.salesOrder.create({
    data: {
      number: await nextDocumentNumber('SALES_ORDER'),
      quotationId: quotation.id, customerId: customer.id, projectId: project.id,
      subtotal: cementSubtotal, vatAmount: cementVat, total: cementSubtotal + cementVat,
      lines: { create: [{ itemId: cementBag.id, description: 'OPC Cement', qty: qtyCement, unit: 'bag', unitPrice: priceCement, vatRate: vat, lineTotal: cementSubtotal }] },
    },
  });

  const invoiceTotal = cementSubtotal + cementVat;
  const invoice = await prisma.invoice.create({
    data: {
      number: await nextDocumentNumber('INVOICE'),
      customerId: customer.id, salesOrderId: salesOrder.id, projectId: project.id,
      dueDate: new Date(Date.now() + 30 * 86400000),
      subtotal: cementSubtotal, vatAmount: cementVat, total: invoiceTotal,
      amountPaid: invoiceTotal / 2, status: 'PARTIAL',
      lines: { create: [{ itemId: cementBag.id, description: 'OPC Cement', qty: qtyCement, unit: 'bag', unitPrice: priceCement, vatRate: vat, lineTotal: cementSubtotal }] },
    },
  });
  await prisma.payment.create({ data: { invoiceId: invoice.id, direction: 'IN', amount: invoiceTotal / 2, method: 'Bank Transfer', reference: 'TRF-0001' } });

  // ---- Purchasing chain: PO -> Bill (posts stock IN) ----
  const qtyRebar = 10, priceRebar = 3000;
  const rebarSubtotal = qtyRebar * priceRebar;
  const rebarVat = rebarSubtotal * (vat / 100);

  const po = await prisma.purchaseOrder.create({
    data: {
      number: await nextDocumentNumber('PURCHASE_ORDER'),
      supplierId: supplier.id, projectId: project.id,
      subtotal: rebarSubtotal, vatAmount: rebarVat, total: rebarSubtotal + rebarVat,
      lines: { create: [{ itemId: rebar.id, description: 'Rebar 10mm', qty: qtyRebar, unit: 'ton', unitPrice: priceRebar, vatRate: vat, lineTotal: rebarSubtotal }] },
    },
  });

  const purchaseBillNumber = await nextDocumentNumber('PURCHASE_BILL');
  await prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.create({
      data: {
        number: purchaseBillNumber,
        supplierId: supplier.id, purchaseOrderId: po.id, warehouseId: mainWarehouse.id,
        dueDate: new Date(Date.now() + 15 * 86400000),
        subtotal: rebarSubtotal, vatAmount: rebarVat, total: rebarSubtotal + rebarVat,
        amountPaid: 0, status: 'SENT',
        lines: { create: [{ itemId: rebar.id, description: 'Rebar 10mm', qty: qtyRebar, unit: 'ton', unitPrice: priceRebar, vatRate: vat, lineTotal: rebarSubtotal }] },
      },
    });
    await tx.stockLedgerEntry.create({ data: { itemId: rebar.id, warehouseId: mainWarehouse.id, direction: 'IN', qty: qtyRebar, unit: 'ton', unitCost: priceRebar, refType: 'PURCHASE_BILL', refId: bill.id } });
    await tx.itemWarehouseStock.create({ data: { itemId: rebar.id, warehouseId: mainWarehouse.id, qtyOnHand: qtyRebar, reorderLevel: 2 } });
  });

  // Seed some existing stock for cement + blocks so the app isn't empty
  await prisma.stockLedgerEntry.create({ data: { itemId: cementBag.id, warehouseId: mainWarehouse.id, direction: 'IN', qty: 2000, unit: 'bag', unitCost: 18, refType: 'ADJUSTMENT' } });
  await prisma.itemWarehouseStock.create({ data: { itemId: cementBag.id, warehouseId: mainWarehouse.id, qtyOnHand: 1500, reorderLevel: 300 } });
  await prisma.stockLedgerEntry.create({ data: { itemId: block.id, warehouseId: mainWarehouse.id, direction: 'IN', qty: 5000, unit: 'piece', unitCost: 1.5, refType: 'ADJUSTMENT' } });
  await prisma.itemWarehouseStock.create({ data: { itemId: block.id, warehouseId: mainWarehouse.id, qtyOnHand: 5000, reorderLevel: 500 } });

  // ---- Material request (site staff -> pending approval) ----
  await prisma.materialRequest.create({
    data: {
      number: await nextDocumentNumber('MATERIAL_REQUEST'),
      siteId: site1.id, requestedById: siteStaff.id, status: 'PENDING',
      lines: { create: [{ itemId: cementBag.id, qtyRequested: 100, unit: 'bag' }] },
    },
  });

  // ---- Finance ----
  await prisma.expense.create({ data: { category: 'Fuel', projectId: project.id, amount: 800, paidFrom: 'CASH', description: 'Site generator fuel' } });
  await prisma.expense.create({ data: { category: 'Office Rent', amount: 5000, paidFrom: 'BANK' } });
  const bank = await prisma.bankAccount.create({ data: { name: 'Main Operating Account', bank: 'Al Rajhi Bank', currency: 'SAR' } });
  await prisma.bankTransaction.create({ data: { bankAccountId: bank.id, amount: invoiceTotal / 2, description: 'Customer payment received' } });

  console.log('Seed complete. Demo logins (password: password123):');
  console.log('  admin@staffgo.com / accountant@staffgo.com / sales@staffgo.com / site@staffgo.com');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
