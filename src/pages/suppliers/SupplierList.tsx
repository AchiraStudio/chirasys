import { useState, useEffect } from 'react';
import { getSuppliers, Supplier } from '../../lib/api';
import { Loader2, Plus, Building2, Edit2 } from 'lucide-react';
import SupplierDrawer from './SupplierDrawer';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const loadData = () => {
    setLoading(true);
    getSuppliers().then(data => { setSuppliers(data); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setSupplierToEdit(null); setIsDrawerOpen(true); };
  const openEdit = (s: Supplier) => { setSupplierToEdit(s); setIsDrawerOpen(true); };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-sm text-slate-600 mt-1">Manage vendor records for Phase 4 purchasing.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm"><Plus size={18} /> Add Supplier</button>
      </div>
      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div> : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-600 font-semibold">
              <tr><th className="py-4 px-6">Name</th><th className="py-4 px-6">Contact</th><th className="py-4 px-6">Phone</th><th className="py-4 px-6 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                  <td className="py-4 px-6 font-bold flex items-center gap-3"><Building2 size={16} className="text-slate-500" />{s.name}</td>
                  <td className="py-4 px-6">{s.contact_person || '-'}</td>
                  <td className="py-4 px-6 font-mono text-slate-600">{s.phone || '-'}</td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => openEdit(s)} className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <SupplierDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSuccess={loadData} supplierToEdit={supplierToEdit} />
    </div>
  );
}