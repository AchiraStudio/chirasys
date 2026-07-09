import { useState, useEffect } from 'react';
import { Customer, getSales, Sale } from '../../lib/api';
import { X, UserCircle, Crown, Loader2, History, Award, ShoppingCart } from 'lucide-react';
import ReceiptModal from '../pos/ReceiptModal';

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B0F19] shadow-2xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-slate-800/80 max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md z-10 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Profile</h2>
              <p className="text-sm text-slate-500">View history and loyalty status</p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                <UserCircle size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{customer.name}</h3>
                <p className="text-sm text-slate-500">{customer.phone || 'No Phone'}</p>
                <div className="mt-1 flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${customer.customer_tier === 'vip' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : customer.customer_tier === 'member' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                    {customer.customer_tier === 'vip' && <Crown size={10} />}
                    {customer.customer_tier}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Award size={10} /> {customer.loyalty_points} Pts
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><History size={16} className="text-brand"/> Purchase History</h4>
              {loading ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={24} /></div>
              ) : sales.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ShoppingCart size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-500">No purchase history found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center hover:border-brand/30 transition-colors">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">{new Date(s.created_at).toLocaleString('id-ID')}</p>
                        <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{s.transaction_no}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">Rp {s.grand_total.toLocaleString('id-ID')}</p>
                        <button onClick={() => setReceiptSaleId(s.id)} className="text-[10px] font-bold text-brand hover:underline mt-1">
                          VIEW RECEIPT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {receiptSaleId && <ReceiptModal saleId={receiptSaleId} onClose={() => setReceiptSaleId(null)} />}
    </>
  );
}
