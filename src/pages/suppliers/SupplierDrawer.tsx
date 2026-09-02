import { useState, useEffect } from 'react';
import { Save, Building2, Loader2, Phone, Mail, MapPin, CreditCard, FileText, User } from 'lucide-react';
import { Supplier, addSupplier, updateSupplier } from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
          name: supplierToEdit.name, 
          contact_person: supplierToEdit.contact_person || '', 
          phone: supplierToEdit.phone || '',
          email: supplierToEdit.email || '', 
          address: supplierToEdit.address || '', 
          payment_terms: supplierToEdit.payment_terms || '', 
          notes: supplierToEdit.notes || ''
        });
      } else {
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', payment_terms: 'NET 30', notes: '' });
      }
    }
  }, [isOpen, supplierToEdit]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return alert("Nama Pemasok / Distributor wajib diisi.");
    setIsSubmitting(true);
    try {
      if (supplierToEdit) { 
        await updateSupplier(supplierToEdit.id, formData.name.trim(), formData.contact_person.trim(), formData.phone.trim(), formData.email.trim(), formData.address.trim(), formData.payment_terms.trim(), formData.notes.trim()); 
      } else { 
        await addSupplier(formData.name.trim(), formData.contact_person.trim(), formData.phone.trim(), formData.email.trim(), formData.address.trim(), formData.payment_terms.trim(), formData.notes.trim()); 
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={supplierToEdit ? 'Edit Data Pemasok' : 'Tambah Pemasok Baru'}
      subtitle="Kelola informasi legalitas, kontak PIC, dan syarat pembayaran vendor/supplier"
      icon={Building2}
      noPadding={true}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {supplierToEdit ? 'Simpan Perubahan' : 'Simpan Pemasok Baru'}
          </button>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
        
        {/* Section 1: Profil & Identitas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-1.5 bg-brand/10 text-brand rounded-lg">
              <Building2 size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">1. Identitas & Legalitas Pemasok</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Perusahaan / Pemasok *
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand/20">
                <Building2 size={16} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white p-0"
                  placeholder="contoh: PT. Kimia Farma Trading & Distribution"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person (PIC)
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20">
                <User size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={e => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white p-0"
                  placeholder="e.g. Bpk. Hendra"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Syarat Pembayaran (TOP)
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20">
                <CreditCard size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={formData.payment_terms}
                  onChange={e => setFormData({...formData, payment_terms: e.target.value})}
                  placeholder="contoh: NET 30 Hari, COD, Tempo 14 Hari"
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Kontak & Komunikasi */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Phone size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">2. Saluran Kontak & Komunikasi</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No. Telepon / WhatsApp
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20">
                <Phone size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="0812-3456-7890"
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white font-mono p-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Perusahaan
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20">
                <Mail size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="order@kimiafarma.co.id"
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white p-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Alamat & Catatan */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 text-brand rounded-lg">
              <MapPin size={16} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">3. Alamat Gudang & Catatan Tambahan</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Kantor / Gudang Pengiriman
              </label>
              <textarea
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Jl. Gatot Subroto No. 123, Komplek Pergudangan Blok A"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Khusus (Diskon Pembelian, Rekening Bank, dll.)
              </label>
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-brand/20">
                <FileText size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Rek Mandiri: 123-00-1234567-8 a.n PT Kimia Farma"
                  className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white p-0"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}