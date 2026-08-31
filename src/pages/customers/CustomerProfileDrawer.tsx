import { useState, useEffect } from 'react';
import { Customer, getSales, Sale } from '../../lib/api';
import { UserCircle, Crown, Loader2, History, Award, ShoppingCart } from 'lucide-react';
import ReceiptModal from '../pos/ReceiptModal';
import Modal from '../../components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerProfileDrawer({ isOpen, onClose, customer }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer && customer.id !== 'customer_umum') {
      setLoading(true);
      getSales('branch_001', customer.id).then(data => {
        setSales(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setSales([]);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        title="Profil Pelanggan"
        subtitle="Riwayat transaksi dan status loyalitas pelanggan"
        icon={UserCircle}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <UserCircle size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{customer.name}</h3>
              <p className="text-sm text-slate-500">{customer.phone || 'Tidak ada nomor telepon'}</p>
              <div className="mt-1 flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${customer.customer_tier === 'vip' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : customer.customer_tier === 'member' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                  {customer.customer_tier === 'vip' && <Crown size={10} />}
                  {customer.customer_tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Award size={10} /> {customer.loyalty_points} Poin
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 mb-3">
              <History size={16} className="text-brand"/> Riwayat Pembelian
            </h4>
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={24} /></div>
            ) : sales.length === 0 ? (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ShoppingCart size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Belum ada riwayat transaksi.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                {sales.map(s => (
                  <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex justify-between items-center hover:border-brand/30 transition-colors">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">{new Date(s.created_at).toLocaleString('id-ID')}</p>
                      <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{s.transaction_no}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Rp {s.grand_total.toLocaleString('id-ID')}</p>
                      <button
                        type="button"
                        onClick={() => setReceiptSaleId(s.id)}
                        className="text-[10px] font-bold text-brand hover:underline mt-0.5"
                      >
                        LIHAT STRUK
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
    </>
  );
}
