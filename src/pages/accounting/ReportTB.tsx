import { useEffect, useState } from 'react';
import { getTrialBalance, TrialBalanceRow } from '../../lib/api';
import { Download, RefreshCw } from 'lucide-react';

export default function ReportTB() {
  const [data, setData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(() => {
     const today = new Date();
     return today.toISOString().split('T')[0];
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getTrialBalance(asOfDate);
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [asOfDate]);

  const totalDebit = data.reduce((sum, r) => sum + r.total_debit, 0);
  const totalCredit = data.reduce((sum, r) => sum + r.total_credit, 0);

  return (
    <div className="flex flex-col h-full fade-in">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Trial Balance</h2>
          <p className="text-slate-600 text-sm mt-1">Verify that total debits equal total credits.</p>
        </div>
        <div className="flex gap-3 items-center">
          <input 
             type="date" 
             value={asOfDate}
             onChange={e => setAsOfDate(e.target.value)}
             className="input-field py-2 text-sm w-auto"
          />
          <button onClick={fetchData} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 text-slate-600">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-secondary flex items-center gap-2">
             <Download size={16}/> Export
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-800 uppercase font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Account Code</th>
                <th className="px-6 py-4">Account Name</th>
                <th className="px-6 py-4 text-right">Debit Balance</th>
                <th className="px-6 py-4 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-600">Generating report...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-slate-600">No account balances found for this date.</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.account_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-3 font-mono text-indigo-600 dark:text-indigo-400">{row.code}</td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.total_debit > row.total_credit ? (row.total_debit - row.total_credit).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.total_credit > row.total_debit ? (row.total_credit - row.total_debit).toLocaleString('id-ID') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700 sticky bottom-0">
               <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-slate-600">Total</td>
                  <td className="px-6 py-4 text-right tabular-nums text-slate-900 dark:text-white">{totalDebit.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-slate-900 dark:text-white">{totalCredit.toLocaleString('id-ID')}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
