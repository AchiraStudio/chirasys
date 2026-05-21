import { useEffect, useState } from 'react';
import { getBalanceSheet, BalanceSheet as BalanceSheetData } from '../../lib/api';
import { Download, RefreshCw } from 'lucide-react';

export default function ReportBS() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(() => {
     return new Date().toISOString().split('T')[0];
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet(asOfDate);
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [asOfDate]);

  const renderSection = (title: string, rows: any[], total: number) => (
      <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
         <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-sm tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">{title}</h3>
         <div className="space-y-3 mb-6">
             {rows.map((row: any) => (
                 <div key={row.account_code} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <div>{row.account_name}</div>
                    <div className="tabular-nums">{row.amount.toLocaleString('id-ID')}</div>
                 </div>
             ))}
         </div>
         <div className="flex justify-between py-3 text-sm font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700">
            <div>Total {title}</div>
            <div className="tabular-nums">{total.toLocaleString('id-ID')}</div>
         </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full fade-in">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Balance Sheet</h2>
          <p className="text-slate-600 text-sm mt-1">Snapshot of Assets, Liabilities, and Equity.</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-slate-600">As of</span>
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
        <div className="overflow-y-auto flex-1 p-8 custom-scrollbar">
           {loading ? (
              <div className="text-center py-10 text-slate-600">Generating report...</div>
           ) : data ? (
              <div className="flex flex-col lg:flex-row gap-8">
                 
                 {/* Left Side: Assets */}
                 <div className="flex-1 flex flex-col">
                     {renderSection("Assets", data.assets, data.total_assets)}
                     
                     <div className="mt-8 flex justify-between py-4 text-base font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-6 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                        <div>Total Assets</div>
                        <div className="tabular-nums">{data.total_assets.toLocaleString('id-ID')}</div>
                     </div>
                 </div>

                 {/* Right Side: Liabilities & Equity */}
                 <div className="flex-1 flex flex-col gap-6">
                     {renderSection("Liabilities", data.liabilities, data.liabilities.reduce((sum, r) => sum + r.amount, 0))}
                     {renderSection("Equity", data.equity, data.equity.reduce((sum, r) => sum + r.amount, 0))}

                     <div className={`mt-auto flex justify-between py-4 text-base font-bold px-6 rounded-xl border ${data.total_assets === data.total_liabilities_equity ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400'}`}>
                        <div>Total Liabilities & Equity</div>
                        <div className="tabular-nums">{data.total_liabilities_equity.toLocaleString('id-ID')}</div>
                     </div>
                 </div>

              </div>
           ) : (
              <div className="text-center py-10 text-slate-600">No data available.</div>
           )}
        </div>
      </div>
    </div>
  );
}
