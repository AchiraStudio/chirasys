import { useState, useEffect } from 'react';
import { Tag, FolderTree, Plus, Loader2, Trash2, Edit2, Save, X, ChevronRight, Wand2, Search, Layers, Sparkles, Building2 } from 'lucide-react';
import { getBrands, addBrand, updateBrand, deleteBrand, getCategories, addCategory, updateCategory, deleteCategory, Brand, Category, discoverPotentialBrands, DiscoveredBrand } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../../components/ui/Modal';

export default function MasterData() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Filter / Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Discovery modal states
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveredBrands, setDiscoveredBrands] = useState<DiscoveredBrand[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<Set<string>>(new Set());
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isAddingDiscovered, setIsAddingDiscovered] = useState(false);

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
    if (!editName.trim()) return;
    try {
      if (activeTab === 'brands') { await updateBrand(id, editName); } 
      else { await updateCategory(id, editName); }
      setEditingId(null);
      loadData();
    } catch (error) { alert("Failed to update: " + error); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      if (activeTab === 'brands') { await deleteBrand(id); } 
      else { await deleteCategory(id); }
      loadData();
    } catch (error) { alert("Delete failed. Item might be in use."); }
  };

  const handleDiscover = async () => {
    setShowDiscovery(true);
    setIsDiscovering(true);
    setDiscoveredBrands([]);
    setSelectedDiscovered(new Set());
    try {
      const results = await discoverPotentialBrands();
      const existingNames = new Set(brands.map(b => b.name.toUpperCase()));
      setDiscoveredBrands(results.filter(r => !existingNames.has(r.name.toUpperCase())));
    } catch (e) {
      console.error(e);
      alert("Failed to discover brands.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAddDiscovered = async () => {
    if (selectedDiscovered.size === 0) return;
    setIsAddingDiscovered(true);
    try {
      for (const bName of Array.from(selectedDiscovered)) {
        await addBrand(bName);
      }
      const msg = await invoke('auto_assign_brands');
      alert(msg as string);
      setShowDiscovery(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error adding brands: " + e);
    } finally {
      setIsAddingDiscovered(false);
    }
  };

  // Filtered categories/brands by search query
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderCategoryTree = (parentId: string | null = null, depth = 0) => {
    const children = (searchQuery ? filteredCategories : categories).filter(c => (c.parent_id || null) === parentId);
    if (children.length === 0) return null;

    return (
      <div className="space-y-1.5">
        {children.map(cat => {
          const subChildrenCount = categories.filter(c => c.parent_id === cat.id).length;
          return (
            <div key={cat.id}>
              <div 
                className="flex items-center gap-3 py-2.5 px-3.5 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 transition-all group"
                style={{ marginLeft: `${depth * 1.5}rem` }}
              >
                {depth > 0 && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                <div className={`p-2 rounded-xl shrink-0 ${depth === 0 ? 'bg-brand/10 text-brand' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'}`}>
                  <FolderTree size={16} />
                </div>

                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      autoFocus 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      className="flex-1 bg-white dark:bg-slate-950 border border-brand rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20" 
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Save size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-rose-500 hover:text-white"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${depth === 0 ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-300'}`}>
                        {cat.name}
                      </p>
                      {subChildrenCount > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">{subChildrenCount} sub-kategori</span>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} 
                        className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                        title="Edit Kategori"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)} 
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              {renderCategoryTree(cat.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 flex flex-col gap-6 animate-in fade-in duration-300 w-full">
      
      {/* Top Header Banner (Subtle & Theme Adaptive) */}
      <div className="shrink-0 bg-white dark:bg-[#0B0F19] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <Layers size={13} /> Master Data Registry
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <FolderTree size={13} /> {categories.length} Kategori
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              <Tag size={13} /> {brands.length} Brand
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Kelola Kategori & Registri Brand
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Atur hirarki taksonomi obat, kategori produk, serta pendaftaran merk/pabrikan farmasi untuk katalog barang POS.
            </p>
          </div>
        </div>

        <button
          onClick={handleDiscover}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          <Wand2 size={15} /> Auto-Discover Brand Baru
        </button>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <div className="shrink-0 flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => { setActiveTab('categories'); setEditingId(null); setSearchQuery(''); }}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-brand text-white shadow-md shadow-brand/20'
              : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <FolderTree size={15} /> Kategori Produk ({categories.length})
        </button>

        <button
          onClick={() => { setActiveTab('brands'); setEditingId(null); setSearchQuery(''); }}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'brands'
              ? 'bg-brand text-white shadow-md shadow-brand/20'
              : 'bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Tag size={15} /> Registri Brand ({brands.length})
        </button>
      </div>

      {/* Main Content Area: 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Column: Form Action Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                {activeTab === 'categories' ? <FolderTree size={20} /> : <Tag size={20} />}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Tambah {activeTab === 'categories' ? 'Kategori' : 'Brand'} Baru
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTab === 'categories' ? 'Buat taksonomi atau sub-kategori' : 'Daftarkan merk produk baru'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Nama {activeTab === 'categories' ? 'Kategori' : 'Brand'}
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Contoh: ${activeTab === 'categories' ? 'Obat Bebas / Vitamin' : 'Kalbe Farma'}`}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              {activeTab === 'categories' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Induk Kategori (Parent)
                  </label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                  >
                    <option value="">-- Tanpa Induk (Root Level) --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !newItemName.trim()}
                className="w-full py-3.5 bg-brand hover:bg-blue-600 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Simpan {activeTab === 'categories' ? 'Kategori' : 'Brand'}
              </button>
            </form>
          </div>

          {/* Additional Info / AI Card */}
          {activeTab === 'brands' && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <Sparkles size={18} />
                <h3 className="text-sm font-bold">Auto-Assign Brand Engine</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Setiap kali brand baru ditambahkan, sistem akan memindai katalog barang dan otomatis menghubungkan barang berdasarkan nama merk.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Registry List & Search (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm flex flex-col min-h-[500px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Daftar {activeTab === 'categories' ? 'Kategori Produk' : 'Brand / Merk'}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeTab === 'categories' ? 'Struktur hirarki taksonomi' : 'Daftar pabrikan terdaftar'}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari ${activeTab === 'categories' ? 'kategori' : 'brand'}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-brand" />
                <p className="text-xs font-semibold">Memuat registri data...</p>
              </div>
            ) : activeTab === 'categories' ? (
              categories.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">Belum ada kategori terdaftar.</div>
              ) : (
                renderCategoryTree(null, 0)
              )
            ) : (
              /* Brands Grid Cards */
              filteredBrands.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">Tidak ada brand ditemukan.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredBrands.map(b => (
                    <div 
                      key={b.id} 
                      className="group p-3.5 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 hover:border-brand/40 transition-all flex items-center justify-between"
                    >
                      {editingId === b.id ? (
                        <div className="flex-1 flex items-center gap-1.5">
                          <input 
                            autoFocus 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            className="flex-1 bg-white dark:bg-slate-950 border border-brand rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none" 
                          />
                          <button onClick={() => handleUpdate(b.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 font-bold text-xs">
                              {b.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{b.name}</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => { setEditingId(b.id); setEditName(b.name); }} 
                              className="p-1 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg"
                              title="Edit Brand"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDelete(b.id)} 
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="Hapus Brand"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

        </div>

      </div>

      {/* Discovery Modal */}
      {showDiscovery && (
        <Modal
          isOpen={true}
          onClose={() => setShowDiscovery(false)}
          size="2xl"
          title="Auto-Discover Brand Produk"
          subtitle="Memindai nama obat unassigned untuk mendeteksi merk baru"
          icon={Wand2}
          iconBg="bg-emerald-500/10 text-emerald-500"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowDiscovery(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleAddDiscovered} 
                disabled={isAddingDiscovered || selectedDiscovered.size === 0} 
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isAddingDiscovered ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Daftarkan {selectedDiscovered.size} Brand
              </button>
            </div>
          }
        >
          {isDiscovering ? (
            <div className="flex flex-col items-center py-20 text-slate-400">
              <Loader2 size={36} className="animate-spin mb-3 text-emerald-500" />
              <p className="text-xs font-semibold">Menganalisis katalog obat...</p>
            </div>
          ) : discoveredBrands.length === 0 ? (
            <div className="text-center py-20 space-y-2">
              <Tag size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Tidak ada brand baru terdeteksi.</p>
              <p className="text-[11px] text-slate-400">Semua produk sudah terhubung dengan registri brand yang sesuai.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ditemukan <span className="font-bold text-slate-900 dark:text-white">{discoveredBrands.length}</span> merk baru. Pilih merk untuk didaftarkan:
                </p>
                <button 
                  type="button"
                  onClick={() => {
                    if (selectedDiscovered.size === discoveredBrands.length) {
                      setSelectedDiscovered(new Set());
                    } else {
                      setSelectedDiscovered(new Set(discoveredBrands.map(b => b.name)));
                    }
                  }}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  {selectedDiscovered.size === discoveredBrands.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {discoveredBrands.map((brand, idx) => (
                  <label 
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedDiscovered.has(brand.name) 
                        ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800' 
                        : 'bg-white border-slate-200 hover:border-emerald-300 dark:bg-[#0B0F19] dark:border-slate-800'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      checked={selectedDiscovered.has(brand.name)}
                      onChange={(e) => {
                        const newSet = new Set(selectedDiscovered);
                        if (e.target.checked) newSet.add(brand.name);
                        else newSet.delete(brand.name);
                        setSelectedDiscovered(newSet);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate" title={brand.name}>{brand.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{brand.count} produk terkait</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

    </div>
  );
}