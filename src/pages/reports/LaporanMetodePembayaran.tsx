import { useState, useEffect } from 'react';
import { Loader2, CreditCard, Banknote, Smartphone, ArrowRightLeft } from 'lucide-react';
import { getSalesByPaymentMethod, PaymentMethodRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';
import { getFirstOfMonthDateString, getTodayDateString } from './reportUtils';

interface Props { onBack: () => void; }

const METHOD_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  cash:     { label: 'Tunai',        icon: Banknote,      color: 'bg-emerald-500' },
  transfer: { label: 'Transfer',     icon: ArrowRightLeft, color: 'bg-blue-500'   },
  debit:    { label: 'Kartu Debit',  icon: CreditCard,    color: 'bg-indigo-500'  },
  credit:   { label: 'Kartu Kredit', icon: CreditCard,    color: 'bg-purple-500'  },
  qris:     { label: 'QRIS/E-Money', icon: Smartphone,    color: 'bg-amber-500'   },
  card:     { label: 'Kartu',        icon: CreditCard,    color: 'bg-indigo-500'  },
};

export default function LaporanMetodePembayaran({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthDateString());
  const [dateTo, setDateTo] = useState(getTodayDateString());
  const [data, setData] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getSalesByPaymentMethod('branch_001', dateFrom, dateTo)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalAmount = data.reduce((s, r) => s + r.total_amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <ReportHeader
        title="Metode Pembayaran"
        subtitle="Distribusi cara bayar pelanggan"
        onBack={onBack}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onFetch={fetchData}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-brand" size={36}/></div>
      ) : data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">Tidak ada data pada periode ini.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {/* Method Cards */}
          <div className="flex flex-col gap-3">
            {data.map(r => {
              const m = METHOD_LABEL[r.method] || { label: r.method, icon: CreditCard, color: 'bg-slate-400' };
              const Icon = m.icon;
              const pct = totalAmount > 0 ? (r.total_amount / totalAmount * 100) : 0;
              return (
                <div key={r.method} className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center`}>
                        <Icon size={18} className="text-white"/>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{m.label}</p>
                        <p className="text-xs text-slate-500">{r.transaction_count} transaksi</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 dark:text-white">Rp {r.total_amount.toLocaleString('id-ID')}</p>
                      <p className="text-xs font-bold text-slate-500">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Total Pembayaran</h3>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Rp {totalAmount.toLocaleString('id-ID')}</p>
              {data.map(r => {
                const m = METHOD_LABEL[r.method] || { label: r.method, icon: CreditCard, color: 'bg-slate-400' };
                const pct = totalAmount > 0 ? (r.total_amount / totalAmount * 100) : 0;
                return (
                  <div key={r.method} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${m.color}`}/>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{m.label}</span>
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
