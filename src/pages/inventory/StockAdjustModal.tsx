import { useState } from 'react';
import { X, Save, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StockOverviewRow, adjustStock } from '../../lib/api';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockOverviewRow | null;
  branchId: string;
  onSuccess: () => void;
}

export default function StockAdjustModal({ isOpen, onClose, item, branchId, onSuccess }: StockAdjustModalProps) {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [qty, setQty] = useState<number | ''>('');
  const [reason, setReason] = useState('Correction');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async () => {
    if (qty === '' || !item.unit_id) return;
    setIsSubmitting(true);
    try {
      const fullNote = `${reason} - ${notes}`;
      await adjustStock(item.item_id, item.unit_id, branchId, Number(qty), direction, fullNote, "Admin");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Failed to adjust stock: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const newTotal = direction === 'in' ? item.current_qty + Number(qty || 0) : item.current_qty - Number(qty || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B0F19] rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Adjust Stock</h2>
            <p className="text-sm text-slate-500 font-mono">{item.item_name} | Current: {item.current_qty}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button onClick={() => setDirection('in')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${direction === 'in' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-500'}`}><ArrowUpRight size={16} /> Add Stock</button>
            <button onClick={() => setDirection('out')} className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${direction === 'out' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-slate-500'}`}><ArrowDownRight size={16} /> Remove</button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Quantity ({item.unit_name || 'Units'})</label>
            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono text-lg" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
              <option>Correction</option>
              <option>Damaged / Expired</option>
              <option>Return to Supplier</option>
              <option>Found in Count</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Optional details..." />
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="text-sm text-slate-500">New Total: </span>
            <span className={`font-mono font-bold ${newTotal < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{newTotal} {item.unit_name}</span>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || qty === ''} className="bg-brand text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Confirm Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}