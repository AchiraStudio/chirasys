import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Save, Pill, Plus, Trash2, 
  Loader2, Image as ImageIcon, 
  Edit2, Layers, Tags, TrendingUp, ShieldCheck,
  Percent
} from 'lucide-react';
import { 
  getCategories, getBrands, Category, Brand, 
  addItem, updateItem, 
  addItemUnit, updateItemUnit, deleteItemUnit, 
  setItemPrice, getItem, saveItemPriceTiers
} from '../../lib/api';

import { usePermissions } from '../../lib/permissions';
import Modal from '../../components/ui/Modal';
import TabBar, { TabItem } from '../../components/ui/TabBar';
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

type ActiveTab = 'info' | 'pricing' | 'inventory';

export default function ItemDrawer({ isOpen, onClose, onItemAdded, editItemId }: ItemDrawerProps) {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
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
      setActiveTab('info');
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

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData, draftUnits, draftPrices, draftTiers]);

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

  const addConversionRow = () => setDraftUnits([
    ...draftUnits, 
    { tempId: Math.random().toString(36).substring(2, 9), unit_name: '', conversion: 2, is_base: false }
  ]);
  
  const updateDraftUnit = (tempId: string, field: keyof DraftUnit, value: any) => 
    setDraftUnits(draftUnits.map(u => u.tempId === tempId ? { ...u, [field]: value } : u));
  
  const removeDraftUnit = (tempId: string) => 
    setDraftUnits(draftUnits.filter(u => u.tempId !== tempId));

  const addTierRow = () => {
    const lastTier = draftTiers[draftTiers.length - 1];
    const newMax = lastTier ? lastTier.max_qty + 50 : 10;
    setDraftTiers([
      ...draftTiers, 
      { tempId: Math.random().toString(36).substring(2, 9), max_qty: newMax, price: lastTier ? lastTier.price : 0 }
    ]);
  };

  const updateDraftTier = (tempId: string, field: 'max_qty' | 'price', value: number) => 
    setDraftTiers(draftTiers.map(t => t.tempId === tempId ? { ...t, [field]: value } : t));
  
  const removeDraftTier = (tempId: string) => 
    setDraftTiers(draftTiers.filter(t => t.tempId !== tempId));

  const updatePrice = (tempId: string, tier: 'regular' | 'member' | 'vip', value: number) => {
    setDraftPrices(prev => ({ ...prev, [tempId]: { ...prev[tempId], [tier]: value } }));
  };

  // Base unit and pricing summary for live margin preview
  const baseUnit = draftUnits.find(u => u.is_base) || draftUnits[0];
  const basePrice = baseUnit ? (draftPrices[baseUnit.tempId]?.regular || 0) : 0;
  const marginPreview = useMemo(() => {
    const cost = Number(formData.cost_price) || 0;
    if (cost <= 0 || basePrice <= 0) return null;
    const profit = basePrice - cost;
    const marginPct = ((profit / basePrice) * 100).toFixed(1);
    return { profit, marginPct };
  }, [formData.cost_price, basePrice]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.sku.trim()) {
      return toast.info("Nama item dan Kode SKU wajib diisi.");
    }
    if (draftUnits.some(u => !u.unit_name.trim())) {
      return toast.info("Semua nama satuan kemasan harus diisi.");
    }
    
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

      toast.success(editItemId ? 'Data produk berhasil diperbarui.' : 'Produk baru berhasil ditambahkan.');
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

  const TABS: TabItem<ActiveTab>[] = [
    { id: 'info', label: 'Informasi Produk', icon: Pill },
    { 
      id: 'pricing', 
      label: 'Harga & Satuan', 
      icon: Tags, 
      badge: draftUnits.length > 1 ? `${draftUnits.length} Satuan` : null 
    },
    { 
      id: 'inventory', 
      label: 'Grosir & Aturan Stok', 
      icon: Layers, 
      badge: draftTiers.length > 0 ? `${draftTiers.length} Tier` : null 
    },
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={editItemId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
      subtitle={editItemId ? 'Perbarui detail master data produk, satuan, dan harga' : 'Buat master data barang baru dengan cepat'}
      icon={Pill}
      noPadding={true}
      footer={
        !isLoadingEdit ? (
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-dim font-medium hidden sm:flex items-center gap-1.5">
              <span>Tekan</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-line font-mono text-[10px] font-bold">Ctrl + S</kbd>
              <span>untuk simpan cepat</span>
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-dim hover:text-heading hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>{editItemId ? 'Simpan Perubahan' : 'Simpan Produk'}</span>
              </button>
            </div>
          </div>
        ) : null
      }
    >
      {isLoadingEdit ? (
        <div className="py-24 flex flex-col items-center justify-center text-dim">
          <Loader2 className="animate-spin mb-3 text-primary" size={32} />
          <p className="text-xs font-semibold">Memuat data produk...</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* ─── TABS HEADER ──────────────────────────────────────────────── */}
          <div className="px-6 pt-3 pb-3 border-b border-line bg-muted/30">
            <TabBar 
              tabs={TABS} 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
          </div>

          {/* ─── TAB CONTENT (Fixed Height + Smooth Scroll) ────────────────── */}
          <div className="p-6 overflow-y-auto max-h-[62vh] custom-scrollbar space-y-5">
            
            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: INFORMASI PRODUK
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'info' && (
              <div className="space-y-4 animate-fade-in">
                {/* Product Name & Photo Header Card */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/40 border border-line rounded-2xl">
                  {/* Photo Upload Thumbnail */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 shrink-0 border-2 border-dashed border-line rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-soft transition-all overflow-hidden relative group bg-card"
                    title="Klik untuk upload foto produk"
                  >
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="text-white" size={16} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-muted rounded-full shadow-xs mb-1 text-dim group-hover:text-primary transition-colors">
                          <ImageIcon size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-dim group-hover:text-primary">Foto</span>
                      </>
                    )}
                  </div>

                  {/* Name, SKU & Barcode */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">
                        Nama Item / Produk <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        autoFocus
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full bg-card border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                        placeholder="e.g. PARACETAMOL 500 MG TAB" 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-dim uppercase tracking-wider mb-1">
                          Kode SKU <span className="text-danger">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={formData.sku} 
                          onChange={e => setFormData({...formData, sku: e.target.value})} 
                          className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs font-mono font-bold text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                          placeholder="MED-1234"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-dim uppercase tracking-wider mb-1">
                          Barcode / EAN
                        </label>
                        <input 
                          type="text" 
                          value={formData.barcode} 
                          onChange={e => setFormData({...formData, barcode: e.target.value})} 
                          className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs font-mono text-heading focus:ring-2 focus:ring-primary/20 outline-none" 
                          placeholder="Scan atau ketik barcode..." 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Classification & Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
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
                    <label className="block text-xs font-bold text-heading mb-1">Lokasi Rak / Penyimpanan</label>
                    <input 
                      type="text" 
                      value={formData.rack_location} 
                      onChange={e => setFormData({...formData, rack_location: e.target.value})} 
                      className="w-full bg-muted border border-line rounded-xl px-3 py-2 text-xs text-heading focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                      placeholder="e.g. R01-A, Lemari 2" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: HARGA & SATUAN (UNIFIED SIMPLIFIED MATRIX)
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'pricing' && (
              <div className="space-y-5 animate-fade-in">
                {/* Cost Price Card with Live Profit/Margin Preview */}
                <div className="p-4 bg-muted/40 border border-line rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-0.5">
                      Harga Pokok Pembelian (Modal HPP Beli)
                    </label>
                    <p className="text-[11px] text-dim">
                      Acuan perhitungan laba kotor & margin penjualan pada satuan dasar
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex items-center bg-card border border-line rounded-xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-primary/20 min-w-[160px]">
                      <span className="text-xs text-dim font-bold mr-1.5">Rp</span>
                      <input 
                        type="number" 
                        value={formData.cost_price || ''} 
                        onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} 
                        className="w-full bg-transparent border-none outline-none text-xs font-bold text-heading font-mono p-0" 
                        placeholder="0" 
                      />
                    </div>

                    {marginPreview && (
                      <div className="hidden sm:flex flex-col text-right">
                        <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1 justify-end">
                          <Percent size={11} /> Margin {marginPreview.marginPct}%
                        </span>
                        <span className="text-[11px] font-mono text-dim">
                          +Rp {marginPreview.profit.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Unified Satuan & Matriks Harga Jual */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-heading uppercase tracking-wider">
                        Satuan & Harga Jual Konsumen
                      </h3>
                      <p className="text-[11px] text-dim">
                        Kelola harga retail, harga member, harga VIP, dan rasio konversi dalam satu tabel
                      </p>
                    </div>

                    <button 
                      type="button" 
                      onClick={addConversionRow} 
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg hover:bg-primary-soft transition-colors cursor-pointer"
                    >
                      <Plus size={14} /> 
                      <span>Tambah Satuan Kemasan</span>
                    </button>
                  </div>

                  <div className="border border-line rounded-2xl overflow-hidden bg-card shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-line text-dim font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Satuan & Konversi</th>
                          <th className="py-3 px-3">Harga Retail (Regular)</th>
                          <th className="py-3 px-3">Harga Member</th>
                          <th className="py-3 px-3">Harga VIP</th>
                          <th className="py-3 px-3">Barcode Kemasan</th>
                          <th className="py-3 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {draftUnits.map((unit) => {
                          const prices = draftPrices[unit.tempId] || { regular: 0, member: 0, vip: 0 };
                          return (
                            <tr key={unit.tempId} className="hover:bg-muted/20 transition-colors">
                              {/* Satuan & Konversi */}
                              <td className="p-3">
                                <div className="space-y-1.5">
                                  <input 
                                    type="text" 
                                    value={unit.unit_name} 
                                    onChange={(e) => updateDraftUnit(unit.tempId, 'unit_name', e.target.value)} 
                                    className="w-28 bg-muted border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" 
                                    placeholder="e.g. PCS, BOX"
                                  />
                                  {unit.is_base ? (
                                    <div className="text-[10px] font-bold text-dim flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                                      <span>Satuan Dasar (1:1)</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] text-dim">
                                      <span className="font-bold">=</span>
                                      <input 
                                        type="number" 
                                        value={unit.conversion} 
                                        onChange={(e) => updateDraftUnit(unit.tempId, 'conversion', Number(e.target.value))} 
                                        className="w-14 bg-muted border border-line rounded-lg px-1.5 py-1 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary/20" 
                                      />
                                      <span className="font-semibold truncate max-w-[60px]">
                                        {draftUnits.find(u => u.is_base)?.unit_name || 'Base'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Harga Retail */}
                              <td className="p-3">
                                <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
                                  <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                                  <input 
                                    type="number" 
                                    disabled={!can('items.change_price')} 
                                    value={prices.regular || ''} 
                                    onChange={(e) => updatePrice(unit.tempId, 'regular', Number(e.target.value))} 
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-success font-mono p-0" 
                                    placeholder="0" 
                                  />
                                </div>
                              </td>

                              {/* Harga Member */}
                              <td className="p-3">
                                <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
                                  <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                                  <input 
                                    type="number" 
                                    disabled={!can('items.change_price')} 
                                    value={prices.member || ''} 
                                    onChange={(e) => updatePrice(unit.tempId, 'member', Number(e.target.value))} 
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-accent font-mono p-0" 
                                    placeholder={String(prices.regular || 0)} 
                                  />
                                </div>
                              </td>

                              {/* Harga VIP */}
                              <td className="p-3">
                                <div className="relative flex items-center bg-muted border border-line rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/20">
                                  <span className="text-[10px] text-dim font-bold mr-1">Rp</span>
                                  <input 
                                    type="number" 
                                    disabled={!can('items.change_price')} 
                                    value={prices.vip || ''} 
                                    onChange={(e) => updatePrice(unit.tempId, 'vip', Number(e.target.value))} 
                                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-warning font-mono p-0" 
                                    placeholder={String(prices.regular || 0)} 
                                  />
                                </div>
                              </td>

                              {/* Barcode Satuan */}
                              <td className="p-3">
                                <input 
                                  type="text" 
                                  value={unit.barcode || ''} 
                                  onChange={(e) => updateDraftUnit(unit.tempId, 'barcode', e.target.value)} 
                                  className="w-full bg-muted border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20" 
                                  placeholder="Opsional..." 
                                />
                              </td>

                              {/* Delete button */}
                              <td className="p-3 text-center">
                                {!unit.is_base && (
                                  <button 
                                    type="button" 
                                    onClick={() => removeDraftUnit(unit.tempId)} 
                                    className="text-dim hover:text-danger p-1.5 rounded-lg hover:bg-danger-soft transition-colors cursor-pointer"
                                    title="Hapus satuan konversi ini"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: GROSIR & ATURAN STOK
               ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'inventory' && (
              <div className="space-y-5 animate-fade-in">
                {/* Wholesale Volume Tiers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-heading uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-primary" />
                        <span>Tier Harga Volume (Grosir)</span>
                      </h3>
                      <p className="text-[11px] text-dim">
                        Diskon otomatis berdasarkan kuantiti item yang dibeli di kasir
                      </p>
                    </div>

                    {can('items.change_price') && (
                      <button 
                        type="button" 
                        onClick={addTierRow} 
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg hover:bg-primary-soft transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Tambah Tier
                      </button>
                    )}
                  </div>

                  <div className="border border-line rounded-2xl overflow-hidden bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b border-line text-dim font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4">Level</th>
                          <th className="py-2.5 px-4">Batas Maksimal Qty</th>
                          <th className="py-2.5 px-4">Harga Satuan (Rp)</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {draftTiers.map((tier, idx) => (
                          <tr key={tier.tempId}>
                            <td className="p-3 font-bold text-primary">Tier {idx + 1}</td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                disabled={!can('items.change_price')}
                                value={tier.max_qty || ''}
                                onChange={(e) => updateDraftTier(tier.tempId, 'max_qty', Number(e.target.value))}
                                className="w-full bg-muted disabled:opacity-60 border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                                placeholder="e.g. 10"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                disabled={!can('items.change_price')}
                                value={tier.price || ''}
                                onChange={(e) => updateDraftTier(tier.tempId, 'price', Number(e.target.value))}
                                className="w-full bg-muted disabled:opacity-60 border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 font-mono text-heading"
                                placeholder="e.g. 8000"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              {can('items.change_price') && (
                                <button
                                  type="button"
                                  onClick={() => removeDraftTier(tier.tempId)}
                                  className="text-dim hover:text-danger p-1.5 rounded-lg hover:bg-danger-soft transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {draftTiers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-dim font-medium">
                              Belum ada tier harga grosir. Klik "+ Tambah Tier" jika ingin menetapkan harga grosir bertingkat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stock Controls & Pharmacy Rules */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-xs text-heading uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-primary" />
                    <span>Aturan Persediaan & Farmasi</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-line flex flex-col justify-between">
                      <label className="block text-xs font-bold text-heading mb-1.5">Batas Minimum Stok</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={formData.min_stock} 
                          onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} 
                          className="w-24 bg-card border border-line rounded-xl px-3 py-1.5 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                        <span className="text-dim font-semibold">{baseUnit?.unit_name || 'Unit'}</span>
                      </div>
                    </div>

                    <label className="p-3.5 rounded-2xl bg-muted/40 border border-line flex items-center gap-3 cursor-pointer hover:bg-muted/70 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.has_expiry === 1} 
                        onChange={e => setFormData({...formData, has_expiry: e.target.checked ? 1 : 0})} 
                        className="w-4 h-4 rounded text-primary focus:ring-primary" 
                      />
                      <div>
                        <p className="font-bold text-heading">Lacak Kadaluarsa</p>
                        <p className="text-[10px] text-dim">Aktifkan batch & monitoring expiry</p>
                      </div>
                    </label>

                    <label className="p-3.5 rounded-2xl bg-muted/40 border border-line flex items-center gap-3 cursor-pointer hover:bg-muted/70 transition-colors">
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

          </div>
        </div>
      )}
    </Modal>
  );
}