import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { createManualJournal, getAccounts, Account } from '../../lib/api';

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
        alert("Please add at least two valid lines.");
        return;
    }

    if (!isBalanced) {
        alert("Journal entry must balance.");
        return;
    }

    if (!confirm("Are you sure you want to post this manual journal? It cannot be easily reversed.")) return;

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
      alert('Failed to post journal: ' + error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Manual Journal</h2>
            <p className="text-sm text-amber-600 mt-1">Warning: Direct ledger adjustments should only be made by authorized personnel.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
          <form id="journalForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / Memo</label>
                <input required type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="Reason for this adjustment..." />
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-900 uppercase font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 w-[30%]">Account</th>
                      <th className="px-4 py-3 w-[30%]">Line Note</th>
                      <th className="px-4 py-3 text-right w-[15%]">Debit</th>
                      <th className="px-4 py-3 text-right w-[15%]">Credit</th>
                      <th className="px-4 py-3 text-center w-[10%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                           <select 
                             required
                             value={line.account_id} 
                             onChange={e => updateLine(idx, 'account_id', e.target.value)} 
                             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                           >
                             <option value="">Select Account...</option>
                             {accounts.map(a => (
                               <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                             ))}
                           </select>
                        </td>
                        <td className="px-4 py-2">
                           <input type="text" value={line.notes} onChange={e => updateLine(idx, 'notes', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" placeholder="Optional note" />
                        </td>
                        <td className="px-4 py-2">
                           <input type="number" min="0" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-brand tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-4 py-2">
                           <input type="number" min="0" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-brand tabular-nums" placeholder="0" />
                        </td>
                        <td className="px-4 py-2 text-center">
                           <button type="button" onClick={() => handleRemoveLine(idx)} disabled={lines.length <= 2} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                               <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                   <button type="button" onClick={handleAddLine} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center font-medium">
                      <Plus size={16} className="mr-1"/> Add Line
                   </button>
                </div>
            </div>

            <div className={`p-4 rounded-xl border flex justify-between items-center ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800'}`}>
                <div className="font-medium">Total Balance</div>
                <div className="flex gap-8 text-right font-mono font-bold">
                    <div><span className="text-xs opacity-70 mr-2 uppercase">Debit</span>{totalDebit.toLocaleString('id-ID')}</div>
                    <div><span className="text-xs opacity-70 mr-2 uppercase">Credit</span>{totalCredit.toLocaleString('id-ID')}</div>
                </div>
            </div>
            
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="journalForm" disabled={loading || !isBalanced} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Posting...' : 'Post Journal'}
          </button>
        </div>
      </div>
    </>
  );
}
