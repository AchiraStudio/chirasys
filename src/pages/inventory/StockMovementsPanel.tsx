import { useState, useEffect } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { StockOverviewRow, getStockMovements, StockMovementRow } from '../../lib/api';
import Drawer from '../../components/ui/Drawer';

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
  }, [isOpen, item, branchId]);

  if (!isOpen || !item) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Riwayat Mutasi Stok"
      subtitle={item.item_name}
      icon={History}
    >
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-4 text-brand" size={32} />
            <p className="text-xs font-medium">Memuat buku mutasi stok...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center text-slate-500 py-16 text-sm">Belum ada catatan pergerakan stok.</div>
        ) : (
          <div className="space-y-3">
            {movements.map((mov) => (
              <div key={mov.id} className="p-4 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500">{new Date(mov.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{mov.source_type}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{mov.notes || 'System Entry'}</p>
                  {(mov.batch_no || mov.expiry_date) && (
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      {mov.batch_no && `Batch: ${mov.batch_no}`} {mov.expiry_date && `| Exp: ${mov.expiry_date}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-mono font-bold text-base flex items-center justify-end gap-1 ${mov.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {mov.direction === 'in' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {mov.direction === 'in' ? '+' : '-'}{Math.abs(mov.qty_change)}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Sisa: {mov.running_total}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}