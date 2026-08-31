import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, TrendingUp, ShoppingCart, Tag, DollarSign, ChevronDown, ChevronRight, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { getSales, getSaleDetail, exportSalesExcel, Sale, SaleDetail } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import Modal from '../../components/ui/Modal';

interface Props { onBack: () => void; }

interface DailySummary {
  date: string;           // YYYY-MM-DD
  dateLabel: string;      // Formatted display label
  sales: Sale[];
  totalRevenue: number;
  totalDiscount: number;
  totalCogs: number;
  grossProfit: number;
  transactionCount: number;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const firstOfMonth = () => { 
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; 
};

// Parse UTC string to local YYYY-MM-DD string
function getLocalDateString(isoString: string) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString.split('T')[0];
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function groupByDay(sales: Sale[]): DailySummary[] {
  const map = new Map<string, Sale[]>();
  for (const s of sales) {
    const date = getLocalDateString(s.created_at);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(s);
  }
  // Sort descending
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, daySales]) => {
      const totalRevenue = daySales.reduce((s, t) => s + t.grand_total, 0);
      const totalDiscount = daySales.reduce((s, t) => s + t.discount_amount, 0);
      const transactionCount = daySales.length;
      
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dateLabel = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return {
        date,
        dateLabel,
        sales: daySales,
        totalRevenue,
        totalDiscount,
        totalCogs: 0, 
        grossProfit: totalRevenue - totalDiscount,
        transactionCount,
      };
    });
}

export default function LaporanPenjualan({ onBack }: Props) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getSales('branch_001');
      // Filter only completed, within date range
      const filtered = data.filter(s => {
        if (s.status !== 'completed') return false;
        const sDate = getLocalDateString(s.created_at);
        return sDate >= dateFrom && sDate <= dateTo;
      });
      setAllSales(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateFrom, dateTo]);

  const dailyData = groupByDay(allSales);

  const totals = dailyData.reduce((acc, d) => ({
    trx: acc.trx + d.transactionCount,
    rev: acc.rev + d.totalRevenue,
    disc: acc.disc + d.totalDiscount,
    profit: acc.profit + d.grossProfit,
  }), { trx: 0, rev: 0, disc: 0, profit: 0 });

  const handleDeleteSale = async (saleId: string) => {
    setDeleting(true);
    try {
      await invoke('delete_sale', { id: saleId });
      setDeleteConfirmId(null);
      setDetailSaleId(null);
      await fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + (e?.message || String(e)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Laporan Penjualan</h1>
            <p className="text-xs text-slate-500">Hanya transaksi <strong>selesai</strong> · Dikelompokkan per hari</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-500 font-medium">Dari</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <label className="text-xs text-slate-500 font-medium">Sampai</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand" />
          <button onClick={fetchData} className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">
            Perbarui
          </button>
          <button
            onClick={async () => {
              try {
                const path = await save({ defaultPath: 'Laporan_Penjualan.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
                if (path) { await exportSalesExcel(path); alert('Berhasil export!'); }
              } catch (e) { alert('Gagal export'); }
            }}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-sm font-bold transition-colors border border-emerald-200 dark:border-emerald-800/30"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Transaksi', value: totals.trx.toLocaleString('id-ID'), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Penjualan', value: `Rp ${totals.rev.toLocaleString('id-ID')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Diskon', value: `Rp ${totals.disc.toLocaleString('id-ID')}`, icon: Tag, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Estimasi Laba', value: `Rp ${totals.profit.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}><c.icon size={20} /></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '...' : c.value}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Groups */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-brand" size={30} />
            <p className="text-sm text-slate-500">Memuat data penjualan...</p>
          </div>
        ) : dailyData.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            Tidak ada transaksi selesai pada periode ini.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
            {dailyData.map(day => (
              <div key={day.date}>
                {/* Day Header Row */}
                <button
                  onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left group"
                >
                  <div className="text-slate-400 group-hover:text-brand transition-colors">
                    {expandedDate === day.date ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{day.dateLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{day.transactionCount} transaksi</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 mb-0.5">Diskon</p>
                      <p className="text-sm font-semibold text-amber-600">-Rp {day.totalDiscount.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-0.5">Penjualan</p>
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">Rp {day.totalRevenue.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </button>

                {/* Expanded: individual transactions */}
                {expandedDate === day.date && (
                  <div className="bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-400 uppercase font-semibold">
                          <th className="py-2 px-6 text-left">No Transaksi</th>
                          <th className="py-2 px-4 text-left">Waktu</th>
                          <th className="py-2 px-4 text-right">Total</th>
                          <th className="py-2 px-4 text-right">Diskon</th>
                          <th className="py-2 px-4 text-right w-32">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {day.sales.map(s => (
                          <tr
                            key={s.id}
                            className="hover:bg-white dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                            onClick={() => setDetailSaleId(s.id)}
                          >
                            <td className="py-2.5 px-6 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {s.transaction_no}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-xs">
                              {new Date(s.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              Rp {s.grand_total.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-4 text-right text-amber-600 text-xs">
                              {s.discount_amount > 0 ? `-Rp ${s.discount_amount.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={e => { e.stopPropagation(); setDetailSaleId(s.id); }}
                                  title="Lihat Detail"
                                  className="p-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-400 rounded-lg transition-colors"
                                >
                                  <FileText size={13} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(s.id); }}
                                  title="Hapus transaksi ini"
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Total Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t-2 border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">TOTAL PERIODE</p>
                <p className="text-xs text-slate-500">{totals.trx} transaksi · {dailyData.length} hari</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400">Diskon</p>
                  <p className="font-bold text-amber-600">-Rp {totals.disc.toLocaleString('id-ID')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total Penjualan</p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">Rp {totals.rev.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {detailSaleId && (
        <SaleDetailModal saleId={detailSaleId} onClose={() => setDetailSaleId(null)} />
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          size="sm"
          title="Hapus Transaksi?"
          subtitle="Transaksi tidak akan masuk laporan setelah dihapus."
          icon={AlertTriangle}
          iconBg="bg-rose-50 dark:bg-rose-500/10 text-rose-500"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSale(deleteConfirmId)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Ya, Hapus
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Transaksi ini akan dihapus secara permanen dari basis data penjualan.
          </p>
        </Modal>
      )}
    </div>
  );
}

function SaleDetailModal({ saleId, onClose }: { saleId: string, onClose: () => void }) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSaleDetail(saleId)
      .then(d => setDetail(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [saleId]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="2xl"
      title="Detail Transaksi"
      subtitle={detail ? `No: ${detail.sale.transaction_no}` : 'Memuat...'}
      icon={FileText}
    >
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-brand" /></div>
      ) : detail ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Harga</th>
                  <th className="py-3 px-4 text-right">Diskon</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {detail.lines.map(line => (
                  <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {line.item_name || line.item_id}
                      <span className="text-slate-400 ml-1">({line.unit_name || line.unit_id})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{line.qty}</td>
                    <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">Rp {line.price.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                      {line.discount_amount > 0 ? `-Rp ${line.discount_amount.toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">Rp {line.subtotal.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total Belanja</td>
                  <td className="py-3 px-4 text-right text-brand">Rp {detail.sale.grand_total.toLocaleString('id-ID')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Info Pembayaran</h4>
            <div className="flex gap-4">
              {detail.payments.map(p => (
                <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">{p.method}</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Rp {p.amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-slate-500">Gagal memuat detail transaksi.</div>
      )}
    </Modal>
  );
}
