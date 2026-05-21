import { useState, useEffect } from 'react';
import { X, Save, Building2, Loader2 } from 'lucide-react';
import { Supplier, addSupplier, updateSupplier } from '../../lib/api';

interface SupplierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierToEdit?: Supplier | null;
}

export default function SupplierDrawer({ isOpen, onClose, onSuccess, supplierToEdit }: SupplierDrawerProps) {
  const [formData, setFormData] = useState({
    name: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (supplierToEdit) {
        setFormData({
          name: supplierToEdit.name, contact_person: supplierToEdit.contact_person || '', phone: supplierToEdit.phone || '',
          email: supplierToEdit.email || '', address: supplierToEdit.address || '', payment_terms: supplierToEdit.payment_terms || '', notes: supplierToEdit.notes || ''
        });
      } else {
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', notes: '' });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleSubmit = async () => {
    if (!formData.name) return alert("Supplier Name is required.");
    setIsSubmitting(true);
    try {
      if (supplierToEdit) { await updateSupplier(supplierToEdit.id, formData.name, formData.contact_person, formData.phone, formData.email, formData.address, formData.payment_terms, formData.notes); } 
      else { await addSupplier(formData.name, formData.contact_person, formData.phone, formData.email, formData.address, formData.payment_terms, formData.notes); }
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
            <div className="p-2 bg-brand/10 text-brand rounded-lg"><Building2 size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{supplierToEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
              <p className="text-xs text-slate-500 font-medium">Manage vendor details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <div><label className="block text-xs font-semibold mb-1.5">Supplier Name *</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          <div className="grid grid-cols-2 gap-5">
            <div><label className="block text-xs font-semibold mb-1.5">Contact Person</label><input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
            <div><label className="block text-xs font-semibold mb-1.5">Phone</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1.5">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Address</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Payment Terms (e.g., NET30, COD)</label><input type="text" value={formData.payment_terms} onChange={e => setFormData({...formData, payment_terms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
          <div><label className="block text-xs font-semibold mb-1.5">Notes</label><input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-brand text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Supplier
          </button>
        </div>

      </div>
    </div>
  );
}