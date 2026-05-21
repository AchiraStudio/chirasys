import { useEffect, useState } from 'react';
import { getProfitLoss, ProfitLossReport } from '../../lib/api';
import { Download, RefreshCw } from 'lucide-react';

export default function ReportPL() {
  const [data, setData] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
     const d = new Date();
     d.setDate(1);
     return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
     return new Date().toISOString().split('T')[0];
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getProfitLoss(startDate, endDate);
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const renderGroup = (group: any, label: string) => {
     if (!group) return null;
     return (
        <div className="mb-6">
           <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-wider mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">{label}</h3>
           {group.rows.map((row: any) => (
               <div key={row.account_code} className="flex justify-between py-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="pl-4">{row.account_name}</div>
                  <div className="tabular-nums">{row.amount.toLocaleString('id-ID')}</div>
               </div>
           ))}
           <div className="flex justify-between py-3 text-sm font-semibold text-slate-900 dark:text-white border-t border-slate-100 dark:border-slate-800 mt-2">
              <div>Total {label}</div>
              <div className="tabular-nums">{group.total.toLocaleString('id-ID')}</div>
           </div>
        </div>
     );
  };

  return (
    <div className="flex flex-col h-full fade-in">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Profit & Loss</h2>
          <p className="text-slate-600 text-sm mt-1">Income Statement (P&L) for a selected period.</p>
        </div>
        <div className="flex gap-3 items-center">
          <input 
             type="date" 
             value={startDate}
             onChange={e => setStartDate(e.target.value)}
             className="input-field py-2 text-sm w-auto"
          />
          <span className="text-slate-500">to</span>
          <input 
             type="date" 
             value={endDate}
             onChange={e => setEndDate(e.target.value)}
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
              <div className="max-w-3xl mx-auto">
                 
                 {renderGroup(data.revenue, "Revenue")}
                 {renderGroup(data.cogs, "Cost of Goods Sold")}
                 
                 <div className="flex justify-between py-4 mb-6 text-base font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 rounded-xl">
                    <div>Gross Profit</div>
                    <div className="tabular-nums">{data.gross_profit.toLocaleString('id-ID')}</div>
                 </div>

                 {renderGroup(data.expenses, "Operating Expenses")}

                 <div className={`flex justify-between py-5 text-lg font-bold px-4 rounded-xl mt-8 ${data.net_profit >= 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                    <div>Net Profit / (Loss)</div>
                    <div className="tabular-nums">{data.net_profit.toLocaleString('id-ID')}</div>
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
