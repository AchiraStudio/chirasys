import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileSpreadsheet } from 'lucide-react';
import { createManualJournal, getAccounts, Account } from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ManualJournalModal({ isOpen, onClose, onSaved }: ManualJournalModalProps) {
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<{ account_id: string; debit: number; credit: number; notes: string }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setDescription('');
      setLines([
        { account_id: '', debit: 0, credit: 0, notes: '' },
        { account_id: '', debit: 0, credit: 0, notes: '' }
      ]);
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.filter(a => a.is_system === 0 && a.is_active === 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', debit: 0, credit: 0, notes: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: string | number) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    
    // Auto-balance if switching debit/credit
    if (field === 'debit' && Number(value) > 0) newLines[index].credit = 0;
    if (field === 'credit' && Number(value) > 0) newLines[index].debit = 0;
    
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validLines = lines.filter(l => l.account_id !== '' && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
        alert("Harap isi setidaknya dua baris jurnal valid.");
        return;
    }

    if (!isBalanced) {
        alert("Entri jurnal harus seimbang (Balance antara Debit & Kredit).");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin memposting jurnal manual ini?")) return;

    setLoading(true);
    try {
      await createManualJournal({
          description: description || undefined,
          lines: validLines.map(l => ({...l, notes: l.notes || undefined}))
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Gagal memposting jurnal: ' + error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Entri Jurnal Umum Manual"
      subtitle="Catat penyesuaian akuntansi dan transaksi memorial debit-kredit"
      icon={FileSpreadsheet}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="journalForm"
            disabled={loading || !isBalanced}
            className="bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Memposting...' : 'Posting Jurnal'}
          </button>
        </div>
      }
    >
      <form id="journalForm" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Deskripsi / Keterangan Transaksi
          </label>
          <input 
            type="text" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="contoh: Penyesuaian Saldo Awal Kas / Beban Listrik & Air" 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" 
          />
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Akun Rekening</th>
                <th className="px-4 py-3">Keterangan Baris</th>
                <th className="px-4 py-3 w-36 text-right">Debit (Rp)</th>
                <th className="px-4 py-3 w-36 text-right">Kredit (Rp)</th>
                <th className="px-4 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((line, idx) => (
                <tr key={idx} className="bg-white dark:bg-slate-950">
                  <td className="px-4 py-2.5">
                    <select 
                      value={line.account_id} 
                      onChange={e => updateLine(idx, 'account_id', e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Pilih Akun Rekening...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      type="text" 
                      value={line.notes} 
                      onChange={e => updateLine(idx, 'notes', e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand" 
                      placeholder="Catatan..." 
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      type="number" 
                      min="0" 
                      value={line.debit || ''} 
                      onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-right outline-none focus:ring-2 focus:ring-brand font-mono font-bold" 
                      placeholder="0" 
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input 
                      type="number" 
                      min="0" 
                      value={line.credit || ''} 
                      onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)} 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-right outline-none focus:ring-2 focus:ring-brand font-mono font-bold" 
                      placeholder="0" 
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button 
                      type="button" 
                      onClick={() => handleRemoveLine(idx)} 
                      disabled={lines.length <= 2} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button" 
              onClick={handleAddLine} 
              className="text-xs text-brand hover:underline flex items-center font-bold"
            >
              <Plus size={14} className="mr-1"/> Tambah Baris
            </button>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex justify-between items-center ${
          isBalanced 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300'
        }`}>
          <div className="text-xs font-bold uppercase tracking-wider">
            Status Saldo: {isBalanced ? '✓ SEIMBANG (BALANCED)' : '✕ TIDAK SEIMBANG'}
          </div>
          <div className="flex gap-8 text-right font-mono font-bold text-sm">
            <div><span className="text-xs opacity-70 mr-2 uppercase">Total Debit</span>Rp {totalDebit.toLocaleString('id-ID')}</div>
            <div><span className="text-xs opacity-70 mr-2 uppercase">Total Kredit</span>Rp {totalCredit.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
