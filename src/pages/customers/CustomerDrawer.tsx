import { useState, useEffect } from 'react';
import { X, Save, UserCircle, Loader2 } from 'lucide-react';
import { Customer, addCustomer, updateCustomer } from '../../lib/api';

interface CustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerToEdit?: Customer | null;
}

export default function CustomerDrawer({ isOpen, onClose, onSuccess, customerToEdit }: CustomerDrawerProps) {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', region: '', customer_tier: 'regular', credit_limit: 0, notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setFormData({
          name: customerToEdit.name, phone: customerToEdit.phone || '', email: customerToEdit.email || '',
          address: customerToEdit.address || '', region: customerToEdit.region || '', customer_tier: customerToEdit.customer_tier, credit_limit: customerToEdit.credit_limit, notes: customerToEdit.notes || ''
        });
      } else {
        setFormData({ name: '', phone: '', email: '', address: '', region: '', customer_tier: 'regular', credit_limit: 0, notes: '' });
      }
    }
  }, [isOpen, customerToEdit]);

  const handleSubmit = async () => {
    if (!formData.name) return alert("Customer Name is required.");
    setIsSubmitting(true);
    try {
      if (customerToEdit) { await updateCustomer(customerToEdit.id, formData.name, formData.phone, formData.email, formData.address, formData.region, formData.customer_tier, formData.credit_limit, formData.notes); } 
      else { await addCustomer(formData.name, formData.phone, formData.email, formData.address, formData.region, formData.customer_tier, formData.credit_limit, formData.notes); }
      onSuccess();
      onClose();
    } catch (error) { alert(`Failed to save: ${error}`); } 
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B0F19] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
        
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg"><UserCircle size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{customerToEdit ? 'Edit Customer' : 'New Customer'}</h2>
              <p className="text-xs text-slate-500 font-medium">Manage POS client details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <div><label className="block text-xs font-semibold mb-1.5">Customer Name *</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" disabled={customerToEdit?.id === 'customer_umum'} /></div>
          
          <div>
            <label className="block text-xs font-semibold mb-1.5">Customer Tier</label>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              {['regular', 'member', 'vip'].map(tier => (
                <button key={tier} onClick={() => setFormData({...formData, customer_tier: tier})} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${formData.customer_tier === tier ? 'bg-white dark:bg-slate-700 shadow-sm text-brand' : 'text-slate-500'}`}>{tier}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div><label className="block text-xs font-semibold mb-1.5">Phone</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
            <div><label className="block text-xs font-semibold mb-1.5">Region / City</label><input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1.5">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Address</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Credit Limit (Store Credit)</label><input type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Notes</label><input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-brand text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Customer
          </button>
        </div>

      </div>
    </div>
  );
}