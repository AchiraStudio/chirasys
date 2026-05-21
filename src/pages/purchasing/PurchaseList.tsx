import { useState, useEffect } from 'react';
import { getPurchases, Purchase } from '../../lib/api';
import { Loader2, Eye, FileText } from 'lucide-react';

interface PurchaseListProps {
  branchId: string;
  onView: (id: string) => void;
}

export default function PurchaseList({ branchId, onView }: PurchaseListProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPurchases(branchId)
      .then(setPurchases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [branchId]);

  const getStatusColor = (status: string) => {
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    if (status === 'partial') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Received Goods</h1>
        <p className="text-sm text-slate-500 mt-1">Supplier invoices and received stock.</p>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="py-4 px-6">Invoice No</th>
                <th className="py-4 px-6">PO Ref</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {purchases.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">No received goods yet.</td></tr>
              ) : purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                  <td className="py-4 px-6 font-bold flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    {p.invoice_no || 'No Invoice'}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500 font-mono">{p.po_id?.split('-')[0] || '-'}</td>
                  <td className="py-4 px-6 font-mono">Rp {p.total_amount.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onView(p.id)}
                      className="p-2 text-slate-400 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}