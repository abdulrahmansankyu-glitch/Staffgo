import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button, Card, Field, Textarea } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [noteForm, setNoteForm] = useState({ type: 'Call', note: '' });

  function load() {
    api.get(`/customers/${id}`).then((res) => setCustomer(res.data.customer));
  }
  useEffect(load, [id]);

  async function addInteraction(e: FormEvent) {
    e.preventDefault();
    await api.post(`/customers/${id}/interactions`, noteForm);
    setNoteForm({ type: 'Call', note: '' });
    load();
  }

  if (!customer) return <div className="text-slate-400">Loading...</div>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-800">{customer.name}</h1>
      <p className="mb-6 text-sm text-slate-500">{customer.city} {customer.country && `· ${customer.country}`}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Details">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Phone</dt><dd>{customer.phone ?? '-'}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{customer.email ?? '-'}</dd></div>
            <div><dt className="text-slate-500">Address</dt><dd>{customer.address ?? '-'}</dd></div>
            <div><dt className="text-slate-500">TRN</dt><dd>{customer.trn ?? '-'}</dd></div>
            <div><dt className="text-slate-500">Credit Terms</dt><dd>{customer.creditTerms ?? '-'}</dd></div>
          </dl>
        </Card>

        <Card title="Contacts">
          {customer.contacts?.length ? (
            <ul className="space-y-2 text-sm">
              {customer.contacts.map((c: any) => (
                <li key={c.id}>
                  <div className="font-medium">{c.name} {c.role && <span className="text-slate-400">({c.role})</span>}</div>
                  <div className="text-slate-500">{c.phone} {c.email}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">No contacts added.</p>}
        </Card>

        <Card title="Log an Interaction">
          <form onSubmit={addInteraction} className="space-y-3">
            <Field label="Type">
              <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}>
                <option>Call</option><option>Meeting</option><option>Site Visit</option><option>Email</option>
              </select>
            </Field>
            <Field label="Note"><Textarea rows={3} required value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} /></Field>
            <Button type="submit">Save Note</Button>
          </form>
        </Card>
      </div>

      <Card title="Interaction History" className="mt-6">
        {customer.interactions?.length ? (
          <ul className="divide-y divide-slate-100">
            {customer.interactions.map((i: any) => (
              <li key={i.id} className="py-2 text-sm">
                <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">{i.type}</span>
                <span className="text-slate-400">{fmtDate(i.date)}</span>
                <p className="mt-1">{i.note}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-400">No interactions logged yet.</p>}
      </Card>
    </div>
  );
}
