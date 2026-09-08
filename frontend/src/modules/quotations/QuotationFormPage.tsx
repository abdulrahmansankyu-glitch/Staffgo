import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button, Card, Field, Input, Select, Textarea } from '../../components/ui';
import { money } from '../../lib/format';

interface Line { itemId: string; description: string; note: string; qty: string; unit: string; unitPrice: string; vatRate: string }
interface Phase { text: string }
interface Escalation { description: string; additionalPrice: string; notes: string }

const emptyLine = (): Line => ({ itemId: '', description: '', note: '', qty: '1', unit: 'LM', unitPrice: '0', vatRate: '15' });

export function QuotationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [location, setLocation] = useState('');
  const [validityText, setValidityText] = useState('30 days from quote date');
  const [leadTimeText, setLeadTimeText] = useState('');
  const [scopeIntro, setScopeIntro] = useState('');
  const [scopeItems, setScopeItems] = useState('');
  const [furtherDetails, setFurtherDetails] = useState('');
  const [exclusionsIntro, setExclusionsIntro] = useState('The following items are NOT included in this quotation:');
  const [exclusionsItems, setExclusionsItems] = useState('');
  const [technicalSpecs, setTechnicalSpecs] = useState('');
  const [termsText, setTermsText] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('50% Advance Payment: upon contract approval\n50% Balance Payment: upon delivery of all documents');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [escalationLines, setEscalationLines] = useState<Escalation[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers').then((res) => setCustomers(res.data.customers));
    api.get('/items').then((res) => setItems(res.data.items));
    if (id) {
      api.get(`/quotations/${id}`).then((res) => {
        const q = res.data.quotation;
        setCustomerId(q.customerId);
        setProjectTitle(q.projectTitle ?? '');
        setLocation(q.location ?? '');
        setValidityText(q.validityText ?? '');
        setLeadTimeText(q.leadTimeText ?? '');
        setScopeIntro(q.scopeIntro ?? '');
        setScopeItems(q.scopeItems ?? '');
        setFurtherDetails(q.furtherDetails ?? '');
        setExclusionsIntro(q.exclusionsIntro ?? '');
        setExclusionsItems(q.exclusionsItems ?? '');
        setTechnicalSpecs(q.technicalSpecs ?? '');
        setTermsText(q.termsText ?? '');
        setPaymentTerms(q.paymentTerms ?? '');
        setLines(q.lines.map((l: any) => ({
          itemId: l.itemId ?? '', description: l.description ?? '', note: l.note ?? '',
          qty: String(l.qty), unit: l.unit, unitPrice: String(l.unitPrice), vatRate: String(l.vatRate),
        })));
        setPhases(q.phases.map((p: any) => ({ text: p.text })));
        setEscalationLines(q.escalationLines.map((e: any) => ({ description: e.description, additionalPrice: e.additionalPrice, notes: e.notes ?? '' })));
      });
    }
  }, [id]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
  const vatAmount = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * ((Number(l.vatRate) || 0) / 100), 0);
  const total = subtotal + vatAmount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      customerId,
      projectTitle, location, validityText, leadTimeText,
      scopeIntro, scopeItems, furtherDetails, exclusionsIntro, exclusionsItems,
      technicalSpecs, termsText, paymentTerms,
      lines: lines.map((l) => ({
        itemId: l.itemId || undefined,
        description: l.description || undefined,
        note: l.note || undefined,
        qty: Number(l.qty), unit: l.unit, unitPrice: Number(l.unitPrice), vatRate: Number(l.vatRate),
      })),
      phases: phases.filter((p) => p.text.trim()).map((p) => ({ text: p.text })),
      escalationLines: escalationLines.filter((e) => e.description.trim()).map((e) => ({ ...e })),
    };
    try {
      if (isEdit) {
        await api.patch(`/quotations/${id}`, payload);
        navigate(`/quotations/${id}`);
      } else {
        const res = await api.post('/quotations', payload);
        navigate(`/quotations/${res.data.quotation.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
        <Button type="submit" disabled={saving || !customerId}>{saving ? 'Saving...' : 'Save Quotation'}</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Project & Client">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Customer">
                <Select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Project Title"><Input placeholder="e.g. Renovation Building Project - Rabigh" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} /></Field>
              <Field label="Location"><Input placeholder="e.g. Rabigh Branch" value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
              <Field label="Quote Validity"><Input value={validityText} onChange={(e) => setValidityText(e.target.value)} /></Field>
              <Field label="Leadtime"><Input placeholder="e.g. 1 to 2 weeks from contract approval" value={leadTimeText} onChange={(e) => setLeadTimeText(e.target.value)} /></Field>
            </div>
          </Card>

          <Card title="Scope of Work">
            <div className="space-y-3">
              <Field label="Introduction paragraph"><Textarea rows={3} value={scopeIntro} onChange={(e) => setScopeIntro(e.target.value)} /></Field>
              <Field label="Bullet points (one per line)"><Textarea rows={6} value={scopeItems} onChange={(e) => setScopeItems(e.target.value)} placeholder={'Roof Sheet Removal & Installation\nFalse Ceiling Replacement\n...'} /></Field>
            </div>
          </Card>

          <Card title="Further Details">
            <Field label="Numbered points (one per line, 'Label: text' bolds the label)">
              <Textarea rows={4} value={furtherDetails} onChange={(e) => setFurtherDetails(e.target.value)} placeholder={'Quality Assurance: All services performed to the highest standard.\nProject Completion: As per agreed schedule upon PO confirmation.'} />
            </Field>
          </Card>

          <Card title="Exclusions">
            <div className="space-y-3">
              <Field label="Introduction"><Input value={exclusionsIntro} onChange={(e) => setExclusionsIntro(e.target.value)} /></Field>
              <Field label="Bullet points (one per line)"><Textarea rows={4} value={exclusionsItems} onChange={(e) => setExclusionsItems(e.target.value)} placeholder={'Tower Light provision\nStructural modifications or reinforcements'} /></Field>
            </div>
          </Card>

          <Card title="Technical Specifications">
            <Field label="Bullet points (one per line, 'Label: text' bolds the label)">
              <Textarea rows={4} value={technicalSpecs} onChange={(e) => setTechnicalSpecs(e.target.value)} placeholder={'Materials Quality: Premium quality, reputable suppliers.\nCompliance: Saudi Arabian building codes and safety regulations.'} />
            </Field>
          </Card>

          <Card title="Project Phases">
            <div className="space-y-2">
              {phases.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 w-14 shrink-0 text-xs text-slate-400">Phase {i + 1}</span>
                  <Input value={p.text} onChange={(e) => setPhases((prev) => prev.map((x, idx) => idx === i ? { text: e.target.value } : x))} />
                  <Button type="button" variant="secondary" onClick={() => setPhases((prev) => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setPhases((prev) => [...prev, { text: '' }])}>+ Add Phase</Button>
            </div>
          </Card>

          <Card title="Pricing">
            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="rounded-md border border-slate-200 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Field label="Description">
                        <Input value={line.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Service or material description" />
                      </Field>
                    </div>
                    <Field label="Item (optional)">
                      <Select value={line.itemId} onChange={(e) => updateLine(i, { itemId: e.target.value })}>
                        <option value="">Service (no stock item)</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Qty"><Input type="number" step="any" value={line.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} /></Field>
                    <Field label="Unit"><Input value={line.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} placeholder="EA / LM / m²" /></Field>
                    <Field label="Unit Price"><Input type="number" step="any" value={line.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} /></Field>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-6">
                    <div className="sm:col-span-4">
                      <Field label="Note (shown under description, e.g. 'Quantity: 150 m²')">
                        <Input value={line.note} onChange={(e) => updateLine(i, { note: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="VAT %"><Input type="number" value={line.vatRate} onChange={(e) => updateLine(i, { vatRate: e.target.value })} /></Field>
                    <div className="flex items-end justify-end">
                      <Button type="button" variant="danger" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} disabled={lines.length === 1}>Remove Line</Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, emptyLine()])}>+ Add Line</Button>
            </div>
          </Card>

          <Card title="Price Escalation Table (optional)">
            <div className="space-y-2">
              {escalationLines.map((e, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <Input placeholder="Description" value={e.description} onChange={(ev) => setEscalationLines((prev) => prev.map((x, idx) => idx === i ? { ...x, description: ev.target.value } : x))} />
                  <Input placeholder="Additional unit price, e.g. 450 / m²" value={e.additionalPrice} onChange={(ev) => setEscalationLines((prev) => prev.map((x, idx) => idx === i ? { ...x, additionalPrice: ev.target.value } : x))} />
                  <Input placeholder="Notes" value={e.notes} onChange={(ev) => setEscalationLines((prev) => prev.map((x, idx) => idx === i ? { ...x, notes: ev.target.value } : x))} />
                  <Button type="button" variant="secondary" onClick={() => setEscalationLines((prev) => prev.filter((_, idx) => idx !== i))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setEscalationLines((prev) => [...prev, { description: '', additionalPrice: '', notes: '' }])}>+ Add Escalation Row</Button>
            </div>
          </Card>

          <Card title="Terms & Payment">
            <div className="space-y-3">
              <Field label="Terms and Conditions (one bullet per line)"><Textarea rows={4} value={termsText} onChange={(e) => setTermsText(e.target.value)} /></Field>
              <Field label="Payment Terms (one bullet per line)"><Textarea rows={3} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Summary" className="sticky top-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">VAT</dt><dd>{money(vatAmount)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </form>
  );
}
