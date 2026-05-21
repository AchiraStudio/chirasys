import { useState, useEffect } from 'react';
import { ArrowLeft, Package, Activity, Edit, AlertCircle, TrendingUp, Tags } from 'lucide-react';
import { getItem, ItemDetailData, toggleItemActive } from '../../lib/api';

interface ItemDetailProps {
  itemId: string;
  onBack: () => void;
  onEditItem: () => void;
  refreshTrigger: number;
}

export default function ItemDetail({ itemId, onBack, onEditItem, refreshTrigger }: ItemDetailProps) {
  const [data, setData] = useState<ItemDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const result = await getItem(itemId);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId, refreshTrigger]);

  const handleToggleActive = async () => {
    await toggleItemActive(itemId);
    loadData();
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-pulse">
        <Package size={32} className="mb-4 opacity-50" />
        <p>Fetching master record...</p>
      </div>
    );
  }

  const { item, units, prices } = data;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-7xl mx-auto w-full">
      <div className="bg-white dark:bg-[#0B0F19] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand opacity-[0.03] dark:opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <button onClick={onBack} className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl transition-all hover:shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div className="h-14 w-14 bg-gradient-to-tr from-brand/10 to-indigo-500/10 text-brand rounded-2xl flex items-center justify-center border border-brand/20 shadow-inner">
            <Package size={28} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{item.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                {item.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">SKU: {item.sku}</span>
              {item.barcode && <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">EAN: {item.barcode}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={handleToggleActive} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2">
            <Activity size={16} className={item.is_active ? "text-rose-500" : "text-emerald-500"} />
            {item.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
          <button onClick={onEditItem} className="px-5 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-all shadow-sm shadow-brand/20 flex items-center gap-2">
            <Edit size={16} /> Edit Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg"><TrendingUp size={18} /></div>
            <h3 className="font-bold text-slate-900 dark:text-white">Unit Conversions</h3>
          </div>
          <div className="flex-1">
            {units.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle size={32} className="text-amber-500 mb-3 opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No units defined</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">This is likely an old record. Click "Edit Record" to add base units and conversions.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr><th className="py-3 px-5">Unit Name</th><th className="py-3 px-5">Conversion Rate</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {units.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">{u.unit_name}</td>
                      <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">{u.is_base ? <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold uppercase">Base Unit (1)</span> : <span>= {u.conversion} Base Units</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><Tags size={18} /></div>
            <h3 className="font-bold text-slate-900 dark:text-white">Pricing Matrix</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            {units.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No pricing available</p>
                <p className="text-sm text-slate-500 mt-1">Prices require units to be set first.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr><th className="py-3 px-5">Unit</th><th className="py-3 px-5">Regular</th><th className="py-3 px-5">Member</th><th className="py-3 px-5">VIP</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {units.map(u => {
                    const regular = prices.find(p => p.unit_id === u.id && p.customer_tier === 'regular')?.price || 0;
                    const member = prices.find(p => p.unit_id === u.id && p.customer_tier === 'member')?.price || 0;
                    const vip = prices.find(p => p.unit_id === u.id && p.customer_tier === 'vip')?.price || 0;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">{u.unit_name}</td>
                        <td className="py-3.5 px-5"><span className="font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50">Rp {regular.toLocaleString('id-ID')}</span></td>
                        <td className="py-3.5 px-5"><span className="font-mono bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">Rp {member.toLocaleString('id-ID')}</span></td>
                        <td className="py-3.5 px-5"><span className="font-mono bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800/50">Rp {vip.toLocaleString('id-ID')}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}