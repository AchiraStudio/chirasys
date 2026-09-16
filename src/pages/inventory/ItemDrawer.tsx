import { useState, useEffect, useRef } from 'react';
import { 
  Save, Pill, Plus, Trash2, 
  Loader2, Image as ImageIcon, 
  Edit2, Layers, Tags, TrendingUp, ShieldCheck
} from 'lucide-react';
import { 
  getCategories, getBrands, Category, Brand, 
  addItem, updateItem, 
  addItemUnit, updateItemUnit, deleteItemUnit, 
  setItemPrice, getItem, saveItemPriceTiers
} from '../../lib/api';

import { usePermissions } from '../../lib/permissions';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
      setImagePreview(null);

      if (editItemId) {
        setIsLoadingEdit(true);
        getItem(editItemId).then((data) => {
          const { item, units, prices, price_tiers } = data;
          
          setFormData({
            sku: item.sku, name: item.name, generic_name: item.generic_name || '', barcode: item.barcode || '',
            category_id: item.category_id || '', brand_id: item.brand_id || '', hpp_method: item.hpp_method || 'avg',
            min_stock: item.min_stock || 0, has_expiry: item.has_expiry || 0, requires_prescription: item.requires_prescription || 0,
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
        setDraftPrices({ base: { regular: 0, member: 0, vip: 0 } });
        setDraftTiers([]);
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
    if (!formData.name || !formData.sku) return toast.info("Nama item dan Kode SKU wajib diisi.");
    if (draftUnits.some(u => !u.unit_name.trim())) return toast.info("Semua nama satuan kemasan harus diisi.");
    
    setIsSubmitting(true);
    try {
      const cleanPayload = {
        ...formData, 
        barcode: formData.barcode.trim() || undefined, 
        generic_name: formData.generic_name.trim() || undefined,
        category_id: formData.category_id || undefined, 
        brand_id: formData.brand_id || undefined, 
        cost_price: Number(formData.cost_price) || 0,
        rack_location: formData.rack_location.trim() || undefined,
        item_type: formData.item_type || 'INV',
        notes: undefined, 
        wholesale_price: 0
      };

      let targetItemId = editItemId;

      if (editItemId) {
        await updateItem(editItemId, cleanPayload);
        await syncUnitsAndPrices(editItemId, true, draftUnits, draftPrices);
      } else {
        const newItem = await addItem(cleanPayload);
        targetItemId = newItem.id;
        await syncUnitsAndPrices(newItem.id, false, draftUnits, draftPrices);
      }

      if (targetItemId && draftTiers.length > 0) {
        await saveItemPriceTiers(targetItemId, null, draftTiers.map(t => ({ max_qty: Number(t.max_qty), price: Number(t.price) })));
      }

      onItemAdded();
      onClose();
    } catch (error) {
      console.error("Backend Error:", error);
      toast.error(`Gagal menyimpan data produk: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  async function syncUnitsAndPrices(
    itemId: string,
    isEdit: boolean,
    units: DraftUnit[],
    pricesMap: DraftPrices
  ) {
    if (isEdit) {
      const originalData = await getItem(itemId);
      const existingUnitIds = originalData.units.map(u => u.id);
      const draftUnitIds = units.filter(u => u.savedId).map(u => u.savedId as string);

      for (const id of existingUnitIds.filter(id => !draftUnitIds.includes(id))) {
        await deleteItemUnit(id);
      }

      for (const unit of units) {
        let savedUnitId = unit.savedId;
        if (unit.savedId) {
          await updateItemUnit(unit.savedId, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
        } else {
          const newU = await addItemUnit(itemId, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
          savedUnitId = newU.id;
        }
        const prices = pricesMap[unit.tempId];
        if (prices && savedUnitId) {
          await setItemPrice(itemId, savedUnitId, 'regular', prices.regular);
          await setItemPrice(itemId, savedUnitId, 'member', prices.member || prices.regular);
          await setItemPrice(itemId, savedUnitId, 'vip', prices.vip || prices.regular);
        }
      }
    } else {
      for (const unit of units) {
        const savedUnit = await addItemUnit(itemId, unit.unit_name.trim(), unit.conversion, unit.is_base ? 1 : 0, unit.barcode?.trim());
        const prices = pricesMap[unit.tempId];
        if (prices) {
          await setItemPrice(itemId, savedUnit.id, 'regular', prices.regular);
          await setItemPrice(itemId, savedUnit.id, 'member', prices.member || prices.regular);
          await setItemPrice(itemId, savedUnit.id, 'vip', prices.vip || prices.regular);
        }
      }
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={editItemId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
      subtitle={editItemId ? 'Perbarui seluruh detail master data obat & barang' : 'Buat master data obat & barang baru'}
      icon={Pill}
      noPadding={true}
      footer={
        !isLoadingEdit ? (
          <div className="flex justify-end gap-3 w-full">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editItemId ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
            </button>
          </div>
        ) : null
      }
    >
      {isLoadingEdit ? (
        <div className="py-20 flex flex-col items-center justify-center text-dim">
          <Loader2 className="animate-spin mb-4 text-primary" size={32} />
          <p className="text-xs font-semibold">Memuat data produk...</p>
        </div>
      ) : (
        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* ─── 1. IDENTITAS & INFORMASI UTAMA ─────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-line">
              <div className="p-1.5 bg-primary-soft text-primary rounded-lg">
                <Pill size={16} />
              </div>
              <h3 className="font-extrabold text-sm text-heading">1. Identitas & Informasi Utama</h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              {/* Image Upload */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 shrink-0 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary hover:bg-primary-soft transition-all overflow-hidden relative group bg-muted/50"
              >
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 className="text-white" size={18} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 bg-card dark:bg-muted rounded-full shadow-xs mb-1 text-dim group-hover:text-primary transition-colors"><ImageIcon size={18} /></div>
                    <span className="text-[10px] font-bold text-dim">Upload Foto</span>
                  </>
                )}
              </div>

              {/* SKU & Barcode */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Kode SKU *</label>
                  <input 
                    type="text" 
                    value={formData.sku} 
                    onChange={e => setFormData({...formData, sku: e.target.value})} 
                    className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="MED-1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Barcode / EAN</label>
                  <input 
                    type="text" 
                    value={formData.barcode} 
                    onChange={e => setFormData({...formData, barcode: e.target.value})} 
                    className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs font-mono text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="Scan barcode..." 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-heading mb-1">Nama Item / Obat *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="e.g. PARACETAMOL 500 MG TAB" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-heading mb-1">Jenis / Kandungan Generik</label>
                <input 
                  type="text" 
                  value={formData.generic_name} 
                  onChange={e => setFormData({...formData, generic_name: e.target.value})} 
                  className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                  placeholder="e.g. ANALGESIK & ANTIPIRETIK" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Kategori</label>
                <Select 
                  value={formData.category_id} 
                  onChange={v => setFormData({...formData, category_id: v})} 
                  className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Pilih Kategori...</option>
                  {Array.from(new Map(categories.map(c => [c.name.trim().toUpperCase(), c])).values()).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Brand / Merk</label>
                <Select 
                  value={formData.brand_id} 
                  onChange={v => setFormData({...formData, brand_id: v})} 
                  className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Pilih Brand...</option>
                  {Array.from(new Map(brands.map(b => [b.name.trim().toUpperCase(), b])).values()).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Harga Pokok (Modal HPP Beli)</label>
                <div className="relative flex items-center bg-muted border border-line rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="text-xs text-dim font-bold mr-1">Rp</span>
                  <input 
                    type="number" 
                    value={formData.cost_price || ''} 
                    onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} 
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-heading font-mono p-0" 
                    placeholder="4500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Lokasi Rak</label>
                <input 
                  type="text" 
                  value={formData.rack_location} 
                  onChange={e => setFormData({...formData, rack_location: e.target.value})} 
                  className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                  placeholder="R01" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Tipe Item</label>
                <Select 
                  value={formData.item_type} 
                  onChange={v => setFormData({...formData, item_type: v})} 
                  className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="INV">INV (Barang Inventori)</option>
                  <option value="NON">NON (Jasa / Non-Inventori)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* ─── 2. SATUAN KEMASAN & KONVERSI ───────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-soft dark:bg-primary-soft text-primary dark:text-primary rounded-lg">
                  <Layers size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-heading">2. Satuan Kemasan & Konversi</h3>
              </div>
              <button 
                type="button" 
                onClick={addConversionRow} 
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors cursor-pointer"
              >
                <Plus size={15} /> Tambah Satuan Konversi
              </button>
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-line text-dim font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Nama Satuan</th>
                    <th className="py-2.5 px-4">Rasio Konversi</th>
                    <th className="py-2.5 px-4">Barcode Satuan</th>
                    <th className="py-2.5 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {draftUnits.map((unit) => (
                    <tr key={unit.tempId} className="bg-card dark:bg-input">
                      <td className="p-2.5">
                        <input 
                          type="text" 
                          value={unit.unit_name} 
                          onChange={(e) => updateDraftUnit(unit.tempId, 'unit_name', e.target.value)} 
                          className="w-full bg-muted border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                          placeholder="e.g. PCS, BOX"
                        />
                      </td>
                      <td className="p-2.5">
                        {unit.is_base ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-body text-[10px] font-extrabold uppercase tracking-wider">
                            Satuan Terkecil (1:1)
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-dim font-bold">=</span>
                            <input 
                              type="number" 
                              value={unit.conversion} 
                              onChange={(e) => updateDraftUnit(unit.tempId, 'conversion', Number(e.target.value))} 
                              className="w-20 bg-muted border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                            />
                            <span className="text-dim font-semibold">{draftUnits.find(u => u.is_base)?.unit_name || 'Base'}s</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <input 
                          type="text" 
                          value={unit.barcode || ''} 
                          onChange={(e) => updateDraftUnit(unit.tempId, 'barcode', e.target.value)} 
                          className="w-full bg-muted border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20" 
                          placeholder="Barcode kemasan..." 
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        {!unit.is_base && (
                          <button 
                            type="button" 
                            onClick={() => removeDraftUnit(unit.tempId)} 
                            className="text-dim hover:text-danger p-1.5 rounded-lg hover:bg-danger-soft dark:hover:bg-danger cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 3. MATRIKS HARGA JUAL KONSUMEN ──────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-success-soft dark:bg-success/10 text-success dark:text-success rounded-lg">
                  <Tags size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-heading">3. Matriks Harga Jual Konsumen</h3>
              </div>
              <span className="text-[11px] font-semibold text-dim">Regular / Member / VIP</span>
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-line text-dim font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Satuan Kemasan</th>
                    <th className="py-2.5 px-4">Harga Retail (Regular)</th>
                    <th className="py-2.5 px-4">Harga Member</th>
                    <th className="py-2.5 px-4">Harga VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {draftUnits.map((unit) => {
                    const prices = draftPrices[unit.tempId] || { regular: 0, member: 0, vip: 0 };
                    return (
                      <tr key={unit.tempId} className="bg-card dark:bg-input">
                        <td className="p-3 font-bold text-heading">{unit.unit_name || 'Satuan'}</td>
                        <td className="p-2.5">
                          <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                            <input 
                              type="number" 
                              disabled={!can('items.change_price')} 
                              value={prices.regular || ''} 
                              onChange={(e) => updatePrice(unit.tempId, 'regular', Number(e.target.value))} 
                              className="w-full bg-transparent border-none outline-none text-xs font-bold text-success dark:text-success font-mono p-0" 
                              placeholder="0" 
                            />
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                            <input 
                              type="number" 
                              disabled={!can('items.change_price')} 
                              value={prices.member || ''} 
                              onChange={(e) => updatePrice(unit.tempId, 'member', Number(e.target.value))} 
                              className="w-full bg-transparent border-none outline-none text-xs font-bold text-accent dark:text-accent font-mono p-0" 
                              placeholder="0" 
                            />
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5">
                            <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                            <input 
                              type="number" 
                              disabled={!can('items.change_price')} 
                              value={prices.vip || ''} 
                              onChange={(e) => updatePrice(unit.tempId, 'vip', Number(e.target.value))} 
                              className="w-full bg-transparent border-none outline-none text-xs font-bold text-warning dark:text-warning font-mono p-0" 
                              placeholder="0" 
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 4. TIER HARGA VOLUME GROSIR ─────────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-soft dark:bg-primary-soft text-primary dark:text-purple-400 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-heading">4. Tier Harga Volume (Grosir)</h3>
              </div>
              {can('items.change_price') && (
                <button 
                  type="button" 
                  onClick={addTierRow} 
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Tambah Level Tier
                </button>
              )}
            </div>

            <div className="border border-line rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-line text-dim font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Level Tier</th>
                    <th className="py-2.5 px-4">Batas Maksimal Jumlah (Jml N)</th>
                    <th className="py-2.5 px-4">Harga Satuan (Rp)</th>
                    <th className="py-2.5 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {draftTiers.map((tier, idx) => (
                    <tr key={tier.tempId} className="bg-card dark:bg-input">
                      <td className="p-3 font-bold text-primary">Tier {idx + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          disabled={!can('items.change_price')}
                          value={tier.max_qty || ''}
                          onChange={(e) => updateDraftTier(tier.tempId, 'max_qty', Number(e.target.value))}
                          className="w-full bg-muted disabled:opacity-60 border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                          placeholder="misal: 10"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          disabled={!can('items.change_price')}
                          value={tier.price || ''}
                          onChange={(e) => updateDraftTier(tier.tempId, 'price', Number(e.target.value))}
                          className="w-full bg-muted disabled:opacity-60 border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 font-mono text-heading"
                          placeholder="misal: 8000"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        {can('items.change_price') && (
                          <button
                            type="button"
                            onClick={() => removeDraftTier(tier.tempId)}
                            className="text-dim hover:text-danger p-1.5 rounded-lg hover:bg-danger-soft dark:hover:bg-danger cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {draftTiers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-xs text-dim font-medium">
                        Belum ada tier harga volume. Klik "+ Tambah Level Tier" jika ingin menetapkan harga grosir bertingkat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 5. ATURAN PERSEDIAAN & MEDIS ───────────────────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-line">
              <div className="p-1.5 bg-muted text-body rounded-lg">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-extrabold text-sm text-heading">5. Aturan Persediaan & Medis</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-muted/50 border border-line flex flex-col justify-between">
                <label className="block text-xs font-bold text-heading mb-1.5">Batas Minimum Stok</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={formData.min_stock} 
                    onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} 
                    className="w-24 bg-card border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary/20" 
                  />
                  <span className="text-dim font-semibold">{draftUnits.find(u => u.is_base)?.unit_name || 'Unit'}</span>
                </div>
              </div>

              <label className="p-4 rounded-xl bg-muted/50 border border-line flex items-center gap-3 cursor-pointer hover:bg-muted dark:hover:bg-card transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.has_expiry === 1} 
                  onChange={e => setFormData({...formData, has_expiry: e.target.checked ? 1 : 0})} 
                  className="w-4 h-4 rounded text-primary focus:ring-primary" 
                />
                <div>
                  <p className="font-bold text-heading">Lacak Tanggal Kadaluarsa</p>
                  <p className="text-[10px] text-dim">Aktifkan batch & monitoring expiry</p>
                </div>
              </label>

              <label className="p-4 rounded-xl bg-muted/50 border border-line flex items-center gap-3 cursor-pointer hover:bg-muted dark:hover:bg-card transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.requires_prescription === 1} 
                  onChange={e => setFormData({...formData, requires_prescription: e.target.checked ? 1 : 0})} 
                  className="w-4 h-4 rounded text-primary focus:ring-primary" 
                />
                <div>
                  <p className="font-bold text-heading">Wajib Resep Dokter</p>
                  <p className="text-[10px] text-dim">Peringatan resep di kasir POS</p>
                </div>
              </label>
            </div>
          </div>

        </div>
      )}
    </Modal>
  );
}