import { useState, useEffect } from 'react';
import { getSaleDetail, createSaleReturn, SaleDetail, SaleReturnLineInput } from '../../lib/api';
import { Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
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
      toast.info('Pilih setidaknya 1 barang untuk diretur.');
      return;
    }

    if (!reason.trim()) {
      toast.info('Harap isi alasan retur.');
      return;
    }

    try {
      setSubmitting(true);
      await createSaleReturn(detail.sale.id, linesToReturn, reason);
      toast.error('Retur berhasil diproses!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memproses retur: ' + err.toString());
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
          <Loader2 className="animate-spin text-primary mb-4" size={32} />
          <p className="text-sm font-medium text-dim">Memuat detail retur...</p>
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
      iconBg="bg-danger-soft dark:bg-danger/30 text-danger dark:text-danger"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            <p className="text-xs text-dim font-medium mb-0.5">Total Nilai Retur</p>
            <p className="text-xl font-bold text-danger dark:text-danger">Rp {totalReturnVal.toLocaleString('id-ID')}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-line rounded-xl text-sm font-bold text-heading hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={submitting || totalReturnVal === 0 || !reason.trim()} 
              className="px-6 py-2.5 bg-danger hover:bg-danger text-white font-bold rounded-xl shadow-lg shadow-danger/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Memproses...' : 'Proses Retur'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-warning-soft dark:bg-warning/20 text-warning dark:text-warning p-4 rounded-xl border border-warning/30 dark:border-warning/50 flex gap-3">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div className="text-xs leading-relaxed">
            <p className="font-bold mb-1 text-sm">Informasi Retur</p>
            <p>Dana akan dikembalikan (Refund) melalui Kasir dan stok akan dikembalikan ke inventaris.</p>
          </div>
        </div>

        <div className="space-y-3">
          {detail.lines.map(line => (
            <div key={line.id} className="flex items-center justify-between p-4 bg-muted/70 dark:bg-card/50 rounded-xl border border-line">
              <div>
                <p className="font-bold text-sm text-heading">{line.item_name}</p>
                <p className="text-xs text-dim mt-0.5">
                  Beli: {line.qty} {line.unit_name} @ Rp {line.price.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-dim">Qty Retur:</span>
                <input 
                  type="number" 
                  min={0} 
                  max={line.qty} 
                  value={returnQty[line.id] ?? 0} 
                  onChange={e => handleQtyChange(line.id, parseInt(e.target.value) || 0, line.qty)}
                  className="w-20 px-3 py-1.5 border border-line bg-card dark:bg-muted rounded-xl text-center font-bold text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-heading mb-1.5 uppercase tracking-wide">Alasan Retur</label>
          <textarea 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            required 
            placeholder="Barang cacat, salah barang, dll..." 
            rows={2} 
            className="w-full bg-muted border border-line rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none text-sm text-heading" 
          />
        </div>
      </div>
    </Modal>
  );
}
