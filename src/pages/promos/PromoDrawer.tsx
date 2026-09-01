import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Percent, Coins, Gift, Layers, Package, Calendar, Search, Sparkles, Tag, AlertCircle, ShoppingBag } from 'lucide-react';
import { CreatePromoInput, getPromoDetail, createPromo, updatePromo, getItemsFiltered, getCategories, Category, Item, getItem } from '../../lib/api';
import { useDebounce } from '../../lib/hooks/useDebounce';
import Modal from '../../components/ui/Modal';

interface PromoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editPromoId: string | null;
}

export default function PromoDrawer({ isOpen, onClose, onSaved, editPromoId }: PromoDrawerProps) {
  const [formData, setFormData] = useState<CreatePromoInput>({
    name: '',
    description: '',
    discount_percent: 0,
    min_qty: 1,
    member_only: 0,
    promo_type: 'percentage',
    applies_to: 'item',
    stack_rule: 'best_only',
    priority: 1,
    bogo_rules: [],
    tiers: [],
    bundle_items: []
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Single Item Search
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const debouncedItemSearch = useDebounce(itemSearchQuery, 250);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Bundle Items Search
  const [bundleSearchQuery, setBundleSearchQuery] = useState('');
  const debouncedBundleSearch = useDebounce(bundleSearchQuery, 250);
  const [bundleSearchResults, setBundleSearchResults] = useState<Item[]>([]);
  const [isSearchingBundle, setIsSearchingBundle] = useState(false);
  const [showBundleDropdown, setShowBundleDropdown] = useState(false);
  const [bundleItemDetails, setBundleItemDetails] = useState<Record<string, Item>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (debouncedItemSearch && debouncedItemSearch.trim().length > 0) {
      searchItems(debouncedItemSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedItemSearch]);

  const searchItems = async (query: string) => {
    setIsSearchingItem(true);
    try {
      const data = await getItemsFiltered(query, '', '', true, 1, 10);
      setSearchResults(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingItem(false);
    }
  };

  useEffect(() => {
    if (debouncedBundleSearch && debouncedBundleSearch.trim().length > 0) {
      searchBundleItems(debouncedBundleSearch);
    } else {
      setBundleSearchResults([]);
    }
  }, [debouncedBundleSearch]);

  const searchBundleItems = async (query: string) => {
    setIsSearchingBundle(true);
    try {
      const data = await getItemsFiltered(query, '', '', true, 1, 10);
      setBundleSearchResults(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingBundle(false);
    }
  };

  useEffect(() => {
    setErrorMessage(null);
    if (editPromoId && isOpen) {
      loadPromoDetails(editPromoId);
    } else if (!editPromoId && isOpen) {
      setFormData({
        name: '',
        description: '',
        discount_percent: 10,
        discount_value: undefined,
        min_qty: 1,
        member_only: 0,
        promo_type: 'percentage',
        applies_to: 'item',
        stack_rule: 'best_only',
        priority: 1,
        bogo_rules: [],
        tiers: [],
        bundle_items: []
      });
      setItemSearchQuery('');
      setSelectedItem(null);
      setBundleItemDetails({});
    }
  }, [editPromoId, isOpen]);

  const loadPromoDetails = async (id: string) => {
    setLoading(true);
    try {
      const promoDetail = await getPromoDetail(id);
      const { promo, bogo_rules, tiers, bundle_items } = promoDetail;
      setFormData({
        name: promo.name,
        description: promo.description || '',
        promo_type: promo.promo_type as any,
        applies_to: promo.applies_to as any,
        category_id: promo.category_id,
        item_id: promo.item_id,
        discount_percent: promo.discount_percent || 0,
        discount_value: promo.discount_value,
        max_discount_amount: promo.max_discount_amount,
        min_qty: promo.min_qty || 1,
        start_date: promo.start_date ? promo.start_date.split('T')[0] : undefined,
        end_date: promo.end_date ? promo.end_date.split('T')[0] : undefined,
        member_only: promo.member_only ? 1 : 0,
        member_tier: promo.member_tier,
        stack_rule: promo.stack_rule as any,
        priority: promo.priority || 1,
        bogo_rules: bogo_rules.map(r => ({
          buy_qty: r.buy_qty,
          get_qty: r.get_qty,
          free_item_id: r.free_item_id,
          free_item_discount_percent: r.free_item_discount_percent
        })),
        tiers: tiers.map(t => ({
          min_qty: t.min_qty,
          discount_percent: t.discount_percent
        })),
        bundle_items: bundle_items.map(b => ({
          item_id: b.item_id,
          qty: b.qty
        }))
      });

      if (promo.item_id) {
        try {
          const itemData = await getItem(promo.item_id);
          setSelectedItem(itemData.item);
          setItemSearchQuery(itemData.item.name);
        } catch (e) {
          console.error(e);
        }
      }

      if (bundle_items && bundle_items.length > 0) {
        const detailsMap: Record<string, Item> = {};
        for (const bi of bundle_items) {
          try {
            const itemData = await getItem(bi.item_id);
            detailsMap[bi.item_id] = itemData.item;
          } catch (e) {
            console.error(e);
          }
        }
        setBundleItemDetails(detailsMap);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Gagal memuat detail promo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = () => {
    setFormData(prev => ({
      ...prev,
      tiers: [...prev.tiers, { min_qty: prev.tiers.length ? prev.tiers[prev.tiers.length - 1].min_qty + 2 : 2, discount_percent: 10 }]
    }));
  };

  const handleRemoveTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side guard checks
    if (!formData.name.trim()) {
      setErrorMessage('Silakan masukkan nama promo.');
      return;
    }

    if (formData.applies_to === 'item' && formData.promo_type !== 'bundle' && !formData.item_id) {
      setErrorMessage('Silakan cari dan pilih item target promo.');
      return;
    }

    if (formData.applies_to === 'category' && !formData.category_id) {
      setErrorMessage('Silakan pilih kategori produk target promo.');
      return;
    }

    if (formData.promo_type === 'bundle' && (!formData.bundle_items || formData.bundle_items.length === 0)) {
      setErrorMessage('Silakan tambahkan setidaknya 1 item ke dalam paket bundle.');
      return;
    }

    if (formData.promo_type === 'bogo' && (!formData.bogo_rules || formData.bogo_rules.length === 0)) {
      setErrorMessage('Silakan tentukan aturan BOGO (Beli X Gratis Y).');
      return;
    }

    if (formData.promo_type === 'tiered' && (!formData.tiers || formData.tiers.length === 0)) {
      setErrorMessage('Silakan tambahkan setidaknya 1 tingkatan diskon berjenjang (Tier).');
      return;
    }

    setLoading(true);
    try {
      // Normalize payload
      const payload: CreatePromoInput = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        discount_percent: Number(formData.discount_percent) || 0,
        discount_value: formData.discount_value ? Number(formData.discount_value) : undefined,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : undefined,
        min_qty: Math.max(1, Number(formData.min_qty) || 1),
        priority: Number(formData.priority) || 1,
        item_id: formData.applies_to === 'item' && formData.promo_type !== 'bundle' ? formData.item_id : undefined,
        category_id: formData.applies_to === 'category' ? formData.category_id : undefined,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00` : undefined,
        end_date: formData.end_date ? `${formData.end_date}T23:59:59` : undefined,
      };

      if (editPromoId) {
        await updatePromo(editPromoId, payload);
      } else {
        await createPromo(payload);
      }
      onSaved();
      onClose();
    } catch (error: any) {
      console.error(error);
      const msg = typeof error === 'string' ? error : error?.message || 'Gagal menyimpan promo. Silakan periksa kembali data Anda.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const PROMO_TYPES = [
    { id: 'percentage', label: 'Diskon Persen', sub: 'Contoh: Diskon 20%', icon: Percent, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
    { id: 'fixed_amount', label: 'Potongan Nominal', sub: 'Contoh: Potongan Rp 10.000', icon: Coins, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
    { id: 'bogo', label: 'Beli X Gratis Y', sub: 'Contoh: Beli 2 Gratis 1', icon: Gift, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
    { id: 'tiered', label: 'Diskon Bertingkat', sub: 'Contoh: Beli 5 diskon 10%, beli 10 diskon 20%', icon: Layers, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' },
    { id: 'bundle', label: 'Paket Bundle', sub: 'Contoh: Paket Hemat 3 Produk', icon: Package, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800' },
  ];

  const APPLIES_TO_OPTIONS = [
    { id: 'item', label: 'Per Item Spesifik', desc: 'Berlaku pada obat/produk terpilih', icon: Tag },
    { id: 'category', label: 'Per Kategori', desc: 'Berlaku untuk semua item dalam kategori', icon: Layers },
    { id: 'transaction', label: 'Total Transaksi', desc: 'Diskon pada total keranjang kasir', icon: ShoppingBag },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={editPromoId ? 'Edit Promosi & Diskon' : 'Buat Promosi Baru'}
      subtitle="Atur strategi potongan harga, bundle, program BOGO, dan diskon kuantitas"
      icon={Sparkles}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400 font-medium">
            * Pastikan semua parameter diskon telah terisi dengan benar.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="promo-form"
              disabled={loading}
              className="px-6 py-2.5 bg-brand hover:bg-brand/90 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-lg shadow-brand/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={15} />
              {loading ? 'Menyimpan...' : editPromoId ? 'Simpan Perubahan' : 'Buat Promo'}
            </button>
          </div>
        </div>
      }
    >
      <form id="promo-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              <span className="font-bold block">Gagal Menyimpan:</span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* 1. Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Nama Promo <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold text-sm" 
              placeholder="Contoh: Flash Sale Gajian 20% atau Promo Paracetamol Beli 2 Gratis 1" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Deskripsi & Syarat Ketentuan
            </label>
            <textarea 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand text-xs font-medium resize-none" 
              rows={2} 
              placeholder="Keterangan singkat tentang mekanisme atau syarat promo ini..." 
            />
          </div>
        </div>

        {/* 2. Promo Strategy Type Cards */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Pilih Jenis / Tipe Promo <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PROMO_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = formData.promo_type === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    const newAppliesTo = type.id === 'bundle' ? 'item' : formData.applies_to;
                    setFormData({
                      ...formData,
                      promo_type: type.id as any,
                      applies_to: newAppliesTo,
                      bogo_rules: type.id === 'bogo' && formData.bogo_rules.length === 0 ? [{ buy_qty: 2, get_qty: 1, free_item_discount_percent: 100 }] : formData.bogo_rules,
                      tiers: type.id === 'tiered' && formData.tiers.length === 0 ? [{ min_qty: 3, discount_percent: 10 }] : formData.tiers
                    });
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'border-brand bg-brand/5 dark:bg-brand/10 ring-2 ring-brand/30 shadow-sm' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl border ${type.color}`}>
                      <Icon size={16} />
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-brand"></span>}
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{type.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{type.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Applies To Selection (Disabled when bundle) */}
        {formData.promo_type !== 'bundle' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Berlaku Untuk (Target Promo) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {APPLIES_TO_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = formData.applies_to === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, applies_to: opt.id as any })}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 ring-2 ring-brand/30' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Target Item Search (if applies_to == 'item') */}
        {formData.applies_to === 'item' && formData.promo_type !== 'bundle' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Pilih Item / Produk Target <span className="text-rose-500">*</span>
            </label>

            {selectedItem ? (
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{selectedItem.name}</div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      SKU: {selectedItem.sku} {selectedItem.category_name && `· Kategori: ${selectedItem.category_name}`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setFormData({ ...formData, item_id: undefined });
                    setItemSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                >
                  Ganti Item
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input 
                    type="text" 
                    value={itemSearchQuery} 
                    onChange={e => {
                      setItemSearchQuery(e.target.value);
                      setShowItemDropdown(true);
                    }} 
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand text-xs font-medium" 
                    placeholder="Ketik nama obat / produk atau barcode..." 
                  />
                  <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
                </div>

                {showItemDropdown && itemSearchQuery && (
                  <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar">
                    {isSearchingItem ? (
                      <div className="p-4 text-xs text-slate-400 text-center font-medium">Mencari item...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(item => (
                        <div 
                          key={item.id}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 last:border-0 transition-colors"
                          onClick={() => {
                            setFormData({...formData, item_id: item.id});
                            setSelectedItem(item);
                            setItemSearchQuery(item.name);
                            setShowItemDropdown(false);
                          }}
                        >
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">SKU: {item.sku}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-slate-400 text-center font-medium">Produk tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Target Category Selection (if applies_to == 'category') */}
        {formData.applies_to === 'category' && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Pilih Kategori Produk <span className="text-rose-500">*</span>
            </label>
            <select 
              value={formData.category_id || ''} 
              onChange={e => setFormData({...formData, category_id: e.target.value || undefined})} 
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Bundle Items Builder (if promo_type == 'bundle') */}
        {formData.promo_type === 'bundle' && (
          <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Package size={18} />
                <h3 className="font-extrabold text-xs uppercase tracking-wide">Komposisi Paket Bundle</h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                {formData.bundle_items?.length || 0} Item Terpilih
              </span>
            </div>

            {/* Bundle Item Search Input */}
            <div className="relative">
              <div className="relative">
                <input 
                  type="text" 
                  value={bundleSearchQuery} 
                  onChange={e => {
                    setBundleSearchQuery(e.target.value);
                    setShowBundleDropdown(true);
                  }} 
                  onFocus={() => setShowBundleDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand text-xs font-medium" 
                  placeholder="Cari item untuk dimasukkan ke dalam paket bundle..." 
                />
                <Search className="absolute left-3 top-3 text-slate-400" size={15} />
              </div>

              {showBundleDropdown && bundleSearchQuery && (
                <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                  {isSearchingBundle ? (
                    <div className="p-3 text-xs text-slate-400 text-center font-medium">Mencari...</div>
                  ) : bundleSearchResults.length > 0 ? (
                    bundleSearchResults.map(item => (
                      <div 
                        key={item.id}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 last:border-0 transition-colors flex items-center justify-between"
                        onClick={() => {
                          const exists = formData.bundle_items?.some(bi => bi.item_id === item.id);
                          if (!exists) {
                            setBundleItemDetails(prev => ({ ...prev, [item.id]: item }));
                            setFormData(prev => ({
                              ...prev,
                              bundle_items: [...(prev.bundle_items || []), { item_id: item.id, qty: 1 }]
                            }));
                          }
                          setBundleSearchQuery('');
                          setShowBundleDropdown(false);
                        }}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">SKU: {item.sku}</div>
                        </div>
                        <span className="text-[10px] font-bold text-brand">+ Tambah</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 text-center font-medium">Item tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            {/* Bundle Items List */}
            <div className="space-y-2">
              {(!formData.bundle_items || formData.bundle_items.length === 0) ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/30">
                  <Package size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-400">Belum ada item dalam bundle. Cari dan pilih produk di atas.</p>
                </div>
              ) : (
                formData.bundle_items.map((bi) => {
                  const itemInfo = bundleItemDetails[bi.item_id];
                  return (
                    <div 
                      key={bi.item_id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {itemInfo?.name || `Item ID: ${bi.item_id}`}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                          SKU: {itemInfo?.sku || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                bundle_items: (prev.bundle_items || []).map(b => b.item_id === bi.item_id ? { ...b, qty: Math.max(1, b.qty - 1) } : b)
                              }));
                            }}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-xs font-bold"
                          >
                            -
                          </button>
                          <input 
                            type="number"
                            min="1"
                            value={bi.qty}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 1;
                              setFormData(prev => ({
                                ...prev,
                                bundle_items: (prev.bundle_items || []).map(b => b.item_id === bi.item_id ? { ...b, qty: Math.max(1, val) } : b)
                              }));
                            }}
                            className="w-10 bg-transparent text-center text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                bundle_items: (prev.bundle_items || []).map(b => b.item_id === bi.item_id ? { ...b, qty: b.qty + 1 } : b)
                              }));
                            }}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              bundle_items: (prev.bundle_items || []).filter(b => b.item_id !== bi.item_id)
                            }));
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. Strategy Config (Discount Value / BOGO / Tiered) */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          {(formData.promo_type === 'percentage' || formData.promo_type === 'fixed_amount' || formData.promo_type === 'bundle') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand">
                {formData.promo_type === 'percentage' ? <Percent size={17} /> : <Coins size={17} />}
                <h3 className="font-extrabold text-xs uppercase tracking-wide">Besaran Potongan / Diskon</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.promo_type === 'bundle' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Metrik Diskon Bundle</label>
                    <select 
                      value={formData.discount_percent > 0 ? 'percent' : 'fixed'}
                      onChange={e => {
                        if (e.target.value === 'percent') {
                          setFormData({ ...formData, discount_percent: 10, discount_value: undefined });
                        } else {
                          setFormData({ ...formData, discount_value: 5000, discount_percent: 0 });
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="percent">Diskon Persentase (%)</option>
                      <option value="fixed">Potongan Nominal (Rp)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nilai Diskon {(formData.promo_type === 'percentage' || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) ? '(%)' : '(Rp)'} <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    min="0.01" 
                    required 
                    value={(formData.promo_type === 'percentage' || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) ? formData.discount_percent : (formData.discount_value || '')} 
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (formData.promo_type === 'percentage') {
                        setFormData({...formData, discount_percent: val, discount_value: undefined});
                      } else if (formData.promo_type === 'bundle') {
                        if (formData.discount_percent > 0) {
                          setFormData({...formData, discount_percent: val, discount_value: undefined});
                        } else {
                          setFormData({...formData, discount_value: val, discount_percent: 0});
                        }
                      } else {
                        setFormData({...formData, discount_value: val, discount_percent: 0});
                      }
                    }} 
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand font-bold text-xs" 
                    placeholder={formData.promo_type === 'percentage' ? 'Contoh: 15' : 'Contoh: 10000'}
                  />
                </div>

                {((formData.promo_type === 'percentage') || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Maksimal Diskon (Rp)</label>
                    <input 
                      type="number" 
                      value={formData.max_discount_amount || ''} 
                      onChange={e => setFormData({...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined})} 
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand font-semibold text-xs" 
                      placeholder="Opsional, contoh: 50000" 
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tiered Discount Configuration */}
          {formData.promo_type === 'tiered' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-purple-600 dark:text-purple-400">
                <div className="flex items-center gap-2">
                  <Layers size={17} />
                  <h3 className="font-extrabold text-xs uppercase tracking-wide">Tingkatan Diskon Bertingkat (Tier)</h3>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddTier} 
                  className="text-xs font-bold bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Tambah Tier
                </button>
              </div>

              <div className="space-y-2.5">
                {formData.tiers.map((tier, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Minimal Beli (Qty)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={tier.min_qty} 
                          onChange={e => {
                            const newTiers = [...formData.tiers];
                            newTiers[idx].min_qty = parseFloat(e.target.value) || 1;
                            setFormData({...formData, tiers: newTiers});
                          }} 
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Diskon (%)</label>
                        <input 
                          type="number" 
                          min="0.1"
                          step="0.1"
                          value={tier.discount_percent} 
                          onChange={e => {
                            const newTiers = [...formData.tiers];
                            newTiers[idx].discount_percent = parseFloat(e.target.value) || 0;
                            setFormData({...formData, tiers: newTiers});
                          }} 
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-purple-600 dark:text-purple-400" 
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTier(idx)} 
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all mt-4"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOGO Configuration */}
          {formData.promo_type === 'bogo' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Gift size={17} />
                <h3 className="font-extrabold text-xs uppercase tracking-wide">Aturan Beli X Gratis Y (BOGO)</h3>
              </div>
              
              {formData.bogo_rules.length === 0 ? (
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData({...formData, bogo_rules: [{buy_qty: 2, get_qty: 1, free_item_discount_percent: 100}]});
                  }} 
                  className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-xs border-dashed"
                >
                  Aktifkan Aturan BOGO
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Beli Kuantitas</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={formData.bogo_rules[0].buy_qty} 
                      onChange={e => {
                        const rules = [...formData.bogo_rules];
                        rules[0].buy_qty = parseInt(e.target.value) || 1;
                        setFormData({...formData, bogo_rules: rules});
                      }} 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Gratis Kuantitas</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={formData.bogo_rules[0].get_qty} 
                      onChange={e => {
                        const rules = [...formData.bogo_rules];
                        rules[0].get_qty = parseInt(e.target.value) || 1;
                        setFormData({...formData, bogo_rules: rules});
                      }} 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-bold text-emerald-600" 
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Validation Rules & Membership */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Calendar size={17} />
            <h3 className="font-extrabold text-xs uppercase tracking-wide">Periode & Kriteria Member</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Minimal Pembelian (Qty)</label>
              <input 
                type="number" 
                min="1"
                value={formData.min_qty} 
                onChange={e => setFormData({...formData, min_qty: parseFloat(e.target.value) || 1})} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-brand" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Prioritas Eksekusi</label>
              <input 
                type="number" 
                min="1"
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: parseInt(e.target.value) || 1})} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-brand" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tanggal Mulai (Opsional)</label>
              <input 
                type="date" 
                value={formData.start_date || ''} 
                onChange={e => setFormData({...formData, start_date: e.target.value || undefined})} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Tanggal Berakhir (Opsional)</label>
              <input 
                type="date" 
                value={formData.end_date || ''} 
                onChange={e => setFormData({...formData, end_date: e.target.value || undefined})} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand" 
              />
            </div>
          </div>

          {/* Membership Tier Pills */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Khusus Member Tertentu
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '', label: 'Semua Pelanggan (Umum & Member)' },
                { id: 'regular', label: 'Tier Regular' },
                { id: 'member', label: 'Tier Member' },
                { id: 'vip', label: 'Tier VIP' },
              ].map(tier => {
                const isSelected = (formData.member_tier || '') === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        member_tier: tier.id || undefined,
                        member_only: tier.id ? 1 : 0
                      });
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {tier.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
