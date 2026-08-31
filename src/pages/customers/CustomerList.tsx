import { useState, useEffect } from 'react';
import { getCustomers, Customer } from '../../lib/api';
import { Loader2, Plus, UserCircle, Edit2, Search, Eye } from 'lucide-react';
import CustomerModal from './CustomerModal';
import CustomerProfileDrawer from './CustomerProfileDrawer';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);

  const loadData = () => {
    setLoading(true);
    getCustomers().then(data => { setCustomers(data); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setCustomerToEdit(null); setIsModalOpen(true); };
  const openEdit = (c: Customer) => { setCustomerToEdit(c); setIsModalOpen(true); };

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
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>
        </div>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div> : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative"><table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-600 font-semibold z-10">
              <tr><th className="py-4 px-6">Name</th><th className="py-4 px-6">Phone</th><th className="py-4 px-6">Tier & Expiry</th><th className="py-4 px-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)).map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group fast-render-row">
                  <td className="py-4 px-6 font-bold flex items-center gap-3">
                    <UserCircle size={16} className="text-slate-500" />
                    {c.name} {c.id === 'customer_umum' && <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded ml-2">DEFAULT</span>}
                  </td>
                  <td className="py-4 px-6 font-mono text-slate-600">{c.phone || '-'}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTierColor(c.customer_tier)}`}>
                        {c.customer_tier}
                      </span>
                      {c.membership_expiry && c.customer_tier !== 'regular' && (
                        <span className="text-[10px] text-slate-400 font-mono" title="Membership Expiry Date">
                          Exp: {c.membership_expiry.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right flex justify-end gap-2">
                    <button onClick={() => setProfileCustomer(c)} className="p-2 text-brand bg-brand/10 hover:bg-brand/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={14} /></button>
                    <button onClick={() => openEdit(c)} className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <CustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={loadData} customerToEdit={customerToEdit} />
      <CustomerProfileDrawer isOpen={!!profileCustomer} onClose={() => setProfileCustomer(null)} customer={profileCustomer} />
    </div>
  );
}