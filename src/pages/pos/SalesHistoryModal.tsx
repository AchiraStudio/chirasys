import { useState, useEffect } from 'react';
import { getSales, Sale } from '../../lib/api';
import { X, Loader2 } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import SaleReturnModal from './SaleReturnModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesHistoryModal({ isOpen, onClose }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat Transaksi</h2>
            <p className="text-sm text-slate-500">Daftar penjualan terbaru</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0B0F19]">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={32} /></div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center text-slate-500">Belum ada transaksi.</div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">No Transaksi</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {sales.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{new Date(s.created_at).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">{s.transaction_no}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">Rp {s.grand_total.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : s.status === 'returned' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex justify-end gap-2">
                        <button onClick={() => setReceiptSaleId(s.id)} className="px-3 py-1.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-lg font-semibold transition-colors">
                          Cetak
                        </button>
                        {s.status === 'completed' && (
                          <button onClick={() => setReturnSaleId(s.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg font-semibold transition-colors">
                            Retur
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
      {returnSaleId && <SaleReturnModal saleId={returnSaleId} onClose={() => { setReturnSaleId(null); fetchSales(); }} />}
    </div>
  );
}
