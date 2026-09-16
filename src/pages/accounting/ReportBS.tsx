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
      <div className="flex-1 bg-muted dark:bg-muted/50 p-6 rounded-xl border border-line">
         <h3 className="font-bold text-heading uppercase text-sm tracking-wider mb-4 border-b border-line pb-2">{title}</h3>
         <div className="space-y-3 mb-6">
             {rows.map((row: any) => (
                 <div key={row.account_code} className="flex justify-between text-sm text-body">
                    <div>{row.account_name}</div>
                    <div className="tabular-nums">{row.amount.toLocaleString('id-ID')}</div>
                 </div>
             ))}
         </div>
         <div className="flex justify-between py-3 text-sm font-bold text-heading border-t border-line">
            <div>Total {title}</div>
            <div className="tabular-nums">{total.toLocaleString('id-ID')}</div>
         </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full fade-in">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-heading">Balance Sheet</h2>
          <p className="text-body text-sm mt-1">Snapshot of Assets, Liabilities, and Equity.</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-body">As of</span>
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
        <div className="overflow-y-auto flex-1 p-8 custom-scrollbar">
           {loading ? (
              <div className="text-center py-10 text-body">Generating report...</div>
           ) : data ? (
              <div className="flex flex-col lg:flex-row gap-8">
                 
                 {/* Left Side: Assets */}
                 <div className="flex-1 flex flex-col">
                     {renderSection("Assets", data.assets, data.total_assets)}
                     
                     <div className="mt-8 flex justify-between py-4 text-base font-bold text-primary-hover dark:text-primary bg-primary-soft dark:bg-primary-soft px-6 rounded-xl border border-primary-soft dark:border-primary/20">
                        <div>Total Assets</div>
                        <div className="tabular-nums">{data.total_assets.toLocaleString('id-ID')}</div>
                     </div>
                 </div>

                 {/* Right Side: Liabilities & Equity */}
                 <div className="flex-1 flex flex-col gap-6">
                     {renderSection("Liabilities", data.liabilities, data.liabilities.reduce((sum, r) => sum + r.amount, 0))}
                     {renderSection("Equity", data.equity, data.equity.reduce((sum, r) => sum + r.amount, 0))}

                     <div className={`mt-auto flex justify-between py-4 text-base font-bold px-6 rounded-xl border ${data.total_assets === data.total_liabilities_equity ? 'bg-success-soft text-success border-success/30 dark:bg-success/20 dark:text-success' : 'bg-danger-soft text-red-800 border-danger/30 dark:bg-red-900/20 dark:text-red-400'}`}>
                        <div>Total Liabilities & Equity</div>
                        <div className="tabular-nums">{data.total_liabilities_equity.toLocaleString('id-ID')}</div>
                     </div>
                 </div>

              </div>
           ) : (
              <div className="text-center py-10 text-body">No data available.</div>
           )}
        </div>
      </div>
    </div>
  );
}
