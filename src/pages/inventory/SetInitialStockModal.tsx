import { useState } from 'react';
import { Save, AlertCircle, Loader2, PackagePlus } from 'lucide-react';
import { StockOverviewRow, setInitialStock } from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Atur Stok Awal"
      subtitle={item.item_name}
      icon={PackagePlus}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || qty === ''}
            className="bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Stok Awal
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex gap-3">
          <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            Stok awal hanya dapat diatur satu kali saat inisialisasi barang. Perubahan berikutnya harus melalui menu Penyesuaian Stok.
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Jumlah Stok Awal ({item.unit_name || 'Satuan'})
          </label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-mono text-base outline-none focus:ring-2 focus:ring-brand"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Harga Modal Dasar (HPP) per {item.unit_name || 'Satuan'}
          </label>
          <input
            type="number"
            value={hppValue}
            onChange={e => setHppValue(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
        </div>
      </div>
    </Modal>
  );
}