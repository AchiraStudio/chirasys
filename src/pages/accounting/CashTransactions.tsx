import { useState, useEffect } from 'react';
import { cashIn, cashOut, getAccounts, Account } from '../../lib/api';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
      toast.info("Harap lengkapi semua field dengan benar.");
      return;
    }
    
    setSubmitting(true);
    try {
      if (type === 'in') {
        await cashIn(contraAccountId, cashAccountId, parseFloat(amount), desc, 'branch_001');
      } else {
        await cashOut(contraAccountId, cashAccountId, parseFloat(amount), desc, 'branch_001');
      }
      toast.error("Transaksi berhasil dicatat!");
      setAmount('');
      setDesc('');
    } catch (e: any) {
      toast.error("Gagal mencatat transaksi: " + e.toString());
    } finally {
      setSubmitting(false);
    }
  };

  const cashAccounts = accounts.filter(a => a.type === 'asset' && a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'));
  const contraAccounts = type === 'in' 
    ? accounts.filter(a => a.type === 'income' || a.type === 'equity' || a.type === 'liability')
    : accounts.filter(a => a.type === 'expense' || a.type === 'liability' || a.type === 'asset');

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>;
  }

  return (
    <div className="bg-card rounded-xl border border-line shadow-sm p-8 max-w-2xl fade-in">
      <h2 className="text-xl font-bold text-heading mb-6">Pencatatan Kas & Bank</h2>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setType('in')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${type === 'in' ? 'border-success bg-success-soft text-success dark:bg-success/10 dark:text-success' : 'border-line text-dim hover:bg-muted'}`}
        >
          <ArrowDownCircle size={24} />
          <div className="text-left"><p className="font-bold">Kas Masuk</p><p className="text-xs opacity-80">Terima Dana</p></div>
        </button>
        <button 
          onClick={() => setType('out')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${type === 'out' ? 'border-danger bg-danger-soft text-danger dark:bg-danger/10 dark:text-danger' : 'border-line text-dim hover:bg-muted'}`}
        >
          <ArrowUpCircle size={24} />
          <div className="text-left"><p className="font-bold">Kas Keluar</p><p className="text-xs opacity-80">Pengeluaran Dana</p></div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-heading mb-1">Akun Kas / Bank (Penyimpanan)</label>
          <Select value={cashAccountId} onChange={v => setCashAccountId(v)} required className="w-full bg-muted dark:bg-muted border border-line rounded-xl px-4 py-3 outline-none focus:border-primary">
            <option value="">-- Pilih Akun --</option>
            {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-heading mb-1">
            {type === 'in' ? 'Sumber Dana (Pendapatan/Modal)' : 'Tujuan Dana (Biaya/Pengeluaran)'}
          </label>
          <Select value={contraAccountId} onChange={v => setContraAccountId(v)} required className="w-full bg-muted dark:bg-muted border border-line rounded-xl px-4 py-3 outline-none focus:border-primary">
            <option value="">-- Pilih Akun --</option>
            {contraAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-heading mb-1">Jumlah (Rp)</label>
          <input type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0" className="w-full bg-muted dark:bg-muted border border-line rounded-xl px-4 py-3 outline-none focus:border-primary font-mono text-lg" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-heading mb-1">Keterangan</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} required placeholder="Deskripsi transaksi..." rows={3} className="w-full bg-muted dark:bg-muted border border-line rounded-xl px-4 py-3 outline-none focus:border-primary resize-none" />
        </div>

        <button type="submit" disabled={submitting} className="w-full bg-primary text-white font-bold text-base px-6 py-4 rounded-xl mt-4 hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
          {submitting ? 'Memproses...' : 'Simpan Transaksi'}
        </button>
      </form>
    </div>
  );
}
