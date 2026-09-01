import { useState, useEffect } from 'react';
import { Save, Layers, Loader2, Search } from 'lucide-react';
import { getCategories, getItemsFiltered, Category, Item } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../../components/ui/Modal';

interface BulkStockAddProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onSuccess: () => void;
}

export default function BulkStockAdd({ isOpen, onClose, branchId, onSuccess }: BulkStockAddProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  
  const [loadingItems, setLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // qty state for each item (id -> qty)
  const [qtys, setQtys] = useState<Record<string, number>>({});
  // hpp state for each item (id -> hpp)
  const [hpps, setHpps] = useState<Record<string, number>>({});
  // batch state
  const [batchNos, setBatchNos] = useState<Record<string, string>>({});
  // expiry state
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});

  // QOL multi-select and bulk edit
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkQty, setBulkQty] = useState('');
  const [bulkCat, setBulkCat] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories);
      fetchItems('all', '');
      setQtys({});
      setHpps({});
      setBatchNos({});
      setExpiryDates({});
    }
  }, [isOpen]);

  const fetchItems = async (catId: string, searchStr: string) => {
    setLoadingItems(true);
    try {
      // Use a large per_page to load all items at once — no pagination needed here
      const res = await getItemsFiltered(searchStr, catId === 'all' ? '' : catId, '', true, 1, 9999);
      setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchItems(selectedCategory, search);
        setSelectedIds(new Set()); // reset selection on search
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [search, selectedCategory, isOpen]);

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const applyBulkChanges = async () => {
    if (selectedIds.size === 0) return alert("Select at least one item first.");
    
    // Apply Qty if filled
    if (bulkQty) {
      const q = Number(bulkQty);
      if (!isNaN(q) && q >= 0) {
        setQtys(prev => {
          const next = { ...prev };
          selectedIds.forEach(id => next[id] = q);
          return next;
        });
      }
    }

    // Apply Category if filled
    if (bulkCat) {
      setIsApplyingBulk(true);
      try {
        await invoke('bulk_update_category', { itemIds: Array.from(selectedIds), categoryId: bulkCat });
        // Refresh local item state
        setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, category_id: bulkCat, category_name: categories.find(c => c.id === bulkCat)?.name } as Item : i));
        alert("Categories updated successfully!");
      } catch (e) {
        alert("Failed to update categories: " + e);
      } finally {
        setIsApplyingBulk(false);
      }
    }
  };

  const handleSubmit = async () => {
    const payload = items
      .filter(i => qtys[i.id] && qtys[i.id] > 0)
      .map(i => {
        let expiryDate = expiryDates[i.id];
        if (expiryDate && new Date(expiryDate) < new Date(new Date().setHours(0,0,0,0))) {
          throw new Error(`Item ${i.name} has expiry date in the past.`);
        }
        return {
          item_id: i.id,
          unit_id: i.base_unit_id,
          qty_change: qtys[i.id],
          hpp_value: hpps[i.id] !== undefined ? hpps[i.id] : (i.avg_hpp || 0),
          batch_no: batchNos[i.id] || null,
          expiry_date: expiryDate || null,
          notes: 'Bulk Stock Addition',
        };
      });

    if (payload.length === 0) {
      alert("No quantities entered.");
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke('bulk_add_stock', { branchId, items: payload });
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(`Failed to save bulk stock: ${e.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Penyesuaian Stok Massal"
      subtitle="Tambah atau sesuaikan stok beberapa produk sekaligus"
      icon={Layers}
      noPadding={true}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          {/* Top Row: Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          {/* Bottom Row: Bulk Apply Toolbar */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 px-2 min-w-[120px]">
              {selectedIds.size} Selected
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Apply to Selected:</span>
            
            <input 
              type="number"
              placeholder="Set Qty"
              value={bulkQty}
              onChange={e => setBulkQty(e.target.value)}
              className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
            />
            
            <select 
              value={bulkCat}
              onChange={e => setBulkCat(e.target.value)}
              className="w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
            >
              <option value="">Move Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button 
              onClick={applyBulkChanges}
              disabled={selectedIds.size === 0 || (!bulkQty && !bulkCat) || isApplyingBulk}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isApplyingBulk ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {loadingItems ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin text-brand" size={24} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10">
                <tr className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  <th className="py-3 px-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                  </th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 w-32">Add Qty</th>
                  <th className="py-3 px-4 w-32">Batch No.</th>
                  <th className="py-3 px-4 w-40">Expiry Date</th>
                  <th className="py-3 px-4 w-32">Cost/Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {items.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${selectedIds.has(item.id) ? 'bg-brand/5 dark:bg-brand/10' : ''}`}>
                    <td className="py-2 px-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.sku} • {item.base_unit_name || 'Unit'}</div>
                    </td>
                    <td className="py-2 px-4 text-slate-600 dark:text-slate-400">{(item as any).category_name || '-'}</td>
                    <td className="py-2 px-4">
                      <input 
                        type="number"
                        min="0"
                        value={qtys[item.id] || ''}
                        onChange={e => setQtys({...qtys, [item.id]: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="text"
                        value={batchNos[item.id] || ''}
                        onChange={e => setBatchNos({...batchNos, [item.id]: e.target.value})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="date"
                        value={expiryDates[item.id] || ''}
                        onChange={e => setExpiryDates({...expiryDates, [item.id]: e.target.value})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input 
                        type="number"
                        min="0"
                        value={hpps[item.id] !== undefined ? hpps[item.id] : (item.avg_hpp || '')}
                        onChange={e => setHpps({...hpps, [item.id]: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand outline-none dark:text-white"
                        placeholder="Cost"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
