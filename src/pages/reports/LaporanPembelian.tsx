import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getPurchaseSummary, PurchaseSummaryRow } from '../../lib/api';
import ReportHeader from '../../components/reports/ReportHeader';
import { getFirstOfMonthDateString, getTodayDateString } from './reportUtils';

interface Props { onBack: () => void; }

export default function LaporanPembelian({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(getFirstOfMonthDateString());
  const [dateTo, setDateTo] = useState(getTodayDateString());
  const [data, setData] = useState<PurchaseSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try { setData(await getPurchaseSummary('branch_001', dateFrom, dateTo)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const grandTotal = data.reduce((s, r) => s + r.total_amount, 0);
  const grandPaid = data.reduce((s, r) => s + r.paid_amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in h-full">
      <ReportHeader
        title="Laporan Pembelian"
        subtitle="Ringkasan pembelian per pemasok"
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
                <th className="py-4 px-6">Pemasok</th>
                <th className="py-4 px-6 text-right">Jumlah PO</th>
                <th className="py-4 px-6 text-right">Total Pembelian</th>
                <th className="py-4 px-6 text-right">Sudah Dibayar</th>
                <th className="py-4 px-6 text-right">Sisa Hutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={28}/></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-dim">Tidak ada data pada periode ini.</td></tr>
              ) : data.map(r => (
                <tr key={r.supplier_name} className="hover:bg-muted/30">
                  <td className="py-3 px-6 font-bold text-heading">{r.supplier_name}</td>
                  <td className="py-3 px-6 text-right font-mono text-heading">{r.purchase_count}</td>
                  <td className="py-3 px-6 text-right font-mono font-semibold text-heading">Rp {r.total_amount.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-6 text-right font-mono text-success">Rp {r.paid_amount.toLocaleString('id-ID')}</td>
                  <td className={`py-3 px-6 text-right font-mono font-bold ${(r.total_amount - r.paid_amount) > 0 ? 'text-danger dark:text-danger' : 'text-dim'}`}>
                    {(r.total_amount - r.paid_amount) > 0 ? `Rp ${(r.total_amount - r.paid_amount).toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && !loading && (
              <tfoot className="bg-muted/50 border-t-2 border-line text-sm font-bold">
                <tr>
                  <td className="py-4 px-6 text-heading">TOTAL</td>
                  <td className="py-4 px-6 text-right text-heading">{data.reduce((s, r) => s + r.purchase_count, 0)}</td>
                  <td className="py-4 px-6 text-right text-heading">Rp {grandTotal.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-success">Rp {grandPaid.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-right text-danger">Rp {(grandTotal - grandPaid).toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
