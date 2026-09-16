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
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-line">
            <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <UserCircle size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-heading">{customer.name}</h3>
              <p className="text-sm text-dim">{customer.phone || 'Tidak ada nomor telepon'}</p>
              <div className="mt-1 flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${customer.customer_tier === 'vip' ? 'bg-warning-soft text-warning border-warning/30 dark:bg-warning/30 dark:text-warning dark:border-warning' : customer.customer_tier === 'member' ? 'bg-accent-soft text-accent border-accent/30 dark:bg-accent/30 dark:text-accent dark:border-accent' : 'bg-muted text-body border-line dark:bg-muted dark:text-body dark:border-line-strong'}`}>
                  {customer.customer_tier === 'vip' && <Crown size={10} />}
                  {customer.customer_tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/30 flex items-center gap-1">
                  <Award size={10} /> {customer.loyalty_points} Poin
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-heading text-sm flex items-center gap-2 mb-3">
              <History size={16} className="text-primary"/> Riwayat Pembelian
            </h4>
            {loading ? (
              <div className="py-10 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={24} /></div>
            ) : sales.length === 0 ? (
              <div className="py-10 text-center bg-muted/30 rounded-xl border border-line">
                <ShoppingCart size={32} className="mx-auto text-dim dark:text-body mb-2" />
                <p className="text-xs text-dim font-medium">Belum ada riwayat transaksi.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
                {sales.map(s => (
                  <div key={s.id} className="bg-card border border-line rounded-xl p-3.5 flex justify-between items-center hover:border-primary/30 transition-colors">
                    <div>
                      <p className="text-xs text-dim mb-0.5">{new Date(s.created_at).toLocaleString('id-ID')}</p>
                      <p className="font-mono text-sm font-semibold text-heading">{s.transaction_no}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success dark:text-success text-sm">Rp {s.grand_total.toLocaleString('id-ID')}</p>
                      <button
                        type="button"
                        onClick={() => setReceiptSaleId(s.id)}
                        className="text-[10px] font-bold text-primary hover:underline mt-0.5"
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
