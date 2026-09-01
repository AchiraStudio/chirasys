import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getExpiringItems, ExpiringItemRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';

interface Props { onBack: () => void; }

const URGENCY = (days: number) => {
  if (days <= 7)  return { label: 'KRITIS',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',   row: 'bg-rose-50/50 dark:bg-rose-900/10' };
  if (days <= 14) return { label: 'MENDESAK',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', row: 'bg-orange-50/50 dark:bg-orange-900/10' };
  if (days <= 30) return { label: 'PERHATIAN',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', row: '' };
  return            { label: 'AMAN',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', row: '' };
};

export default function LaporanKadaluarsa({ onBack }: Props) {
  const [daysAhead, setDaysAhead] = useState(30);
  const [data, setData] = useState<ExpiringItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getExpiringItems('branch_001', daysAhead)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [daysAhead]);

  const critical = data.filter(r => r.days_left <= 7).length;
  const urgent   = data.filter(r => r.days_left > 7 && r.days_left <= 14).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      <ReportHeader
        title="Hampir Kadaluarsa"
        subtitle="Produk yang akan expired dalam waktu dekat"
        onBack={onBack}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Dalam</span>
          <select
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d} hari
              </option>
            ))}
          </select>
        </div>
      </ReportHeader>

      {/* Alert Banners */}
      {(critical > 0 || urgent > 0) && (
        <div className="flex gap-3">
          {critical > 0 && (
            <div className="flex-1 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="text-rose-600 shrink-0" size={24}/>
              <div>
                <p className="font-bold text-rose-700 dark:text-rose-400">{critical} item KRITIS</p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80">Kadaluarsa dalam 7 hari</p>
              </div>
            </div>
          )}
          {urgent > 0 && (
            <div className="flex-1 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="text-orange-600 shrink-0" size={24}/>
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400">{urgent} item MENDESAK</p>
                <p className="text-xs text-orange-600/80 dark:text-orange-400/80">Kadaluarsa dalam 14 hari</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Nama Item</th>
                <th className="py-4 px-6">Batch</th>
                <th className="py-4 px-6">Tanggal Kadaluarsa</th>
                <th className="py-4 px-6 text-right">Stok</th>
                <th className="py-4 px-6 text-right">Sisa Hari</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-brand mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-500">Tidak ada produk yang akan kadaluarsa dalam {daysAhead} hari.</td></tr>
              ) : data.map((r, i) => {
                const u = URGENCY(r.days_left);
                return (
                  <tr key={`${r.sku}-${i}`} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${u.row}`}>
                    <td className="py-3 px-6">
                      <p className="font-bold text-slate-900 dark:text-white">{r.item_name}</p>
                      <p className="text-[11px] font-mono text-slate-500">{r.sku}</p>
                    </td>
                    <td className="py-3 px-6 font-mono text-xs text-slate-500">{r.batch_no || '-'}</td>
                    <td className="py-3 px-6 text-slate-700 dark:text-slate-300">{r.expiry_date}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-slate-900 dark:text-white">{r.qty.toLocaleString('id-ID')}</td>
                    <td className={`py-3 px-6 text-right font-bold tabular-nums ${r.days_left <= 7 ? 'text-rose-600' : r.days_left <= 14 ? 'text-orange-600' : 'text-amber-600'}`}>
                      {r.days_left} hari
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.color}`}>{u.label}</span>
                    </td>
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
