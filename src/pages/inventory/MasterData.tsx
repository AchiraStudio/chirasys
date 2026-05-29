import { useState, useEffect } from 'react';
import { Tag, FolderTree, Plus, Loader2, Trash2, Edit2, Save, X, ChevronRight } from 'lucide-react';
import { getBrands, addBrand, updateBrand, deleteBrand, getCategories, addCategory, updateCategory, deleteCategory, Brand, Category } from '../../lib/api';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newItemName, setNewItemName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([getBrands(), getCategories()]);
      setBrands(b); setCategories(c);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsSubmitting(true);
    try {
      if (activeTab === 'brands') { 
        await addBrand(newItemName.trim());
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('auto_assign_brands');
        } catch (e) {
          console.warn("Failed to auto-assign brands", e);
        }
      } 
      else { await addCategory(newItemName.trim(), undefined, undefined, selectedParentId || undefined); }
      setNewItemName(''); setSelectedParentId('');
      loadData();
    } catch (error) { console.error(error); } 
    finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (id: string) => {
    try {
      if (activeTab === 'brands') { await updateBrand(id, editName); } 
      else { await updateCategory(id, editName); }
      setEditingId(null);
      loadData();
    } catch (error) { alert("Failed to update: " + error); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this record?")) return;
    try {
      if (activeTab === 'brands') { await deleteBrand(id); } 
      else { await deleteCategory(id); }
      loadData();
    } catch (error) { alert("Delete failed. Item might be in use."); }
  };

  const renderCategoryTree = (parentId: string | null = null, depth = 0) => {
    const children = categories.filter(c => (c.parent_id || null) === parentId);
    if (children.length === 0) return null;
    return (
      <div className="space-y-1">
        {children.map(cat => (
          <div key={cat.id}>
            <div className="flex items-center gap-3 py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group" style={{ marginLeft: `${depth * 1.5}rem` }}>
              {depth > 0 && <ChevronRight size={14} className="text-slate-500 dark:text-slate-600" />}
              <FolderTree size={16} className={depth === 0 ? "text-brand" : "text-slate-500"} />
              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-brand/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20" />
                  <button onClick={() => handleUpdate(cat.id)} className="text-emerald-500 hover:text-emerald-600"><Save size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-rose-500"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${depth === 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{cat.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="text-slate-500 hover:text-brand p-1"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="text-slate-500 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
            {renderCategoryTree(cat.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col gap-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Master Data</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your product categories and brand registries.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-4 bg-slate-50/50 dark:bg-slate-900/30">
          <button onClick={() => { setActiveTab('categories'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-medium text-sm ${activeTab === 'categories' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}><FolderTree size={18} />Categories</button>
          <button onClick={() => { setActiveTab('brands'); setEditingId(null); }} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-medium text-sm ${activeTab === 'brands' ? 'border-brand text-brand' : 'border-transparent text-slate-600'}`}><Tag size={18} />Brands</button>
        </div>

        <div className="p-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleAddItem} className="flex shrink-0 gap-3 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder={`Add new ${activeTab === 'brands' ? 'brand' : 'category'} name...`} disabled={isSubmitting} className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all" />
            {activeTab === 'categories' && (
              <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} className="w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20">
                <option value="">No Parent (Root)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button type="submit" disabled={isSubmitting || !newItemName.trim()} className="bg-brand text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Save
            </button>
          </form>

          <div className="flex-1 min-h-0">
            {loading ? <div className="flex flex-col items-center py-20 text-slate-500"><Loader2 size={32} className="animate-spin mb-4 text-brand" /><p>Loading registry data...</p></div> : 
             activeTab === 'categories' ? (
              <div className="bg-white dark:bg-[#0B0F19] rounded-xl border border-slate-200 dark:border-slate-800 p-4">{categories.length === 0 ? <p className="text-center text-slate-600 py-10">No categories found.</p> : renderCategoryTree(null, 0)}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.length === 0 ? <p className="text-center text-slate-600 py-10 col-span-full">No brands found.</p> : brands.map(b => (
                  <div key={b.id} className="group p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center bg-white dark:bg-[#0B0F19] hover:border-brand/30 transition-colors shadow-sm">
                    {editingId === b.id ? (
                      <div className="flex-1 flex items-center gap-2 mr-2">
                        <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-brand/50 rounded px-2 py-1 text-sm focus:outline-none" />
                        <button onClick={() => handleUpdate(b.id)} className="text-emerald-500"><Save size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-500"><X size={16} /></button>
                      </div>
                    ) : (
                      <><div className="flex items-center gap-3"><div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500"><Tag size={16} /></div><span className="font-semibold text-sm">{b.name}</span></div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button onClick={() => { setEditingId(b.id); setEditName(b.name); }} className="p-1.5 text-slate-500 hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-900 rounded-md"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md"><Trash2 size={14} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}