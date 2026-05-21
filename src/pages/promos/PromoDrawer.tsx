import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { CreatePromoInput, getPromoDetail, createPromo, updatePromo, getItemsFiltered, getCategories, Category, Item } from '../../lib/api';
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
    tiers: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const debouncedItemSearch = useDebounce(itemSearchQuery, 300);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState('');

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
    if (isOpen && editPromoId) {
      loadPromo();
    } else if (isOpen) {
      setFormData({
        name: '', description: '', discount_percent: 0, min_qty: 1, member_only: 0,
        promo_type: 'percentage', applies_to: 'item', stack_rule: 'best_only', priority: 0,
        bogo_rules: [], tiers: []
      });
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
        tiers: detail.tiers
      });
      // Try to load item name if applied to item
      if (detail.promo.applies_to === 'item' && detail.promo.item_id) {
         setSelectedItemName(`Item ID: ${detail.promo.item_id}`); // Best effort without full fetch
         setItemSearchQuery(`Item ID: ${detail.promo.item_id}`);
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
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[500px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editPromoId ? 'Edit Promo' : 'New Promo'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="promoForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Weekend Sale" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select value={formData.promo_type} onChange={e => setFormData({...formData, promo_type: e.target.value})} className="input-field">
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="bogo">Buy 1 Get 1 (BOGO)</option>
                    <option value="tiered">Tiered Discount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Applies To</label>
                  <select value={formData.applies_to} onChange={e => setFormData({...formData, applies_to: e.target.value})} className="input-field">
                    <option value="item">Specific Item</option>
                    <option value="category">Category</option>
                    <option value="cart">Entire Cart</option>
                  </select>
                </div>
              </div>

              {formData.applies_to === 'item' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Item</label>
                  <input 
                    type="text" 
                    value={itemSearchQuery} 
                    onChange={e => {
                      setItemSearchQuery(e.target.value);
                      setShowItemDropdown(true);
                      if (e.target.value === '') setFormData({...formData, item_id: undefined});
                    }} 
                    onFocus={() => setShowItemDropdown(true)}
                    className="input-field" 
                    placeholder="Search item name or SKU..." 
                  />
                  {showItemDropdown && itemSearchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {isSearchingItem ? (
                        <div className="p-3 text-sm text-slate-600 text-center">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map(item => (
                          <div 
                            key={item.id}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                            onClick={() => {
                              setFormData({...formData, item_id: item.id});
                              setSelectedItemName(item.name);
                              setItemSearchQuery(item.name);
                              setShowItemDropdown(false);
                            }}
                          >
                            <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-slate-600">{item.sku}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-slate-600 text-center">No items found</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.applies_to === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Category</label>
                  <select 
                    value={formData.category_id || ''} 
                    onChange={e => setFormData({...formData, category_id: e.target.value || undefined})} 
                    className="input-field"
                  >
                    <option value="">Select Category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Type Fields */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                {(formData.promo_type === 'percentage' || formData.promo_type === 'fixed_amount') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount {formData.promo_type === 'percentage' ? '%' : 'Rp'}</label>
                      <input type="number" step="0.01" required value={formData.discount_value || 0} onChange={e => setFormData({...formData, discount_value: parseFloat(e.target.value), discount_percent: formData.promo_type === 'percentage' ? parseFloat(e.target.value) : 0})} className="input-field" />
                    </div>
                    {formData.promo_type === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Cap (Rp)</label>
                        <input type="number" value={formData.max_discount_amount || ''} onChange={e => setFormData({...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined})} className="input-field" placeholder="Optional" />
                      </div>
                    )}
                  </div>
                )}

                {formData.promo_type === 'tiered' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tiers</label>
                      <button type="button" onClick={handleAddTier} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"><Plus size={14} className="mr-1"/> Add Tier</button>
                    </div>
                    {formData.tiers.map((tier, idx) => (
                      <div key={idx} className="flex gap-2 items-center mb-2">
                        <input type="number" value={tier.min_qty} onChange={e => {
                          const newTiers = [...formData.tiers];
                          newTiers[idx].min_qty = parseFloat(e.target.value);
                          setFormData({...formData, tiers: newTiers});
                        }} className="input-field py-1 text-sm" placeholder="Min Qty" />
                        <input type="number" value={tier.discount_percent} onChange={e => {
                          const newTiers = [...formData.tiers];
                          newTiers[idx].discount_percent = parseFloat(e.target.value);
                          setFormData({...formData, tiers: newTiers});
                        }} className="input-field py-1 text-sm" placeholder="Disc %" />
                        <button type="button" onClick={() => handleRemoveTier(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.promo_type === 'bogo' && (
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600 mb-2">Configure Buy X Get Y Free rules.</p>
                     
                     {formData.bogo_rules.length === 0 ? (
                       <button type="button" onClick={() => {
                          setFormData({...formData, bogo_rules: [{buy_qty: 1, get_qty: 1, free_item_discount_percent: 100}]});
                       }} className="btn-secondary text-sm w-full">Add BOGO Rule</button>
                     ) : (
                       <div className="grid grid-cols-2 gap-4 items-end">
                         <div>
                           <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Buy Qty</label>
                           <input type="number" min="1" value={formData.bogo_rules[0].buy_qty} onChange={e => {
                             const rules = [...formData.bogo_rules];
                             rules[0].buy_qty = parseInt(e.target.value);
                             setFormData({...formData, bogo_rules: rules});
                           }} className="input-field" />
                         </div>
                         <div>
                           <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Get Qty (Free)</label>
                           <input type="number" min="1" value={formData.bogo_rules[0].get_qty} onChange={e => {
                             const rules = [...formData.bogo_rules];
                             rules[0].get_qty = parseInt(e.target.value);
                             setFormData({...formData, bogo_rules: rules});
                           }} className="input-field" />
                         </div>
                         <div className="col-span-2">
                           <p className="text-xs text-slate-600">
                             Note: The free item will be the same as the purchased item. 
                           </p>
                         </div>
                       </div>
                     )}
                  </div>
                )}
              </div>

              {/* Requirements & Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Qty required</label>
                  <input type="number" value={formData.min_qty} onChange={e => setFormData({...formData, min_qty: parseFloat(e.target.value)})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Member Tier</label>
                  <select value={formData.member_tier || ''} onChange={e => setFormData({...formData, member_tier: e.target.value || undefined})} className="input-field">
                    <option value="">All Customers</option>
                    <option value="regular">Regular</option>
                    <option value="member">Member</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} className="input-field" />
                </div>
              </div>

              {/* Stacking */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stack Rule</label>
                  <select value={formData.stack_rule} onChange={e => setFormData({...formData, stack_rule: e.target.value})} className="input-field bg-white">
                    <option value="best_only">Best Only (Recommended)</option>
                    <option value="additive">Additive (Stacks with others)</option>
                    <option value="none">None (Exclusive)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})} className="input-field bg-white" placeholder="0 = highest" />
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="promoForm" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Promo'}
          </button>
        </div>
      </div>
    </>
  );
}
