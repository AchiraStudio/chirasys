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
    if (tier === 'vip') return 'bg-warning-soft text-warning border-warning/30 dark:bg-warning/30 dark:text-warning dark:border-warning';
    if (tier === 'member') return 'bg-accent-soft text-accent border-accent/30 dark:bg-accent/30 dark:text-accent dark:border-accent';
    return 'bg-muted text-body border-line dark:bg-muted dark:text-body dark:border-line-strong';
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-heading">Data Pelanggan (CRM)</h1>
          <p className="text-xs text-dim mt-0.5">Kelola data pelanggan, riwayat transaksi, dan tingkatan membership loyalitas.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer">
          <Plus size={15} /> Tambah Pelanggan
        </button>
      </div>
      <div className="bg-card rounded-xl border border-line shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-line flex gap-4 bg-muted/50 dark:bg-card/30">
          <div className="flex-1 flex items-center bg-card border border-line rounded-lg px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search size={16} className="text-dim mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..." 
              className="bg-transparent border-none outline-none text-sm w-full text-heading placeholder:text-dim" 
            />
          </div>
        </div>
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div> : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative"><table className="w-full text-left">
            <thead className="sticky top-0 bg-background border-b border-line text-xs uppercase text-body font-semibold z-10">
              <tr><th className="py-4 px-6">Name</th><th className="py-4 px-6">Phone</th><th className="py-4 px-6">Tier & Expiry</th><th className="py-4 px-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-line dark:divide-line/60 text-sm">
              {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)).map(c => (
                <tr key={c.id} className="hover:bg-muted/40 group fast-render-row">
                  <td className="py-4 px-6 font-bold flex items-center gap-3">
                    <UserCircle size={16} className="text-dim" />
                    {c.name} {c.id === 'customer_umum' && <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded ml-2">DEFAULT</span>}
                  </td>
                  <td className="py-4 px-6 font-mono text-body">{c.phone || '-'}</td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getTierColor(c.customer_tier)}`}>
                        {c.customer_tier}
                      </span>
                      {c.membership_expiry && c.customer_tier !== 'regular' && (
                        <span className="text-[10px] text-dim font-mono" title="Membership Expiry Date">
                          Exp: {c.membership_expiry.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right flex justify-end gap-2">
                    <button onClick={() => setProfileCustomer(c)} className="p-2 text-primary bg-primary-soft hover:bg-primary-soft rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Eye size={14} /></button>
                    <button onClick={() => openEdit(c)} className="p-2 text-dim hover:text-primary bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
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