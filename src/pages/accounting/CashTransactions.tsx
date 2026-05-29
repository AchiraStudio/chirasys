import { useState, useEffect } from 'react';
import { cashIn, cashOut, getAccounts, Account } from '../../lib/api';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';

export default function CashTransactions() {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [cashAccountId, setCashAccountId] = useState('');
  const [contraAccountId, setContraAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAccounts().then(res => {
      setAccounts(res.filter(a => a.is_active === 1));
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAccountId || !contraAccountId || !amount || parseFloat(amount) <= 0) {
      alert("Harap lengkapi semua field dengan benar.");
      return;
    }
    
    setSubmitting(true);
    try {
      if (type === 'in') {
        await cashIn(contraAccountId, cashAccountId, parseFloat(amount), desc, 'branch_001');
      } else {
        await cashOut(contraAccountId, cashAccountId, parseFloat(amount), desc, 'branch_001');
      }
      alert("Transaksi berhasil dicatat!");
      setAmount('');
      setDesc('');
    } catch (e: any) {
      alert("Gagal mencatat transaksi: " + e.toString());
    } finally {
      setSubmitting(false);
    }
  };

  const cashAccounts = accounts.filter(a => a.type === 'asset' && a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'));
  const contraAccounts = type === 'in' 
    ? accounts.filter(a => a.type === 'income' || a.type === 'equity' || a.type === 'liability')
    : accounts.filter(a => a.type === 'expense' || a.type === 'liability' || a.type === 'asset');

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={32} /></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 max-w-2xl fade-in">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Pencatatan Kas & Bank</h2>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setType('in')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${type === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <ArrowDownCircle size={24} />
          <div className="text-left"><p className="font-bold">Kas Masuk</p><p className="text-xs opacity-80">Terima Dana</p></div>
        </button>
        <button 
          onClick={() => setType('out')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${type === 'out' ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <ArrowUpCircle size={24} />
          <div className="text-left"><p className="font-bold">Kas Keluar</p><p className="text-xs opacity-80">Pengeluaran Dana</p></div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Akun Kas / Bank (Penyimpanan)</label>
          <select value={cashAccountId} onChange={e => setCashAccountId(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand">
            <option value="">-- Pilih Akun --</option>
            {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {type === 'in' ? 'Sumber Dana (Pendapatan/Modal)' : 'Tujuan Dana (Biaya/Pengeluaran)'}
          </label>
          <select value={contraAccountId} onChange={e => setContraAccountId(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand">
            <option value="">-- Pilih Akun --</option>
            {contraAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Jumlah (Rp)</label>
          <input type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand font-mono text-lg" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} required placeholder="Deskripsi transaksi..." rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand resize-none" />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-brand text-white font-bold text-base px-6 py-4 rounded-xl mt-4 hover:bg-blue-600 transition-colors shadow-lg shadow-brand/20 disabled:opacity-50">
          {submitting ? 'Memproses...' : 'Simpan Transaksi'}
        </button>
      </form>
    </div>
  );
}
