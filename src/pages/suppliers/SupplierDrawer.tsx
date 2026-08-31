import { useState, useEffect } from 'react';
import { Save, Building2, Loader2 } from 'lucide-react';
import { Supplier, addSupplier, updateSupplier } from '../../lib/api';
import Drawer from '../../components/ui/Drawer';

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
    if (!formData.name) return alert("Nama Pemasok wajib diisi.");
    setIsSubmitting(true);
    try {
      if (supplierToEdit) { 
        await updateSupplier(supplierToEdit.id, formData.name, formData.contact_person, formData.phone, formData.email, formData.address, formData.payment_terms, formData.notes); 
      } else { 
        await addSupplier(formData.name, formData.contact_person, formData.phone, formData.email, formData.address, formData.payment_terms, formData.notes); 
      }
      onSuccess();
      onClose();
    } catch (error) { 
      alert(`Gagal menyimpan pemasok: ${error}`); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={supplierToEdit ? 'Edit Pemasok' : 'Pemasok Baru'}
      subtitle="Kelola informasi dan kontak vendor/supplier"
      icon={Building2}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Pemasok
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Nama Pemasok *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            placeholder="contoh: PT. Kimia Farma Trading"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={e => setFormData({...formData, contact_person: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              No. Telepon / HP
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Alamat Lengkap
          </label>
          <textarea
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand h-20 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Syarat Pembayaran (TOP)
          </label>
          <input
            type="text"
            value={formData.payment_terms}
            onChange={e => setFormData({...formData, payment_terms: e.target.value})}
            placeholder="contoh: COD, NET 30 Hari"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
            Catatan
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
    </Drawer>
  );
}