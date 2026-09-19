import { useState, useEffect, useRef } from 'react';
import { getSales, Sale } from '../../lib/api';
import { Loader2, Printer, RotateCcw, Trash2, FileText } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import SaleReturnModal from './SaleReturnModal';
import SaleDetailModal from '../../components/pos/SaleDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/ui/Modal';
import { usePermissions } from '../../lib/permissions';
import { invoke } from '@tauri-apps/api/core';



import { toast } from '../../components/ui/Toast';
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

  useEffect(() => {
    if (!isOpen) return;
    const handleSync = () => {
      fetchSales();
    };
    window.addEventListener('chirasys:sync', handleSync);
    return () => window.removeEventListener('chirasys:sync', handleSync);
  }, [isOpen]);

  const handleDelete = async (saleId: string) => {
    setDeleting(true);
    try {
      await invoke('delete_sale', { id: saleId });
      setDeleteConfirmId(null);
      setDetailSaleId(null);
      await fetchSales();
    } catch (e: any) {
      toast.error('Gagal menghapus transaksi: ' + (e?.message || String(e)));
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
            <div className="py-20 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={32} /></div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center text-dim">Belum ada transaksi.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">No Transaksi</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line/60">
                {sales.map((s, idx) => (
                  <tr
                    key={s.id}
                    ref={el => { rowRefs.current[idx] = el; }}
                    onClick={() => setSelectedIdx(idx)}
                    className={`cursor-pointer transition-colors ${
                      idx === selectedIdx 
                        ? 'bg-primary-soft dark:bg-primary-soft' 
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-dim">
                      {new Date(s.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-heading">
                      {s.transaction_no}
                      {idx === selectedIdx && (
                        <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-sans font-normal">
                          ENTER
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-heading">
                      Rp {s.grand_total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.status === 'completed'
                          ? 'bg-success-soft text-success dark:bg-success/30 dark:text-success'
                          : s.status === 'returned'
                            ? 'bg-warning-soft text-warning dark:bg-warning/30 dark:text-warning'
                            : 'bg-danger-soft text-danger dark:bg-danger/30 dark:text-danger'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setReceiptSaleId(s.id)}
                          title="Cetak Ulang Struk"
                          className="p-1.5 hover:bg-line dark:hover:bg-line-strong rounded-lg text-body transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                        {can('sales.return') && (
                          <button
                            onClick={() => setReturnSaleId(s.id)}
                            title="Retur Transaksi"
                            className="p-1.5 hover:bg-warning-soft dark:hover:bg-warning/30 text-warning dark:text-warning rounded-lg transition-colors"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        {can('sales.delete') && (
                          <button
                            onClick={() => setDeleteConfirmId(s.id)}
                            title="Hapus Transaksi"
                            className="p-1.5 hover:bg-danger-soft dark:hover:bg-danger/30 text-danger rounded-lg transition-colors"
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
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Hapus Transaksi?"
        message={
          <p>
            Transaksi{' '}
            <strong className="font-mono">
              {sales.find(s => s.id === deleteConfirmId)?.transaction_no}
            </strong>{' '}
            akan dihapus permanen.
          </p>
        }
        loading={deleting}
      />

      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
      {returnSaleId && <SaleReturnModal saleId={returnSaleId} onClose={() => { setReturnSaleId(null); fetchSales(); }} />}
    </>
  );
}
