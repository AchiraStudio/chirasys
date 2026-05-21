import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { getJournalDetail, JournalEntryWithLines } from '../../lib/api';

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
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Journal Voucher</h2>
            <p className="text-sm text-slate-600 mt-1">{detail?.entry.entry_no}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/30">
          {loading ? (
            <div className="text-center py-10 text-slate-600">Loading details...</div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-slate-600 mb-1">Date</div>
                  <div className="font-medium text-slate-900 dark:text-white">{new Date(detail.entry.date).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Source</div>
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="capitalize">{detail.entry.source_type.replace('_', ' ')}</span>
                    {detail.entry.source_type !== 'manual' && (
                        <button title="Go to source" className="text-indigo-500 hover:text-indigo-600">
                            <ExternalLink size={14}/>
                        </button>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-600 mb-1">Description</div>
                  <div className="font-medium text-slate-900 dark:text-white">{detail.entry.description || '-'}</div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-900 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {detail.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                              <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{line.account_code}</span>
                              <span>{line.account_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{line.notes || '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-right text-slate-600 dark:text-slate-400">Total</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-900 dark:text-white">{totalDebit.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4 text-right tabular-nums text-slate-900 dark:text-white">{totalCredit.toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-600">Failed to load journal voucher.</div>
          )}
        </div>
      </div>
    </>
  );
}
