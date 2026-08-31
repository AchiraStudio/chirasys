import { useState, useEffect } from 'react';
import { getSaleDetail, createSaleReturn, SaleDetail, SaleReturnLineInput } from '../../lib/api';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import Modal from '../../components/ui/Modal';

interface Props {
  saleId: string;
  onClose: () => void;
}

export default function SaleReturnModal({ saleId, onClose }: Props) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSaleDetail(saleId).then(res => {
      setDetail(res);
      const initialQtys: Record<string, number> = {};
      res.lines.forEach(l => {
        initialQtys[l.id] = 0;
      });
      setReturnQty(initialQtys);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [saleId]);

  const handleSubmit = async () => {
    if (!detail) return;
    const linesToReturn: SaleReturnLineInput[] = [];
    detail.lines.forEach(l => {
      const qty = returnQty[l.id] || 0;
      if (qty > 0) {
        linesToReturn.push({
          sale_line_id: l.id,
          item_id: l.item_id,
          unit_id: l.unit_id,
          qty,
          price: l.price,
          hpp_value: l.hpp_value
        });
      }
    });

    if (linesToReturn.length === 0) {
      alert('Pilih setidaknya 1 barang untuk diretur.');
      return;
    }

    if (!reason.trim()) {
      alert('Harap isi alasan retur.');
      return;
    }

    try {
      setSubmitting(true);
      await createSaleReturn(detail.sale.id, linesToReturn, reason);
      alert('Retur berhasil diproses!');
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses retur: ' + err.toString());
    } finally {
      setSubmitting(false);
    }
  };

  const handleQtyChange = (lineId: string, val: number, max: number) => {
    let newQty = val;
    if (newQty < 0) newQty = 0;
    if (newQty > max) newQty = max;
    setReturnQty(prev => ({ ...prev, [lineId]: newQty }));
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} size="sm">
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-brand mb-4" size={32} />
          <p className="text-sm font-medium text-slate-500">Memuat detail retur...</p>
        </div>
      </Modal>
    );
  }

  if (!detail) return null;

  const totalReturnVal = detail.lines.reduce((sum, line) => {
    const rq = returnQty[line.id] || 0;
    const unitPrice = line.price - (line.discount_amount / line.qty);
    return sum + (rq * unitPrice);
  }, 0);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="3xl"
      title="Proses Retur Penjualan"
      subtitle={detail.sale.transaction_no}
      icon={RotateCcw}
      iconBg="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-0.5">Total Nilai Retur</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-500">Rp {totalReturnVal.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={submitting || totalReturnVal === 0 || !reason.trim()} 
              className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Memproses...' : 'Proses Retur'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs leading-relaxed">
            <p className="font-bold mb-1 text-sm">Informasi Retur</p>
            <p>Dana akan dikembalikan (Refund) melalui Kasir dan stok akan dikembalikan ke inventaris.</p>
          </div>
        </div>

        <div className="space-y-3">
          {detail.lines.map(line => (
            <div key={line.id} className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{line.item_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Beli: {line.qty} {line.unit_name} @ Rp {line.price.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Qty Retur:</span>
                <input 
                  type="number" 
                  min={0} 
                  max={line.qty} 
                  value={returnQty[line.id] ?? 0} 
                  onChange={e => handleQtyChange(line.id, parseInt(e.target.value) || 0, line.qty)}
                  className="w-20 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-center font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Alasan Retur</label>
          <textarea 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            required 
            placeholder="Barang cacat, salah barang, dll..." 
            rows={2} 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand resize-none text-sm text-slate-900 dark:text-white" 
          />
        </div>
      </div>
    </Modal>
  );
}
