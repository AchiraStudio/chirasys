import { useState, useEffect } from 'react';
import { Save, UserCircle, Loader2, CalendarClock } from 'lucide-react';
import { Customer, addCustomer, updateCustomer, getSettings } from '../../lib/api';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerToEdit?: Customer | null;
}

export default function CustomerModal({ isOpen, onClose, onSuccess, customerToEdit }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', region: '', customer_tier: 'regular', notes: '', membership_expiry: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      if (customerToEdit) {
        setFormData({
          name: customerToEdit.name,
          phone: customerToEdit.phone || '',
          email: customerToEdit.email || '',
          address: customerToEdit.address || '',
          region: customerToEdit.region || '',
          customer_tier: customerToEdit.customer_tier,
          notes: customerToEdit.notes || '',
          membership_expiry: customerToEdit.membership_expiry ? customerToEdit.membership_expiry.split(' ')[0] : ''
        });
      } else {
        setFormData({ name: '', phone: '', email: '', address: '', region: '', customer_tier: 'regular', notes: '', membership_expiry: '' });
      }
    }
  }, [isOpen, customerToEdit]);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      const map: Record<string, string> = {};
      data.forEach(s => map[s.key] = s.value);
      setSettings(map);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTierChange = (tier: string) => {
    let newExpiry = formData.membership_expiry;
    
    // Only auto-calculate expiry if it's a new assignment or it's empty
    if (tier !== 'regular' && (!customerToEdit || customerToEdit.customer_tier === 'regular' || !newExpiry)) {
      const durationMonths = parseInt(settings[`tier_${tier}_duration_months`] || '12', 10);
      const date = new Date();
      date.setMonth(date.getMonth() + durationMonths);
      newExpiry = date.toISOString().split('T')[0];
    } else if (tier === 'regular') {
      newExpiry = '';
    }
    
    setFormData({ ...formData, customer_tier: tier, membership_expiry: newExpiry });
  };

  const handleExtend = () => {
    if (formData.customer_tier === 'regular') return;
    const durationMonths = parseInt(settings[`tier_${formData.customer_tier}_duration_months`] || '12', 10);
    
    let baseDate = new Date();
    if (formData.membership_expiry) {
      const currentExpiry = new Date(formData.membership_expiry);
      if (currentExpiry > baseDate) {
        baseDate = currentExpiry;
      }
    }
    
    baseDate.setMonth(baseDate.getMonth() + durationMonths);
    setFormData({ ...formData, membership_expiry: baseDate.toISOString().split('T')[0] });
  };

  const handleSubmit = async () => {
    if (!formData.name) return toast.info("Nama pelanggan wajib diisi.");
    setIsSubmitting(true);
    try {
      const expiry = formData.customer_tier !== 'regular' && formData.membership_expiry ? `${formData.membership_expiry} 23:59:59` : undefined;
      
      if (customerToEdit) { 
        await updateCustomer(customerToEdit.id, formData.name, formData.phone, formData.email, formData.address, formData.region, formData.customer_tier, formData.notes, expiry); 
      } else { 
        await addCustomer(formData.name, formData.phone, formData.email, formData.address, formData.region, formData.customer_tier, formData.notes, expiry); 
      }
      onSuccess();
      onClose();
    } catch (error) { 
      toast.error(`Gagal menyimpan data pelanggan: ${error}`); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={customerToEdit ? 'Edit Pelanggan' : 'Pelanggan Baru'}
      subtitle="Kelola informasi data pelanggan dan status keanggotaan"
      icon={UserCircle}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-body hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Simpan Pelanggan
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Nama Pelanggan *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
                disabled={customerToEdit?.id === 'customer_umum'}
                placeholder="Nama Lengkap"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Tier / Kategori Pelanggan</label>
              <div className="flex bg-muted p-1 rounded-xl">
                {['regular', 'member', 'vip'].map(tier => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => handleTierChange(tier)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      formData.customer_tier === tier ? 'bg-card dark:bg-muted shadow-sm text-primary' : 'text-dim hover:text-body dark:hover:text-dim'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {formData.customer_tier !== 'regular' && (
              <div className="p-4 bg-primary-soft dark:bg-primary-soft border border-primary-soft dark:border-primary/50 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-primary dark:text-primary uppercase mb-1.5">Masa Berlaku Member</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input 
                        type="date" 
                        value={formData.membership_expiry} 
                        onChange={e => setFormData({...formData, membership_expiry: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 bg-card border border-primary/30 dark:border-primary rounded-xl text-sm text-heading outline-none focus:border-primary"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={handleExtend}
                      className="px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      title={`Perpanjang otomatis ${settings['tier_' + formData.customer_tier + '_duration_months'] || '12'} bulan`}
                    >
                      Perpanjang
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">No. Telepon / WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
                placeholder="08..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
                placeholder="email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Wilayah / Kota</label>
              <input
                type="text"
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
                className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
                placeholder="Jakarta Selatan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Alamat Lengkap</label>
              <textarea
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary h-[106px] resize-none"
                placeholder="Alamat domisili..."
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-heading uppercase tracking-wide mb-1.5">Catatan Khusus (Internal)</label>
          <input
            type="text"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
            className="w-full bg-muted border border-line rounded-xl px-4 py-2.5 text-sm text-heading outline-none focus:ring-2 focus:ring-primary"
            placeholder="Catatan tambahan perihal pelanggan..."
          />
        </div>
      </div>
    </Modal>
  );
}