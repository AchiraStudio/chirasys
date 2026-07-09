// Force HMR reload
import { useState, useEffect, useRef } from 'react';
import { getSales, getSaleDetail, Sale, SaleDetail } from '../../lib/api';
import { X, Loader2, Printer, RotateCcw, Trash2, AlertTriangle, FileText } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import SaleReturnModal from './SaleReturnModal';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesHistoryModal({ isOpen, onClose }: Props) {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ maxHeight: 'min(90vh, 720px)' }}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Transaksi</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? 'Memuat...' : `${sales.length} transaksi · ↑↓ navigasi · Enter lihat detail`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                    tabIndex={0}
                    onFocus={() => setSelectedIdx(idx)}
                    onClick={() => { setSelectedIdx(idx); setDetailSaleId(s.id); }}
                    className={`transition-colors cursor-pointer outline-none ${
                      selectedIdx === idx
                        ? 'bg-brand/5 dark:bg-brand/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(s.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {s.transaction_no}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {s.grand_total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : s.status === 'returned' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setDetailSaleId(s.id)}
                          title="Lihat Detail"
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 transition-colors"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => setReceiptSaleId(s.id)}
                          title="Cetak Struk"
                          className="p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                        >
                          <Printer size={14} />
                        </button>
                        {s.status === 'completed' && (
                          <button
                            onClick={() => setReturnSaleId(s.id)}
                            title="Retur"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          title="Hapus Transaksi"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sale Detail Modal */}
      {detailSaleId && (
        <SaleDetailModal saleId={detailSaleId} onClose={() => setDetailSaleId(null)} />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Hapus Transaksi?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Transaksi <strong className="font-mono">{sales.find(s => s.id === deleteConfirmId)?.transaction_no}</strong> akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
      {returnSaleId && <SaleReturnModal saleId={returnSaleId} onClose={() => { setReturnSaleId(null); fetchSales(); }} />}
    </div>
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ maxHeight: 'min(85vh, 600px)' }}>
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detail Transaksi</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {detail ? `No: ${detail.sale.transaction_no}` : 'Memuat...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-brand" /></div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold text-xs">
                    <tr>
                      <th className="py-3 px-4 text-left">Item</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Harga</th>
                      <th className="py-3 px-4 text-right">Diskon</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
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
                  <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
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
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
