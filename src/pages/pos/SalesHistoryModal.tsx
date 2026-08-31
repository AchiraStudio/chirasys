// Force HMR reload
import { useState, useEffect, useRef } from 'react';
import { getSales, getSaleDetail, Sale, SaleDetail } from '../../lib/api';
import { Loader2, Printer, RotateCcw, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import ReceiptModal from './ReceiptModal';
import SaleReturnModal from './SaleReturnModal';
import { usePermissions } from '../../lib/permissions';
import Modal from '../../components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesHistoryModal({ isOpen, onClose }: Props) {
  const { can } = usePermissions();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);
  
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getSales('branch_001');
      setSales(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSales();
      setSelectedIdx(0);
    }
  }, [isOpen]);

  const handleDelete = async (saleId: string) => {
    setDeleting(true);
    try {
      await invoke('delete_sale', { id: saleId });
      setDeleteConfirmId(null);
      setDetailSaleId(null);
      await fetchSales();
    } catch (e: any) {
      alert('Gagal menghapus transaksi: ' + (e?.message || String(e)));
    } finally {
      setDeleting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (deleteConfirmId || receiptSaleId || returnSaleId || detailSaleId) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx(prev => {
            const next = Math.min(prev + 1, sales.length - 1);
            rowRefs.current[next]?.focus();
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx(prev => {
            const p = Math.max(prev - 1, 0);
            rowRefs.current[p]?.focus();
            return p;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (sales[selectedIdx]) setDetailSaleId(sales[selectedIdx].id);
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, sales, selectedIdx, deleteConfirmId, receiptSaleId, returnSaleId, detailSaleId]);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="4xl"
        title="Riwayat Transaksi"
        subtitle={loading ? 'Memuat...' : `${sales.length} transaksi · ↑↓ navigasi · Enter lihat detail`}
        icon={FileText}
        noPadding={true}
      >
        {/* Table */}
        <div className="overflow-y-auto custom-scrollbar max-h-[65vh]">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={32} /></div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center text-slate-500">Belum ada transaksi.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">No Transaksi</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {sales.map((s, idx) => (
                  <tr
                    key={s.id}
                    ref={el => { rowRefs.current[idx] = el; }}
                    onClick={() => setSelectedIdx(idx)}
                    className={`cursor-pointer transition-colors ${
                      idx === selectedIdx 
                        ? 'bg-brand/10 dark:bg-brand/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {s.transaction_no}
                      {idx === selectedIdx && (
                        <span className="ml-2 text-[10px] bg-brand text-white px-1.5 py-0.5 rounded font-sans font-normal">
                          ENTER
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      Rp {s.grand_total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : s.status === 'returned'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setReceiptSaleId(s.id)}
                          title="Cetak Ulang Struk"
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                        {can('sales.return') && (
                          <button
                            onClick={() => setReturnSaleId(s.id)}
                            title="Retur Transaksi"
                            className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        {can('sales.delete') && (
                          <button
                            onClick={() => setDeleteConfirmId(s.id)}
                            title="Hapus Transaksi"
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Detail Modal */}
      {detailSaleId && (
        <SaleDetailModal
          saleId={detailSaleId}
          onClose={() => setDetailSaleId(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          size="sm"
          title="Hapus Transaksi?"
          subtitle="Tindakan ini tidak dapat dibatalkan."
          icon={AlertTriangle}
          iconBg="bg-rose-50 dark:bg-rose-500/10 text-rose-500"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Ya, Hapus
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transaksi <strong className="font-mono">{sales.find(s => s.id === deleteConfirmId)?.transaction_no}</strong> akan dihapus permanen.
          </p>
        </Modal>
      )}

      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
      {returnSaleId && <SaleReturnModal saleId={returnSaleId} onClose={() => { setReturnSaleId(null); fetchSales(); }} />}
    </>
  );
}

function SaleDetailModal({ saleId, onClose }: { saleId: string, onClose: () => void }) {
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
      title="Detail Transaksi"
      subtitle={detail ? `No: ${detail.sale.transaction_no}` : 'Memuat...'}
      icon={FileText}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-brand" /></div>
      ) : detail ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Diskon</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {detail.lines.map(line => (
                  <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {line.item_name || line.item_id}
                      <span className="text-slate-400 ml-1">({line.unit_name || line.unit_id})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{line.qty}</td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">Rp {line.price.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                      {line.discount_amount > 0 ? `-Rp ${line.discount_amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">Rp {line.subtotal.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total Belanja</td>
                  <td className="py-3 px-4 text-right text-brand">Rp {detail.sale.grand_total.toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Info Pembayaran</h4>
            <div className="flex gap-4">
              {detail.payments.map(p => (
                <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 px-4 py-2.5 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">{p.method}</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Rp {p.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500">Gagal memuat detail transaksi.</div>
      )}
    </Modal>
  );
}
