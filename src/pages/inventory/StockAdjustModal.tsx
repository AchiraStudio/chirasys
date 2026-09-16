import { useState } from 'react';
import { Save, Loader2, ArrowUpRight, ArrowDownRight, Sliders } from 'lucide-react';
import { StockOverviewRow, adjustStock } from '../../lib/api';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
      toast.error(`Failed to adjust stock: ${error}`);
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
            className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-body hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || qty === ''}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Penyesuaian
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex bg-muted p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setDirection('in')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
              direction === 'in' ? 'bg-card dark:bg-muted text-success shadow-sm' : 'text-body'
            }`}
          >
            <ArrowUpRight size={16} /> Tambah Stok (Masuk)
          </button>
          <button
            type="button"
            onClick={() => setDirection('out')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 rounded-xl transition-all ${
              direction === 'out' ? 'bg-card dark:bg-muted text-danger shadow-sm' : 'text-body'
            }`}
          >
            <ArrowDownRight size={16} /> Kurangi Stok (Keluar)
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">
            Jumlah ({item.unit_name || 'Satuan'})
          </label>
          <input
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 font-mono text-base outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">
            Alasan
          </label>
          <Select
            value={reason}
            onChange={v => setReason(v)}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Correction">Koreksi Stok / Selisih Hitung</option>
            <option value="Damaged / Expired">Barang Rusak / Kadaluarsa</option>
            <option value="Return to Supplier">Retur ke Pemasok</option>
            <option value="Found in Count">Ditemukan Saat Stock Opname</option>
            <option value="Other">Lainnya</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-bold text-body uppercase tracking-wide mb-1.5">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Detail keterangan..."
          />
        </div>
        
        <div className="p-3.5 bg-muted/60 border border-line rounded-xl text-center">
          <span className="text-xs text-dim">Estimasi Total Baru: </span>
          <span className={`font-mono font-bold text-sm ${newTotal < 0 ? 'text-danger' : 'text-heading'}`}>
            {newTotal} {item.unit_name}
          </span>
        </div>
      </div>
    </Modal>
  );
}