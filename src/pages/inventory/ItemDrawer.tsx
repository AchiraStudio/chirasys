import { useState, useEffect, useRef } from 'react';
import { Save, Pill, AlertCircle, Plus, Trash2, DollarSign, Settings as SettingsIcon, Loader2, Image as ImageIcon, Edit2 } from 'lucide-react';
import { 
  getCategories, getBrands, Category, Brand, 
  addItem, updateItem, 
  addItemUnit, updateItemUnit, deleteItemUnit, 
  setItemPrice, getItem, saveItemPriceTiers
} from '../../lib/api';

import { usePermissions } from '../../lib/permissions';
import Modal from '../../components/ui/Modal';

interface ItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: () => void;
  editItemId?: string | null; 
}

interface DraftUnit {
  tempId: string;
  savedId?: string; 
  unit_name: string;
  conversion: number;
  is_base: boolean;
  barcode?: string;
}

interface DraftPrices {
  [tempId: string]: {
    regular: number;
    member: number;
    vip: number;
  };
}

export default function ItemDrawer({ isOpen, onClose, onItemAdded, editItemId }: ItemDrawerProps) {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'basic' | 'units' | 'pricing' | 'tiers' | 'settings'>('basic');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sku: '', name: '', generic_name: '', barcode: '',
    category_id: '', brand_id: '', hpp_method: 'avg',
    min_stock: 0, has_expiry: 0, requires_prescription: 0,
    cost_price: 0, rack_location: '', item_type: 'INV'
  });

  const [draftUnits, setDraftUnits] = useState<DraftUnit[]>([]);
  const [draftPrices, setDraftPrices] = useState<DraftPrices>({});
  const [draftTiers, setDraftTiers] = useState<Array<{ tempId: string; max_qty: number; price: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories);
      getBrands().then(setBrands);
      setActiveTab('basic');
      setImagePreview(null);

      if (editItemId) {
        setIsLoadingEdit(true);
        getItem(editItemId).then((data) => {
          const { item, units, prices, price_tiers } = data;
          
          setFormData({
            sku: item.sku, name: item.name, generic_name: item.generic_name || '', barcode: item.barcode || '',
            category_id: item.category_id || '', brand_id: item.brand_id || '', hpp_method: item.hpp_method,
            min_stock: item.min_stock, has_expiry: item.has_expiry, requires_prescription: item.requires_prescription,
            cost_price: item.cost_price || 0, rack_location: item.rack_location || '', item_type: item.item_type || 'INV'
          });

          const loadedUnits: DraftUnit[] = units.map(u => ({
            tempId: `loaded-${u.id}`, savedId: u.id, unit_name: u.unit_name, conversion: u.conversion, is_base: u.is_base === 1, barcode: u.barcode || ''
          }));
          setDraftUnits(loadedUnits);

          const loadedPrices: DraftPrices = {};
          units.forEach(u => {
            const uPrices = prices.filter(p => p.unit_id === u.id);
            loadedPrices[`loaded-${u.id}`] = {
              regular: uPrices.find(p => p.customer_tier === 'regular')?.price || 0,
              member: uPrices.find(p => p.customer_tier === 'member')?.price || 0,
              vip: uPrices.find(p => p.customer_tier === 'vip')?.price || 0,
            };
          });
          setDraftPrices(loadedPrices);

          if (price_tiers && price_tiers.length > 0) {
            setDraftTiers(price_tiers.map(t => ({ tempId: Math.random().toString(36).substring(2, 9), max_qty: t.max_qty, price: t.price })));
          } else {
            setDraftTiers([]);
          }
        }).finally(() => setIsLoadingEdit(false));
      } else {
        setFormData({
          sku: `MED-${Math.floor(1000 + Math.random() * 9000)}`, name: '', generic_name: '', barcode: '',
          category_id: '', brand_id: '', hpp_method: 'avg',
          min_stock: 10, has_expiry: 0, requires_prescription: 0,
          cost_price: 0, rack_location: 'R01', item_type: 'INV'
        });
        setDraftUnits([{ tempId: 'base', unit_name: 'PCS', conversion: 1, is_base: true }]);
        setDraftPrices({});
        setDraftTiers([
          { tempId: 't1', max_qty: 9, price: 0 },
          { tempId: 't2', max_qty: 100, price: 0 }
        ]);
      }
    }
  }, [isOpen, editItemId]);

  useEffect(() => {
    setDraftPrices(prev => {
      const next = { ...prev };
      draftUnits.forEach(u => { if (!next[u.tempId]) next[u.tempId] = { regular: 0, member: 0, vip: 0 }; });
      return next;
    });
  }, [draftUnits]);

  // Image Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addConversionRow = () => setDraftUnits([...draftUnits, { tempId: Math.random().toString(36).substr(2, 9), unit_name: '', conversion: 2, is_base: false }]);
  const updateDraftUnit = (tempId: string, field: keyof DraftUnit, value: any) => setDraftUnits(draftUnits.map(u => u.tempId === tempId ? { ...u, [field]: value } : u));
  const removeDraftUnit = (tempId: string) => setDraftUnits(draftUnits.filter(u => u.tempId !== tempId));

  const addTierRow = () => {
    const lastTier = draftTiers[draftTiers.length - 1];
    const newMax = lastTier ? lastTier.max_qty + 50 : 10;
    setDraftTiers([...draftTiers, { tempId: Math.random().toString(36).substring(2, 9), max_qty: newMax, price: lastTier ? lastTier.price : 0 }]);
  };
  const updateDraftTier = (tempId: string, field: 'max_qty' | 'price', value: number) => setDraftTiers(draftTiers.map(t => t.tempId === tempId ? { ...t, [field]: value } : t));
  const removeDraftTier = (tempId: string) => setDraftTiers(draftTiers.filter(t => t.tempId !== tempId));

  const updatePrice = (tempId: string, tier: 'regular' | 'member' | 'vip', value: number) => {
    setDraftPrices(prev => ({ ...prev, [tempId]: { ...prev[tempId], [tier]: value } }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku) return alert("Name and SKU are required.");
    if (draftUnits.some(u => !u.unit_name.trim())) return alert("All unit names must be filled out.");
    
    setIsSubmitting(true);
    try {
      const cleanPayload = {
        ...formData, barcode: formData.barcode.trim() || undefined, generic_name: formData.generic_name.trim() || undefined,
        category_id: formData.category_id || undefined, brand_id: formData.brand_id || undefined, notes: undefined, wholesale_price: 0
      };

      let targetItemId = editItemId;

      if (editItemId) {
        await updateItem(editItemId, cleanPayload);
        const originalData = await getItem(editItemId);
        const existingUnitIds = originalData.units.map(u => u.id);
        const draftUnitIds = draftUnits.filter(u => u.savedId).map(u => u.savedId as string);

        for (const id of existingUnitIds.filter(id => !draftUnitIds.includes(id))) await deleteItemUnit(id);

        for (const unit of draftUnits) {
          let savedUnitId = unit.savedId;
          if (unit.savedId) {
            await updateItemUnit(unit.savedId, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
          } else {
            const newU = await addItemUnit(editItemId, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
            savedUnitId = newU.id;
          }
          const prices = draftPrices[unit.tempId];
          if (prices && savedUnitId) {
            await setItemPrice(editItemId, savedUnitId, 'regular', prices.regular);
            await setItemPrice(editItemId, savedUnitId, 'member', prices.member || prices.regular);
            await setItemPrice(editItemId, savedUnitId, 'vip', prices.vip || prices.regular);
          }
        }
      } else {
        const newItem = await addItem(cleanPayload);
        targetItemId = newItem.id;
        for (const unit of draftUnits) {
          const savedUnit = await addItemUnit(newItem.id, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
          const prices = draftPrices[unit.tempId];
          if (prices) {
            await setItemPrice(newItem.id, savedUnit.id, 'regular', prices.regular);
            await setItemPrice(newItem.id, savedUnit.id, 'member', prices.member || prices.regular);
            await setItemPrice(newItem.id, savedUnit.id, 'vip', prices.vip || prices.regular);
          }
        }
      }

      if (targetItemId && draftTiers.length > 0) {
        await saveItemPriceTiers(targetItemId, null, draftTiers.map(t => ({ max_qty: Number(t.max_qty), price: Number(t.price) })));
      }

      onItemAdded();
      onClose();
    } catch (error) {
      console.error("Backend Error:", error);
      alert(`Backend rejected the data: ${error}`);
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
      title={editItemId ? 'Edit Medicine' : 'Add New Medicine'}
      subtitle={editItemId ? 'Update master record details' : 'Create a new master record'}
      icon={Pill}
      noPadding={true}
      footer={
        !isLoadingEdit ? (
          <div className="flex justify-end gap-3 w-full">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editItemId ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        ) : null
      }
    >
      {isLoadingEdit ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mb-4 text-brand" size={32} />
          <p>Loading record data...</p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            {['basic', 'units', 'pricing', 'tiers', 'settings'].map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab as any)} className={`px-4 py-3 text-sm font-semibold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-slate-700 dark:hover:text-slate-500'}`}>
                {tab === 'tiers' ? 'Tier Harga (Volume)' : tab}
              </button>
            ))}
          </div>

          <div className="p-6">
              {activeTab === 'basic' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* Premium Image Upload & SKU Row */}
                  <div className="flex gap-6">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-32 shrink-0 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand dark:hover:border-brand hover:bg-brand/5 transition-all overflow-hidden relative group bg-slate-50 dark:bg-slate-900/50"
                    >
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="text-white" size={20} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-2 text-slate-500 group-hover:text-brand transition-colors"><ImageIcon size={20} /></div>
                          <span className="text-[10px] font-semibold text-slate-600">Upload Image</span>
                        </>
                      )}
                    </div>

                    <div className="flex-1 space-y-5">
                      <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">SKU Code *</label><input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" /></div>
                      <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Barcode / EAN</label><input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" placeholder="Scan or type..." /></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80"><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Medicine / Item Name *</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" placeholder="e.g. ACETYLCYSTEINE 200 MG KAP MULIA" /></div>
                  <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jenis / Generic Name</label><input type="text" value={formData.generic_name} onChange={e => setFormData({...formData, generic_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" placeholder="e.g. OBAT BEBAS" /></div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Harga Pokok (HPP Beli)</label><input type="number" value={formData.cost_price || ''} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none font-bold" placeholder="misal: 4591" /></div>
                    <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Lokasi Rak</label><input type="text" value={formData.rack_location} onChange={e => setFormData({...formData, rack_location: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" placeholder="misal: R01" /></div>
                    <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tipe Item</label><input type="text" value={formData.item_type} onChange={e => setFormData({...formData, item_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none" placeholder="INV" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label><select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none"><option value="">Select Category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Brand</label><select value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none"><option value="">Select Brand...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                  </div>
                </div>
              )}

              {activeTab === 'units' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex gap-3"><AlertCircle size={20} className="text-brand shrink-0" /><p className="text-sm text-brand font-medium">Define packaging. Base Unit is smallest piece.</p></div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800"><tr><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Unit Name</th><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Conversion</th><th className="py-3 px-4 w-16"></th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {draftUnits.map((unit) => (
                          <tr key={unit.tempId} className="bg-white dark:bg-slate-950">
                            <td className="p-3"><input type="text" value={unit.unit_name} onChange={(e) => updateDraftUnit(unit.tempId, 'unit_name', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></td>
                            <td className="p-3">{unit.is_base ? <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-bold uppercase tracking-wider">Base Unit (1)</span> : <div className="flex items-center gap-2"><span className="text-sm text-slate-600">=</span><input type="number" value={unit.conversion} onChange={(e) => updateDraftUnit(unit.tempId, 'conversion', Number(e.target.value))} className="w-20 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand/20" /><span className="text-sm text-slate-600">{draftUnits.find(u => u.is_base)?.unit_name || 'Base'}s</span></div>}</td>
                            <td className="p-3 text-center">{!unit.is_base && <button onClick={() => removeDraftUnit(unit.tempId)} className="text-slate-500 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950"><Trash2 size={16} /></button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={addConversionRow} className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-blue-700 transition-colors px-2"><Plus size={16} /> Add Conversion Unit</button>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex gap-3"><DollarSign size={20} className="text-amber-600 dark:text-amber-400 shrink-0" /><p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Set prices per unit.</p></div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800"><tr><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Unit Name</th><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Regular Price</th><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Member Price</th><th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">VIP Price</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {draftUnits.map((unit) => {
                          const prices = draftPrices[unit.tempId] || { regular: 0, member: 0, vip: 0 };
                          return (
                            <tr key={unit.tempId} className="bg-white dark:bg-slate-950">
                              <td className="p-4 font-medium text-slate-900 dark:text-white">{unit.unit_name || 'Unnamed Unit'}</td>
                              <td className="p-3"><input type="number" disabled={!can('items.change_price')} value={prices.regular || ''} onChange={(e) => updatePrice(unit.tempId, 'regular', Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></td>
                              <td className="p-3"><input type="number" disabled={!can('items.change_price')} value={prices.member || ''} onChange={(e) => updatePrice(unit.tempId, 'member', Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></td>
                              <td className="p-3"><input type="number" disabled={!can('items.change_price')} value={prices.vip || ''} onChange={(e) => updatePrice(unit.tempId, 'vip', Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tiers' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex gap-3">
                    <Pill size={20} className="text-brand shrink-0" />
                    <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                      Atur Tier Harga Volume (Jml 1..N & Harga Jml 1..N). Pembelian dengan jumlah hingga ambang batas akan otomatis mendapatkan harga tier tersebut di POS.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Level Tier</th>
                          <th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Batas Maksimal Jumlah (Jml N)</th>
                          <th className="py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400">Harga Satuan (Rp)</th>
                          <th className="py-3 px-4 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {draftTiers.map((tier, idx) => (
                          <tr key={tier.tempId} className="bg-white dark:bg-slate-950">
                            <td className="p-4 font-bold text-brand">Tier {idx + 1}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                disabled={!can('items.change_price')}
                                value={tier.max_qty || ''}
                                onChange={(e) => updateDraftTier(tier.tempId, 'max_qty', Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-bold"
                                placeholder="misal: 9"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                disabled={!can('items.change_price')}
                                value={tier.price || ''}
                                onChange={(e) => updateDraftTier(tier.tempId, 'price', Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20 font-bold text-slate-900 dark:text-white"
                                placeholder="misal: 8000"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {can('items.change_price') && (
                                <button
                                  type="button"
                                  onClick={() => removeDraftTier(tier.tempId)}
                                  className="text-slate-500 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {draftTiers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-xs text-slate-400">
                              Belum ada tier harga. Klik tombol di bawah untuk menambah tier (Jml 1 & Harga 1).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {can('items.change_price') && (
                    <button
                      type="button"
                      onClick={addTierRow}
                      className="flex items-center gap-2 text-sm font-semibold text-brand hover:text-blue-700 transition-colors px-2"
                    >
                      <Plus size={16} /> Tambah Level Tier
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg"><SettingsIcon size={20} /></div><h3 className="font-bold text-slate-900 dark:text-white">Inventory Rules</h3></div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Cost Valuation (HPP) Method</label>
                        <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                          Configured globally in <span className="font-bold text-brand">System Settings</span>.
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Minimum Stock Alert</label>
                        <div className="flex items-center gap-3"><input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20 text-center" /><span className="text-sm text-slate-600">Base Units</span></div>
                      </div>
                    </div>
                    <div className="space-y-4 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"><input type="checkbox" checked={formData.has_expiry === 1} onChange={e => setFormData({...formData, has_expiry: e.target.checked ? 1 : 0})} className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand" /><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Track Expiry Dates</p></div></label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"><input type="checkbox" checked={formData.requires_prescription === 1} onChange={e => setFormData({...formData, requires_prescription: e.target.checked ? 1 : 0})} className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand" /><div><p className="text-sm font-semibold text-slate-900 dark:text-white">Requires Prescription</p></div></label>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </Modal>
  );
}