// src/components/pos/SaleDetailModal.tsx
import { useState, useEffect } from 'react';
import { getSaleDetail, SaleDetail } from '../../lib/api';
import { Loader2, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-card rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in duration-200"
        style={{ maxHeight: 'min(85vh, 600px)' }}
      >
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-muted/50 dark:bg-card/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-heading">Detail Transaksi</h2>
            <p className="text-xs text-dim mt-0.5">
              {detail ? `No: ${detail.sale.transaction_no}` : 'Memuat...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-line dark:hover:bg-muted rounded-full text-dim transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-line overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted dark:bg-muted text-dim uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3 px-4 text-left">Item</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Harga</th>
                      <th className="py-3 px-4 text-right">Diskon</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-line">
                    {detail.lines.map(line => (
                      <tr key={line.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium text-heading">
                          {line.item_name || line.item_id}
                          <span className="text-dim ml-1">({line.unit_name || line.unit_id})</span>
                        </td>
                        <td className="py-3 px-4 text-center text-heading">{line.qty}</td>
                        <td className="py-3 px-4 text-right text-heading">Rp {line.price.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-right text-warning dark:text-warning">
                          {line.discount_amount > 0 ? `-Rp ${line.discount_amount.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-heading">Rp {line.subtotal.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted dark:bg-muted/50 font-bold border-t border-line text-heading">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right">Total Belanja</td>
                      <td className="py-3 px-4 text-right text-primary">Rp {detail.sale.grand_total.toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <h4 className="text-xs font-bold text-dim uppercase tracking-wider mb-3">Info Pembayaran</h4>
                <div className="flex gap-4">
                  {detail.payments.map(p => (
                    <div key={p.id} className="bg-muted dark:bg-muted border border-line px-4 py-2 rounded-xl flex items-center gap-3">
                      <span className="text-xs font-bold text-dim uppercase">{p.method}</span>
                      <span className="text-sm font-extrabold text-success dark:text-success">Rp {p.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-dim">Gagal memuat detail transaksi.</div>
          )}
        </div>
      </div>
    </div>
  );
}
