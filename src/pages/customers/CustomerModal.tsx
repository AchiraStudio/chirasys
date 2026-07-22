import { useState, useEffect } from 'react';
import { X, Save, UserCircle, Loader2, CalendarClock } from 'lucide-react';
import { Customer, addCustomer, updateCustomer, getSettings } from '../../lib/api';

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
    if (!formData.name) return alert("Customer Name is required.");
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
      alert(`Failed to save: ${error}`); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 max-h-[90vh]">
        
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg"><UserCircle size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{customerToEdit ? 'Edit Customer' : 'New Customer'}</h2>
              <p className="text-xs text-slate-600 font-medium">Manage POS client details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Customer Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" disabled={customerToEdit?.id === 'customer_umum'} placeholder="John Doe" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Customer Tier</label>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                  {['regular', 'member', 'vip'].map(tier => (
                    <button key={tier} onClick={() => handleTierChange(tier)} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${formData.customer_tier === tier ? 'bg-white dark:bg-slate-800 shadow-sm text-brand' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{tier}</button>
                  ))}
                </div>
              </div>

              {formData.customer_tier !== 'regular' && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-1.5">Masa Berlaku Member</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                        <input 
                          type="date" 
                          value={formData.membership_expiry} 
                          onChange={e => setFormData({...formData, membership_expiry: e.target.value})}
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                      <button 
                        onClick={handleExtend}
                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        title={`Perpanjang otomatis ${settings['tier_' + formData.customer_tier + '_duration_months'] || '12'} bulan dari expiry date`}
                      >
                        Perpanjang
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Phone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" placeholder="08..." />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" placeholder="email@example.com" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Region / City</label>
                <input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" placeholder="Jakarta" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 h-[106px] resize-none transition-all" placeholder="Full address..." />
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
            <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Notes (Internal)</label>
            <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" placeholder="Any special notes..." />
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-brand/20 transition-all active:scale-95 disabled:opacity-50">
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Customer
          </button>
        </div>

      </div>
    </div>
  );
}