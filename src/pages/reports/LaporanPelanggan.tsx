import { useState, useEffect } from 'react';
import { Loader2, Crown, Trophy, Medal } from 'lucide-react';
import { getCustomerReport, CustomerReportRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';
import { getFirstOfMonthDateString, getTodayDateString } from './reportUtils';

interface Props { onBack: () => void; }

const TIER: Record<string, { label: string; color: string; icon?: any }> = {
  regular: { label: 'Regular', color: 'bg-muted text-body dark:bg-muted dark:text-body' },
  member:  { label: 'Member',  color: 'bg-accent-soft text-accent dark:bg-accent/30 dark:text-accent' },
  vip:     { label: 'VIP',     color: 'bg-warning-soft text-warning dark:bg-warning/30 dark:text-warning', icon: Crown },
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-500 font-bold" title="Peringkat 1">
        <Trophy size={13} />
      </span>
    );
  }
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-500 dark:text-slate-300 font-bold" title="Peringkat 2">
        <Medal size={13} />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-bold" title="Peringkat 3">
        <Medal size={13} />
      </span>
    );
  }
  return <span className="text-xs font-mono text-dim font-bold pl-1.5">{rank + 1}</span>;
}

export default function LaporanPelanggan({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthDateString());
  const [dateTo, setDateTo] = useState(getTodayDateString());
  const [data, setData] = useState<CustomerReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getCustomerReport('branch_001', dateFrom, dateTo, 50)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <ReportHeader
        title="Laporan Pelanggan"
        subtitle="Total belanja terbanyak per pelanggan"
        onBack={onBack}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onFetch={fetchData}
      />

      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6">Nama Pelanggan</th>
                <th className="py-4 px-6">Tier</th>
                <th className="py-4 px-6 text-right">Transaksi</th>
                <th className="py-4 px-6 text-right">Total Belanja</th>
                <th className="py-4 px-6 text-right">Rata-rata / Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-dim">Tidak ada data pada periode ini.</td></tr>
              ) : data.map((r, i) => {
                const tier = TIER[r.customer_tier] || TIER.regular;
                const avg = r.transaction_count > 0 ? r.total_spent / r.transaction_count : 0;
                return (
                  <tr key={`${r.customer_name}-${i}`} className={`hover:bg-muted/30 ${i < 3 ? 'bg-warning-soft/30 dark:bg-warning/5' : ''}`}>
                    <td className="py-3 px-6"><RankBadge rank={i} /></td>
                    <td className="py-3 px-6 font-bold text-heading">{r.customer_name}</td>
                    <td className="py-3 px-6">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${tier.color}`}>{tier.label}</span>
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-heading">{r.transaction_count}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-heading">Rp {r.total_spent.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-dim">Rp {avg.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
