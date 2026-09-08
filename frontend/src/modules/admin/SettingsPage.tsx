import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { Button, Card, Field, Input } from '../../components/ui';

export function SettingsPage() {
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/settings/company').then((res) => setForm(res.data.settings));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const res = await api.patch('/settings/company', form);
    setForm(res.data.settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('logo', file);
      const res = await api.post('/settings/company/logo', data);
      setForm(res.data.settings);
    } catch (err: any) {
      setUploadError(err.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!form) return <div className="text-slate-400">Loading...</div>;

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-800">Company Settings</h1>
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        <Card title="Letterhead (shown on every document)">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {form.logoUrl ? <img src={form.logoUrl} alt="Company logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">No logo</span>}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoFile} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload">
                <span className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {uploading ? 'Uploading...' : form.logoUrl ? 'Replace Logo Image' : 'Upload Logo Image'}
                </span>
              </label>
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, SVG or WebP, up to 3MB. Appears on documents, the sidebar and the login page.</p>
              {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company Name"><Input value={form.name} onChange={update('name')} /></Field>
            <Field label="Address"><Input value={form.addressLine} onChange={update('addressLine')} /></Field>
            <Field label="CR Number"><Input value={form.crNumber} onChange={update('crNumber')} /></Field>
            <Field label="VAT Number"><Input value={form.vatNumber} onChange={update('vatNumber')} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={update('phone')} /></Field>
          </div>
        </Card>

        <Card title="Finance Defaults">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency"><Input value={form.currency} onChange={update('currency')} /></Field>
            <Field label="Default VAT Rate (%)"><Input type="number" value={form.defaultVatRate} onChange={(e) => setForm({ ...form, defaultVatRate: Number(e.target.value) })} /></Field>
          </div>
        </Card>

        <Card title="Document Number Prefixes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Quotation"><Input value={form.quotationPrefix} onChange={update('quotationPrefix')} /></Field>
            <Field label="Sales Order"><Input value={form.salesOrderPrefix} onChange={update('salesOrderPrefix')} /></Field>
            <Field label="Invoice"><Input value={form.invoicePrefix} onChange={update('invoicePrefix')} /></Field>
            <Field label="Delivery Note"><Input value={form.deliveryNotePrefix} onChange={update('deliveryNotePrefix')} /></Field>
            <Field label="Purchase Order"><Input value={form.purchaseOrderPrefix} onChange={update('purchaseOrderPrefix')} /></Field>
            <Field label="Purchase Bill"><Input value={form.purchaseBillPrefix} onChange={update('purchaseBillPrefix')} /></Field>
            <Field label="Material Request"><Input value={form.materialRequestPrefix} onChange={update('materialRequestPrefix')} /></Field>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">Save Settings</Button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </form>
    </div>
  );
}
