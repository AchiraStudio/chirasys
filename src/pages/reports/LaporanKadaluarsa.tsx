import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { getExpiringItems, ExpiringItemRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';

import Select from '../../components/ui/Select';
interface Props { onBack: () => void; }

const URGENCY = (days: number) => {
  if (days <= 7)  return { label: 'KRITIS',     color: 'bg-danger-soft text-danger dark:bg-danger/30 dark:text-danger',   row: 'bg-danger-soft/50 dark:bg-danger/10' };
  if (days <= 14) return { label: 'MENDESAK',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', row: 'bg-orange-50/50 dark:bg-orange-900/10' };
  if (days <= 30) return { label: 'PERHATIAN',  color: 'bg-warning-soft text-warning dark:bg-warning/30 dark:text-warning', row: '' };
  return            { label: 'AMAN',           color: 'bg-success-soft text-success dark:bg-success/30 dark:text-success', row: '' };
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
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <ReportHeader
        title="Hampir Kadaluarsa"
        subtitle="Produk yang akan expired dalam waktu dekat"
        onBack={onBack}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-dim font-medium">Dalam</span>
          <Select
            value={String(daysAhead)}
            onChange={(v) => setDaysAhead(Number(v))}
            className="bg-card border border-line rounded-xl px-3 py-2 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d} hari
              </option>
            ))}
          </Select>
        </div>
      </ReportHeader>

      {/* Alert Banners */}
      {(critical > 0 || urgent > 0) && (
        <div className="flex gap-3">
          {critical > 0 && (
            <div className="flex-1 p-4 bg-danger-soft dark:bg-danger/20 border border-danger/30 dark:border-danger/50 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-danger shrink-0" size={24}/>
              <div>
                <p className="font-bold text-danger dark:text-danger">{critical} item KRITIS</p>
                <p className="text-xs text-danger/80 dark:text-danger/80">Kadaluarsa dalam 7 hari</p>
              </div>
            </div>
          )}
          {urgent > 0 && (
            <div className="flex-1 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-warning shrink-0" size={24}/>
              <div>
                <p className="font-bold text-orange-700 dark:text-orange-400">{urgent} item MENDESAK</p>
                <p className="text-xs text-warning/80 dark:text-orange-400/80">Kadaluarsa dalam 14 hari</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Nama Item</th>
                <th className="py-4 px-6">Batch</th>
                <th className="py-4 px-6">Tanggal Kadaluarsa</th>
                <th className="py-4 px-6 text-right">Stok</th>
                <th className="py-4 px-6 text-right">Sisa Hari</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-dim">Tidak ada produk yang akan kadaluarsa dalam {daysAhead} hari.</td></tr>
              ) : data.map((r, i) => {
                const u = URGENCY(r.days_left);
                return (
                  <tr key={`${r.sku}-${i}`} className={`hover:bg-muted/30 ${u.row}`}>
                    <td className="py-3 px-6">
                      <p className="font-bold text-heading">{r.item_name}</p>
                      <p className="text-[11px] font-mono text-dim">{r.sku}</p>
                    </td>
                    <td className="py-3 px-6 font-mono text-xs text-dim">{r.batch_no || '-'}</td>
                    <td className="py-3 px-6 text-heading">{r.expiry_date}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-heading">{r.qty.toLocaleString('id-ID')}</td>
                    <td className={`py-3 px-6 text-right font-bold tabular-nums ${r.days_left <= 7 ? 'text-danger' : r.days_left <= 14 ? 'text-warning' : 'text-warning'}`}>
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
