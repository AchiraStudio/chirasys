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
          <h2 className="text-xl font-bold tracking-tight text-heading">Trial Balance</h2>
          <p className="text-body text-sm mt-1">Verify that total debits equal total credits.</p>
        </div>
        <div className="flex gap-3 items-center">
          <input 
             type="date" 
             value={asOfDate}
             onChange={e => setAsOfDate(e.target.value)}
             className="input-field py-2 text-sm w-auto"
          />
          <button onClick={fetchData} className="p-2 border border-line rounded-lg hover:bg-muted text-body">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-secondary flex items-center gap-2">
             <Download size={16}/> Export
          </button>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border border-line shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-body bg-muted dark:bg-muted uppercase font-semibold sticky top-0 border-b border-line">
              <tr>
                <th className="px-6 py-4">Account Code</th>
                <th className="px-6 py-4">Account Name</th>
                <th className="px-6 py-4 text-right">Debit Balance</th>
                <th className="px-6 py-4 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-10 text-body">Generating report...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-body">No account balances found for this date.</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.account_id} className="hover:bg-muted/50 dark:hover:bg-muted/20">
                    <td className="px-6 py-3 font-mono text-primary dark:text-primary">{row.code}</td>
                    <td className="px-6 py-3 font-medium text-heading">{row.name}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.total_debit > row.total_credit ? (row.total_debit - row.total_credit).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{row.total_credit > row.total_debit ? (row.total_credit - row.total_debit).toLocaleString('id-ID') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted dark:bg-muted font-bold border-t border-line sticky bottom-0">
               <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-body">Total</td>
                  <td className="px-6 py-4 text-right tabular-nums text-heading">{totalDebit.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-heading">{totalCredit.toLocaleString('id-ID')}</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
