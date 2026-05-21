import { useState } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { StockOverviewRow, setInitialStock } from '../../lib/api';

interface SetInitialStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockOverviewRow | null;
  branchId: string;
  onSuccess: () => void;
}

export default function SetInitialStockModal({ isOpen, onClose, item, branchId, onSuccess }: SetInitialStockModalProps) {
  const [qty, setQty] = useState<number | ''>('');
  const [hppValue, setHppValue] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleSubmit = async () => {
    if (qty === '' || !item.unit_id) return;
    setIsSubmitting(true);
    try {
      await setInitialStock(item.item_id, item.unit_id, branchId, Number(qty), Number(hppValue) || 0, "Initial System Setup");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Failed to set initial stock: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B0F19] rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Set Initial Stock</h2>
            <p className="text-sm text-slate-500">{item.item_name}</p> 
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-3">
            <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">Initial stock can only be set once per item. Subsequent changes require an Adjustment.</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Starting Quantity ({item.unit_name || 'Units'})</label>
            <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Base Cost (HPP) per {item.unit_name || 'Unit'}</label>
            <input type="number" value={hppValue} onChange={e => setHppValue(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="0.00" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || qty === ''} className="bg-brand text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Initial Stock
          </button>
        </div>
      </div>
    </div>
  );
}