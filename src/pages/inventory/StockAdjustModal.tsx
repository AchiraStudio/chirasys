import { useState } from 'react';
import { Save, Loader2, ArrowUpRight, ArrowDownRight, Sliders } from 'lucide-react';
import { StockOverviewRow, adjustStock } from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Sesuaikan Stok"
      subtitle={`${item.item_name} · Stok Saat Ini: ${item.current_qty} ${item.unit_name || ''}`}
      icon={Sliders}
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
            Simpan Penyesuaian
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setDirection('in')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
              direction === 'in' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpRight size={16} /> Tambah Stok (Masuk)
          </button>
          <button
            type="button"
            onClick={() => setDirection('out')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
              direction === 'out' ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownRight size={16} /> Kurangi Stok (Keluar)
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Jumlah ({item.unit_name || 'Satuan'})
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
            Alasan
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="Correction">Koreksi Stok / Selisih Hitung</option>
            <option value="Damaged / Expired">Barang Rusak / Kadaluarsa</option>
            <option value="Return to Supplier">Retur ke Pemasok</option>
            <option value="Found in Count">Ditemukan Saat Stock Opname</option>
            <option value="Other">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
            placeholder="Detail keterangan..."
          />
        </div>
        
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-center">
          <span className="text-xs text-slate-500">Estimasi Total Baru: </span>
          <span className={`font-mono font-bold text-sm ${newTotal < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
            {newTotal} {item.unit_name}
          </span>
        </div>
      </div>
    </Modal>
  );
}