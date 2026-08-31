import { useEffect, useState } from 'react';
import { ExternalLink, Receipt, Info, Loader2 } from 'lucide-react';
import { getJournalDetail, JournalEntryWithLines } from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface JournalVoucherProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string | null;
}

export default function JournalVoucher({ isOpen, onClose, entryId }: JournalVoucherProps) {
  const [detail, setDetail] = useState<JournalEntryWithLines | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entryId) {
      loadDetail();
    } else {
      setDetail(null);
    }
  }, [isOpen, entryId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await getJournalDetail(entryId!);
      setDetail(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const totalDebit = detail?.lines.reduce((sum, l) => sum + l.debit, 0) || 0;
  const totalCredit = detail?.lines.reduce((sum, l) => sum + l.credit, 0) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title="Voucher Jurnal Akuntansi"
      subtitle={detail ? `Nomor Bukti: ${detail.entry.entry_no}` : 'Memuat data...'}
      icon={Receipt}
    >
      <div>
        {loading ? (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-3 text-brand" size={28} />
            <p className="text-xs font-medium">Memuat rincian voucher jurnal...</p>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div>
                <div className="text-slate-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">Tanggal Jurnal</div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{new Date(detail.entry.date).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">Sumber Transaksi</div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="capitalize">{detail.entry.source_type.replace('_', ' ')}</span>
                  {detail.entry.source_type !== 'manual' && (
                    <button title="Lihat sumber asli" className="text-brand hover:underline flex items-center gap-1">
                      <ExternalLink size={12}/>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="text-slate-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">Keterangan Transaksi</div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{detail.entry.description || '-'}</div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900 uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Akun Rekening</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Debit (Rp)</th>
                    <th className="px-4 py-3 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detail.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 bg-white dark:bg-slate-950">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-brand">{line.account_code}</span>
                          <span className="text-xs">{line.account_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{line.notes || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">{line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-800">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">Total Balance</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">Rp {totalDebit.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">Rp {totalCredit.toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Double-entry explanation note */}
            {detail.entry.source_type === 'sale' && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-brand shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  <strong>Catatan Akuntansi:</strong> Total debit/kredit (Rp {totalDebit.toLocaleString('id-ID')}) adalah 2× dari nilai penjualan karena setiap transaksi menghasilkan dua pasang jurnal berpasangan: (1) Kas ↔ Pendapatan Penjualan dan (2) HPP ↔ Persediaan Barang Dagang.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">Gagal memuat voucher jurnal.</div>
        )}
      </div>
    </Modal>
  );
}
