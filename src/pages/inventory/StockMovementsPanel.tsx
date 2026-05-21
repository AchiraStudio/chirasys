import { useState, useEffect } from 'react';
import { X, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StockOverviewRow, getStockMovements, StockMovementRow } from '../../lib/api';

interface StockMovementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockOverviewRow | null;
  branchId: string;
}

export default function StockMovementsPanel({ isOpen, onClose, item, branchId }: StockMovementsPanelProps) {
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      getStockMovements(item.item_id, branchId).then(data => {
        setMovements(data);
        setLoading(false);
      });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0B0F19] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stock History</h2>
            <p className="text-sm text-slate-500 font-mono">{item.item_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin mb-4" size={32} /> Loading ledger...</div>
          ) : movements.length === 0 ? (
            <div className="text-center text-slate-500 py-10">No stock movements recorded.</div>
          ) : (
            <div className="space-y-4">
              {movements.map((mov) => (
                <div key={mov.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{new Date(mov.created_at).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{mov.source_type}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{mov.notes || 'System Entry'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold flex items-center justify-end gap-1 ${mov.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mov.direction === 'in' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {mov.direction === 'in' ? '+' : '-'}{Math.abs(mov.qty_change)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Balance: {mov.running_total}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}