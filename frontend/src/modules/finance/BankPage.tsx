import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Button, Card, Field, Input } from '../../components/ui';
import { money, fmtDate } from '../../lib/format';

export function BankPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', bank: '' });
  const [txForm, setTxForm] = useState({ amount: '', description: '' });

  function loadAccounts() {
    api.get('/finance/bank-accounts').then((res) => {
      setAccounts(res.data.accounts);
      if (res.data.accounts.length && !selected) setSelected(res.data.accounts[0].id);
    });
  }
  useEffect(loadAccounts, []);

  function loadTransactions() {
    if (selected) api.get(`/finance/bank-accounts/${selected}/transactions`).then((res) => setTransactions(res.data.transactions));
  }
  useEffect(loadTransactions, [selected]);

  async function addAccount(e: FormEvent) {
    e.preventDefault();
    await api.post('/finance/bank-accounts', accountForm);
    setAccountForm({ name: '', bank: '' });
    setShowAccountForm(false);
    loadAccounts();
  }

  async function addTransaction(e: FormEvent) {
    e.preventDefault();
    await api.post(`/finance/bank-accounts/${selected}/transactions`, { ...txForm, amount: Number(txForm.amount) });
    setTxForm({ amount: '', description: '' });
    loadTransactions();
  }

  async function reconcile(txId: string) {
    await api.patch(`/finance/bank-transactions/${txId}/reconcile`, {});
    loadTransactions();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Bank & Reconciliation</h1>
        <Button onClick={() => setShowAccountForm((s) => !s)}>{showAccountForm ? 'Cancel' : '+ New Account'}</Button>
      </div>

      {showAccountForm && (
        <Card title="New Bank Account" className="mb-6">
          <form onSubmit={addAccount} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Account Name"><Input required value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></Field>
            <Field label="Bank"><Input value={accountForm.bank} onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Save</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex gap-2">
        {accounts.map((a) => (
          <button key={a.id} onClick={() => setSelected(a.id)} className={`rounded-md px-3 py-1.5 text-sm ${selected === a.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300'}`}>{a.name}</button>
        ))}
      </div>

      {selected && (
        <Card title="Transactions">
          <table className="mb-4 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="pb-2">Date</th><th className="pb-2">Description</th><th className="pb-2">Amount</th><th className="pb-2">Reconciled</th><th></th></tr></thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-2">{fmtDate(t.date)}</td><td className="py-2">{t.description ?? '-'}</td><td className="py-2">{money(t.amount)}</td>
                  <td className="py-2">{t.reconciled ? 'Yes' : 'No'}</td>
                  <td className="py-2">{!t.reconciled && <Button variant="secondary" onClick={() => reconcile(t.id)}>Mark Reconciled</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={addTransaction} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input type="number" placeholder="Amount" required value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
            <Input placeholder="Description" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
            <Button type="submit">Add Transaction</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
