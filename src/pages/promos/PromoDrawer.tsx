import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Percent, Coins, Gift, Layers, Package, Calendar, Settings, Info, Search, Sparkles } from 'lucide-react';
import { CreatePromoInput, getPromoDetail, createPromo, updatePromo, getItemsFiltered, getCategories, Category, Item, getItem } from '../../lib/api';
import { useDebounce } from '../../lib/hooks/useDebounce';

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
    priority: 0,
    bogo_rules: [],
    tiers: [],
    bundle_items: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const debouncedItemSearch = useDebounce(itemSearchQuery, 300);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [, setSelectedItemName] = useState('');

  // Bundle states
  const [bundleSearchQuery, setBundleSearchQuery] = useState('');
  const debouncedBundleSearch = useDebounce(bundleSearchQuery, 300);
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
    if (debouncedItemSearch) {
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
    if (debouncedBundleSearch) {
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
    if (isOpen && editPromoId) {
      loadPromo();
    } else if (isOpen) {
      setFormData({
        name: '', description: '', discount_percent: 0, min_qty: 1, member_only: 0,
        promo_type: 'percentage', applies_to: 'item', stack_rule: 'best_only', priority: 0,
        bogo_rules: [], tiers: [], bundle_items: []
      });
      setBundleItemDetails({});
      setItemSearchQuery('');
      setBundleSearchQuery('');
      setSelectedItemName('');
    }
  }, [isOpen, editPromoId]);

  const loadPromo = async () => {
    try {
      const detail = await getPromoDetail(editPromoId!);
      setFormData({
        ...detail.promo,
        discount_value: detail.promo.discount_value ?? undefined,
        max_discount_amount: detail.promo.max_discount_amount ?? undefined,
        bogo_rules: detail.bogo_rules,
        tiers: detail.tiers,
        bundle_items: detail.bundle_items
      });
      // Try to load item name if applied to item
      if (detail.promo.applies_to === 'item' && detail.promo.item_id) {
         try {
           const res = await getItem(detail.promo.item_id);
           setSelectedItemName(res.item.name);
           setItemSearchQuery(res.item.name);
         } catch (e) {
           setSelectedItemName(`Item ID: ${detail.promo.item_id}`);
           setItemSearchQuery(`Item ID: ${detail.promo.item_id}`);
         }
      }
      // Load details for bundle items
      if (detail.bundle_items && detail.bundle_items.length > 0) {
        const details: Record<string, Item> = {};
        for (const bi of detail.bundle_items) {
          try {
            const res = await getItem(bi.item_id);
            details[bi.item_id] = res.item;
          } catch (e) {
            console.error(e);
          }
        }
        setBundleItemDetails(details);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editPromoId) {
        await updatePromo(editPromoId, formData);
      } else {
        await createPromo(formData);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save promo: ' + error);
    }
    setLoading(false);
  };

  const handleAddTier = () => {
    setFormData(prev => ({ ...prev, tiers: [...prev.tiers, { min_qty: 2, discount_percent: 10 }] }));
  };
  
  const handleRemoveTier = (index: number) => {
    setFormData(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0F172A] shadow-[0_20px_50px_rgba(8,_112,_184,_0.15)] dark:shadow-[0_20px_50px_rgba(0,_0,_0,_0.5)] flex flex-col rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 max-h-[92vh] animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 sm:px-8 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-slate-50/50 to-indigo-50/20 dark:from-slate-900/50 dark:to-slate-900/20 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-brand to-indigo-600 rounded-2xl text-white shadow-lg shadow-brand/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {editPromoId ? 'Edit Promotion' : 'Create Promotion'}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Set up discounts, tiered savings, or item bundle deals
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <form id="promoForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* General Info Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Promotion Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-medium" 
                  placeholder="e.g. Weekend Special, Vitamin C Combo" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Description (Optional)</label>
                <input 
                  type="text" 
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-medium" 
                  placeholder="Describe the promotion for staff reference..." 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Promo Type</label>
                  <div className="relative">
                    <select 
                      value={formData.promo_type} 
                      onChange={e => {
                        const newType = e.target.value;
                        setFormData({
                          ...formData, 
                          promo_type: newType,
                          // If type is bundle, applies_to should be item
                          applies_to: newType === 'bundle' ? 'item' : formData.applies_to
                        });
                      }} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-semibold appearance-none cursor-pointer"
                    >
                      <option value="percentage">Percentage Discount</option>
                      <option value="fixed_amount">Fixed Amount Discount</option>
                      <option value="bogo">Buy X Get Y (BOGO)</option>
                      <option value="tiered">Tiered Discount</option>
                      <option value="bundle">Item Bundle Deal</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <Settings size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Applies To</label>
                  <div className="relative">
                    <select 
                      disabled={formData.promo_type === 'bundle'}
                      value={formData.applies_to} 
                      onChange={e => setFormData({...formData, applies_to: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-semibold appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="item">Specific Item</option>
                      <option value="category">Category</option>
                      <option value="cart">Entire Cart</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <Info size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specific Item Selection */}
              {formData.applies_to === 'item' && formData.promo_type !== 'bundle' && (
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Target Item</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={itemSearchQuery} 
                      onChange={e => {
                        setItemSearchQuery(e.target.value);
                        setShowItemDropdown(true);
                        if (e.target.value === '') setFormData({...formData, item_id: undefined});
                      }} 
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-medium" 
                      placeholder="Search target item name or SKU..." 
                    />
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  </div>
                  {showItemDropdown && itemSearchQuery && (
                    <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-52 overflow-y-auto custom-scrollbar">
                      {isSearchingItem ? (
                        <div className="p-4 text-sm text-slate-500 text-center font-medium">Searching items...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map(item => (
                          <div 
                            key={item.id}
                            className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 last:border-0 transition-colors"
                            onClick={() => {
                              setFormData({...formData, item_id: item.id});
                              setSelectedItemName(item.name);
                              setItemSearchQuery(item.name);
                              setShowItemDropdown(false);
                            }}
                          >
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                            <div className="text-xs font-semibold text-slate-400 mt-0.5">{item.sku}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-slate-500 text-center font-medium">No items found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Target Category Selection */}
              {formData.applies_to === 'category' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Target Category</label>
                  <div className="relative">
                    <select 
                      value={formData.category_id || ''} 
                      onChange={e => setFormData({...formData, category_id: e.target.value || undefined})} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-semibold appearance-none cursor-pointer"
                    >
                      <option value="">Select Category...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <Layers size={16} />
                    </div>
                  </div>
                </div>
              )}

              {/* Bundle items selector */}
              {formData.promo_type === 'bundle' && (
                <div className="p-5 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Package size={18} />
                    <h3 className="font-extrabold text-sm uppercase tracking-wide">Bundle Selection</h3>
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 text-sm font-medium" 
                        placeholder="Search items to add to bundle..." 
                      />
                      <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    </div>

                    {showBundleDropdown && bundleSearchQuery && (
                      <div className="absolute z-55 w-full mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {isSearchingBundle ? (
                          <div className="p-3 text-xs text-slate-500 text-center font-medium">Searching...</div>
                        ) : bundleSearchResults.length > 0 ? (
                          bundleSearchResults.map(item => (
                            <div 
                              key={item.id}
                              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer border-b border-slate-100 dark:border-slate-800/40 last:border-0 transition-colors"
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
                              <div className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</div>
                              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.sku}</div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 text-center font-medium">No items found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bundle Items List */}
                  <div className="space-y-2">
                    {(!formData.bundle_items || formData.bundle_items.length === 0) ? (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Package size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-1.5" />
                        <p className="text-xs font-semibold text-slate-400">No items in bundle. Search and select items above.</p>
                      </div>
                    ) : (
                      formData.bundle_items.map((bi) => {
                        const itemInfo = bundleItemDetails[bi.item_id];
                        return (
                          <div 
                            key={bi.item_id} 
                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow"
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="text-xs font-bold text-slate-950 dark:text-white truncate">
                                {itemInfo?.name || `Loading Item (${bi.item_id})`}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5">
                                {itemInfo?.sku || 'SKU loading'}
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
                                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
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
                                  className="w-10 bg-transparent text-center text-xs font-bold text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      bundle_items: (prev.bundle_items || []).map(b => b.item_id === bi.item_id ? { ...b, qty: b.qty + 1 } : b)
                                    }));
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
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
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
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

              {/* Dynamic Type Config Section */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                
                {/* Fixed Amount / Percentage Discount */}
                {(formData.promo_type === 'percentage' || formData.promo_type === 'fixed_amount' || formData.promo_type === 'bundle') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-brand">
                      {formData.promo_type === 'percentage' ? <Percent size={18} /> : <Coins size={18} />}
                      <h3 className="font-extrabold text-sm uppercase tracking-wide">Discount Configuration</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {formData.promo_type === 'bundle' && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Discount Metric</label>
                          <div className="relative">
                            <select 
                              value={formData.discount_percent > 0 ? 'percent' : 'fixed'}
                              onChange={e => {
                                if (e.target.value === 'percent') {
                                  setFormData({ ...formData, discount_percent: formData.discount_value || 10, discount_value: undefined });
                                } else {
                                  setFormData({ ...formData, discount_value: formData.discount_percent || 5000, discount_percent: 0 });
                                }
                              }}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold appearance-none cursor-pointer"
                            >
                              <option value="percent">Percentage (%)</option>
                              <option value="fixed">Fixed Amount (Rp)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                              <Settings size={16} />
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Discount Value {(formData.promo_type === 'percentage' || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) ? '(%)' : '(Rp)'}
                        </label>
                        <input 
                          type="number" 
                          step="0.01" 
                          required 
                          value={(formData.promo_type === 'percentage' || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) ? formData.discount_percent : (formData.discount_value || 0)} 
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            if (formData.promo_type === 'percentage') {
                              setFormData({...formData, discount_value: val, discount_percent: val});
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
                          className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-bold" 
                        />
                      </div>

                      {((formData.promo_type === 'percentage') || (formData.promo_type === 'bundle' && formData.discount_percent > 0)) && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Max Cap Amount (Rp)</label>
                          <input 
                            type="number" 
                            value={formData.max_discount_amount || ''} 
                            onChange={e => setFormData({...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined})} 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand transition-all duration-200 font-semibold" 
                            placeholder="e.g. 50000 (Optional)" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tiered Discount Configuration */}
                {formData.promo_type === 'tiered' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
                      <div className="flex items-center gap-2">
                        <Layers size={18} />
                        <h3 className="font-extrabold text-sm uppercase tracking-wide">Tiered Rules</h3>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddTier} 
                        className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-indigo-650 dark:text-indigo-300 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                      >
                        <Plus size={14} /> Add Tier
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.tiers.map((tier, idx) => (
                        <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-left-2 duration-200">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input 
                                type="number" 
                                value={tier.min_qty} 
                                onChange={e => {
                                  const newTiers = [...formData.tiers];
                                  newTiers[idx].min_qty = parseFloat(e.target.value);
                                  setFormData({...formData, tiers: newTiers});
                                }} 
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-semibold" 
                                placeholder="Min Qty" 
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">Qty</span>
                            </div>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={tier.discount_percent} 
                                onChange={e => {
                                  const newTiers = [...formData.tiers];
                                  newTiers[idx].discount_percent = parseFloat(e.target.value);
                                  setFormData({...formData, tiers: newTiers});
                                }} 
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-bold" 
                                placeholder="Discount %" 
                              />
                              <span className="absolute right-3 top-2.5 text-xs font-bold text-brand">%</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTier(idx)} 
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
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
                     <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                       <Gift size={18} />
                       <h3 className="font-extrabold text-sm uppercase tracking-wide">Buy One Get One (BOGO)</h3>
                     </div>
                     <p className="text-xs text-slate-500 font-medium">Configure rules such as: Buy 2 items, get 1 free.</p>
                     
                     {formData.bogo_rules.length === 0 ? (
                       <button 
                         type="button" 
                         onClick={() => {
                            setFormData({...formData, bogo_rules: [{buy_qty: 2, get_qty: 1, free_item_discount_percent: 100}]});
                         }} 
                         className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all text-sm border-dashed"
                       >
                         Initialize BOGO Rules
                       </button>
                     ) : (
                       <div className="grid grid-cols-2 gap-4 items-end bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Buy Quantity</label>
                           <input 
                             type="number" 
                             min="1" 
                             value={formData.bogo_rules[0].buy_qty} 
                             onChange={e => {
                               const rules = [...formData.bogo_rules];
                               rules[0].buy_qty = parseInt(e.target.value) || 1;
                               setFormData({...formData, bogo_rules: rules});
                             }} 
                             className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-900 dark:text-white text-sm font-bold" 
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Free Quantity</label>
                           <input 
                             type="number" 
                             min="1" 
                             value={formData.bogo_rules[0].get_qty} 
                             onChange={e => {
                               const rules = [...formData.bogo_rules];
                               rules[0].get_qty = parseInt(e.target.value) || 1;
                               setFormData({...formData, bogo_rules: rules});
                             }} 
                             className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-900 dark:text-white text-sm font-bold" 
                           />
                         </div>
                         <div className="col-span-2 mt-2">
                           <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 text-[11px] font-semibold">
                             <Info size={14} className="shrink-0" />
                             <span>Under current BOGO configuration, the free item will be matching the purchased item.</span>
                           </div>
                         </div>
                       </div>
                     )}
                  </div>
                )}
              </div>

              {/* Requirements & Scheduling */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                  <Calendar size={18} />
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Validation Rules & Validity</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Min Qty required</label>
                    <input 
                      type="number" 
                      value={formData.min_qty} 
                      onChange={e => setFormData({...formData, min_qty: parseFloat(e.target.value) || 1})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Member Tier Restriction</label>
                    <div className="relative">
                      <select 
                        value={formData.member_tier || ''} 
                        onChange={e => setFormData({...formData, member_tier: e.target.value || undefined})} 
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold appearance-none cursor-pointer"
                      >
                        <option value="">All Customers</option>
                        <option value="regular">Regular</option>
                        <option value="member">Member</option>
                        <option value="vip">VIP</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <Settings size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Start Date</label>
                    <input 
                      type="date" 
                      value={formData.start_date || ''} 
                      onChange={e => setFormData({...formData, start_date: e.target.value || undefined})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">End Date</label>
                    <input 
                      type="date" 
                      value={formData.end_date || ''} 
                      onChange={e => setFormData({...formData, end_date: e.target.value || undefined})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/35 focus:border-brand font-semibold" 
                    />
                  </div>
                </div>
              </div>

              {/* Priority & Stacking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-amber-500/5 dark:bg-amber-500/5 rounded-3xl border border-amber-250 dark:border-amber-950/40">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1.5">Stack Rule</label>
                  <div className="relative">
                    <select 
                      value={formData.stack_rule} 
                      onChange={e => setFormData({...formData, stack_rule: e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/30 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-semibold appearance-none cursor-pointer"
                    >
                      <option value="best_only">Best Only (Recommended)</option>
                      <option value="additive">Additive (Stacks with others)</option>
                      <option value="none">None (Exclusive)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-amber-600 dark:text-amber-500">
                      <Info size={16} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1.5">Priority Order</label>
                  <input 
                    type="number" 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: parseInt(e.target.value) || 0})} 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/30 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-semibold" 
                    placeholder="0 = highest priority" 
                  />
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex justify-end gap-3.5 shrink-0 z-10">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-200"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="promoForm" 
            disabled={loading || (formData.promo_type === 'bundle' && (!formData.bundle_items || formData.bundle_items.length === 0))} 
            className="px-6 py-3 bg-gradient-to-r from-brand to-indigo-650 hover:from-brand-hover hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl flex items-center gap-2 shadow-lg shadow-brand/20 transition-all duration-200 hover:scale-[1.02]"
          >
            <Save size={16} />
            {loading ? 'Saving Promo...' : (editPromoId ? 'Update Promo' : 'Save Promo')}
          </button>
        </div>
      </div>
    </div>
  );
}
