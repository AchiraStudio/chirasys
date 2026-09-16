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
          <div className="text-center py-16 text-dim flex flex-col items-center justify-center">
            <Loader2 className="animate-spin mb-3 text-primary" size={28} />
            <p className="text-xs font-medium">Memuat rincian voucher jurnal...</p>
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs bg-muted/60 p-4 rounded-xl border border-line">
              <div>
                <div className="text-dim mb-1 font-semibold uppercase tracking-wider text-[10px]">Tanggal Jurnal</div>
                <div className="font-semibold text-heading text-sm">{new Date(detail.entry.date).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <div className="text-dim mb-1 font-semibold uppercase tracking-wider text-[10px]">Sumber Transaksi</div>
                <div className="font-semibold text-heading text-sm flex items-center gap-2">
                  <span className="capitalize">{detail.entry.source_type.replace('_', ' ')}</span>
                  {detail.entry.source_type !== 'manual' && (
                    <button title="Lihat sumber asli" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink size={12}/>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-span-2 pt-2 border-t border-line/60 dark:border-line">
                <div className="text-dim mb-1 font-semibold uppercase tracking-wider text-[10px]">Keterangan Transaksi</div>
                <div className="font-semibold text-heading text-sm">{detail.entry.description || '-'}</div>
              </div>
            </div>

            <div className="border border-line rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-dim bg-muted uppercase font-bold border-b border-line">
                  <tr>
                    <th className="px-4 py-3">Akun Rekening</th>
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-right">Debit (Rp)</th>
                    <th className="px-4 py-3 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {detail.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 dark:hover:bg-card/40 bg-card dark:bg-input">
                      <td className="px-4 py-3 font-semibold text-heading">
                        <div className="flex flex-col">
                          <span className="font-mono text-[10px] text-primary">{line.account_code}</span>
                          <span className="text-xs">{line.account_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-dim">{line.notes || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-heading">{line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-heading">{line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/80 font-bold border-t border-line">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right text-body">Total Balance</td>
                    <td className="px-4 py-3 text-right font-mono text-heading">Rp {totalDebit.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-mono text-heading">Rp {totalCredit.toLocaleString('id-ID')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Double-entry explanation note */}
            {detail.entry.source_type === 'sale' && (
              <div className="p-3.5 bg-accent-soft dark:bg-accent/20 border border-accent/30 dark:border-accent/40 rounded-xl flex items-start gap-3">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-accent dark:text-accent leading-relaxed">
                  <strong>Catatan Akuntansi:</strong> Total debit/kredit (Rp {totalDebit.toLocaleString('id-ID')}) adalah 2× dari nilai penjualan karena setiap transaksi menghasilkan dua pasang jurnal berpasangan: (1) Kas ↔ Pendapatan Penjualan dan (2) HPP ↔ Persediaan Barang Dagang.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 text-dim">Gagal memuat voucher jurnal.</div>
        )}
      </div>
    </Modal>
  );
}
