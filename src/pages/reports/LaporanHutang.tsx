// src/pages/reports/LaporanHutang.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOutstandingPayables, OutstandingPayableRow } from '../../lib/api';

interface Props { onBack: () => void; }

export default function LaporanHutang({ onBack }: Props) {
  const [data, setData] = useState<OutstandingPayableRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getOutstandingPayables('branch_001')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalBalance = data.reduce((s, r) => s + r.balance, 0);
  const overdue = data.filter(r => {
    const days = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days > 30;
  }).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted text-dim transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-heading">Hutang Dagang</h1>
            <p className="text-xs text-dim">Tagihan belum lunas ke pemasok</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 bg-card border border-line rounded-xl text-dim hover:bg-muted transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-line p-5">
          <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-1">Total Hutang</p>
          <p className="text-2xl font-extrabold text-danger dark:text-danger">Rp {totalBalance.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-card rounded-xl border border-line p-5">
          <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-1">Jumlah Invoice</p>
          <p className="text-2xl font-extrabold text-heading">{data.length}</p>
        </div>
        <div className={`rounded-xl border p-5 ${overdue > 0 ? 'bg-warning-soft dark:bg-warning/10 border-warning/30 dark:border-warning/40' : 'bg-card border-line'}`}>
          <p className="text-xs font-semibold text-dim uppercase tracking-wide mb-1">Lewat 30 Hari</p>
          <p className={`text-2xl font-extrabold ${overdue > 0 ? 'text-warning dark:text-warning' : 'text-heading'}`}>{overdue}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b border-line text-xs uppercase text-dim font-semibold sticky top-0">
              <tr>
                <th className="py-4 px-6">Pemasok</th>
                <th className="py-4 px-6">No. Invoice</th>
                <th className="py-4 px-6 text-right">Total</th>
                <th className="py-4 px-6 text-right">Sudah Bayar</th>
                <th className="py-4 px-6 text-right">Sisa</th>
                <th className="py-4 px-6">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-success font-medium"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} /> Tidak ada hutang yang belum dibayar.</span></td></tr>
              ) : data.map(r => {
                const daysOld = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24));
                const isOld = daysOld > 30;
                return (
                  <tr key={r.purchase_id} className={`hover:bg-muted/30 ${isOld ? 'bg-warning-soft/50 dark:bg-warning/5' : ''}`}>
                    <td className="py-3 px-6 font-bold text-heading">{r.supplier_name}</td>
                    <td className="py-3 px-6 font-mono text-xs text-dim">{r.invoice_no || 'N/A'}</td>
                    <td className="py-3 px-6 text-right font-mono text-heading">Rp {r.total_amount.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono text-success">Rp {r.paid_amount.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-danger dark:text-danger">Rp {r.balance.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1">
                        {isOld && <AlertTriangle size={12} className="text-warning" />}
                        <span className={`text-xs ${isOld ? 'text-warning dark:text-warning font-semibold' : 'text-dim'}`}>
                          {new Date(r.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {data.length > 0 && !loading && (
              <tfoot className="bg-muted/50 border-t-2 border-line text-sm font-bold">
                <tr>
                  <td className="py-4 px-6 text-heading" colSpan={4}>TOTAL HUTANG</td>
                  <td className="py-4 px-6 text-right text-danger dark:text-danger">Rp {totalBalance.toLocaleString('id-ID')}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
