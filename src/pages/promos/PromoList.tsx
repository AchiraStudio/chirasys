import { useEffect, useState } from 'react';
import { getPromos, deletePromo, Promo } from '../../lib/api';
import { Plus, Edit2, Trash2, Tag, Check, X } from 'lucide-react';
import PromoDrawer from './PromoDrawer';

export default function PromoList() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editPromoId, setEditPromoId] = useState<string | null>(null);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await getPromos(activeOnly);
      setPromos(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromos();
  }, [activeOnly]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this promo?')) {
      await deletePromo(id);
      fetchPromos();
    }
  };

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Tag size={24} className="text-indigo-500" />
            Promotions & Discounts
          </h1>
          <p className="text-slate-600 text-sm mt-1">Manage pricing rules, BOGOs, and tiered discounts.</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} className="rounded border-slate-300" />
            Active Only
          </label>
          <button onClick={() => { setEditPromoId(null); setIsDrawerOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Promo
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-600 bg-slate-50/50 dark:bg-slate-800/50 uppercase font-semibold sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-600">Loading promos...</td></tr>
              ) : promos.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-600">No promos found.</td></tr>
              ) : (
                promos.map(promo => (
                  <tr key={promo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                      {promo.name}
                      {promo.member_tier && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{promo.member_tier}</span>}
                    </td>
                    <td className="px-6 py-3 capitalize">{promo.promo_type.replace('_', ' ')}</td>
                    <td className="px-6 py-3 capitalize">{promo.applies_to}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${promo.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {promo.active ? <Check size={12}/> : <X size={12}/>}
                        {promo.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3">{promo.priority}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => { setEditPromoId(promo.id); setIsDrawerOpen(true); }} className="p-1.5 text-slate-500 hover:text-indigo-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(promo.id)} title="Toggle Active" className="p-1.5 text-slate-500 hover:text-amber-600 transition-colors ml-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PromoDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSaved={fetchPromos} 
        editPromoId={editPromoId} 
      />
    </div>
  );
}
