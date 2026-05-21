import { useState, useEffect } from 'react';
import { getCustomers, Customer } from '../../lib/api';
import { Loader2, Plus, UserCircle, Crown, Edit2 } from 'lucide-react';
import CustomerDrawer from './CustomerDrawer';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const loadData = () => {
    setLoading(true);
    getCustomers().then(data => { setCustomers(data); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setCustomerToEdit(null); setIsDrawerOpen(true); };
  const openEdit = (c: Customer) => { setCustomerToEdit(c); setIsDrawerOpen(true); };

  const getTierColor = (tier: string) => {
    if (tier === 'vip') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    if (tier === 'member') return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-slate-600 mt-1">Manage POS clients and loyalty tiers.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm"><Plus size={18} /> Add Customer</button>
      </div>
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div> : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-600 font-semibold">
              <tr><th className="py-4 px-6">Name</th><th className="py-4 px-6">Phone</th><th className="py-4 px-6 text-center">Tier</th><th className="py-4 px-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                  <td className="py-4 px-6 font-bold flex items-center gap-3">
                    <UserCircle size={16} className="text-slate-500" />
                    {c.name} {c.id === 'customer_umum' && <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded ml-2">DEFAULT</span>}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">{c.phone || '-'}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getTierColor(c.customer_tier)} flex items-center gap-1 w-fit mx-auto`}>
                      {c.customer_tier === 'vip' && <Crown size={10} />}
                      {c.customer_tier}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => openEdit(c)} className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <CustomerDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSuccess={loadData} customerToEdit={customerToEdit} />
    </div>
  );
}