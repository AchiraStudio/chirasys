// src/components/pos/SaleDetailModal.tsx
import { useState, useEffect } from 'react';
import { getSaleDetail, SaleDetail } from '../../lib/api';
import { Loader2, Receipt } from 'lucide-react';
import Modal from '../ui/Modal';

interface SaleDetailModalProps {
  saleId: string;
  onClose: () => void;
}

export default function SaleDetailModal({ saleId, onClose }: SaleDetailModalProps) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSaleDetail(saleId)
      .then(d => setDetail(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [saleId]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="2xl"
      icon={Receipt}
      title="Detail Transaksi"
      subtitle={detail ? `No: ${detail.sale.transaction_no}` : 'Memuat data transaksi...'}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : detail ? (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-dim uppercase font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Diskon</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {detail.lines.map(line => (
                  <tr key={line.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-heading">
                      {line.item_name || line.item_id}
                      <span className="text-dim ml-1">({line.unit_name || line.unit_id})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-heading">{line.qty}</td>
                    <td className="py-3 px-4 text-right text-heading">Rp {line.price.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right text-warning">
                      {line.discount_amount > 0 ? `-Rp ${line.discount_amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-heading">Rp {line.subtotal.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-bold border-t border-line text-heading">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total Belanja</td>
                  <td className="py-3 px-4 text-right text-primary">Rp {detail.sale.grand_total.toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-bold text-dim uppercase tracking-wider mb-3">Info Pembayaran</h4>
            <div className="flex flex-wrap gap-3">
              {detail.payments.map(p => (
                <div key={p.id} className="bg-muted border border-line px-4 py-2 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold text-dim uppercase">{p.method}</span>
                  <span className="text-sm font-extrabold text-success">Rp {p.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-dim">Gagal memuat detail transaksi.</div>
      )}
    </Modal>
  );
}
