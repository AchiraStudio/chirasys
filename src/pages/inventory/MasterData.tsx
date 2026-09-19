import { useState, useEffect } from 'react';
import { Tag, FolderTree, Plus, Loader2, Trash2, Edit2, Save, X, ChevronRight, Wand2, Search, Layers, Sparkles, Building2 } from 'lucide-react';
import { getBrands, addBrand, updateBrand, deleteBrand, getCategories, addCategory, updateCategory, deleteCategory, Brand, Category, discoverPotentialBrands, DiscoveredBrand, invoke } from '../../lib/api';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
    } catch (error) { toast.error("Failed to update: " + error); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    try {
      if (activeTab === 'brands') { await deleteBrand(id); } 
      else { await deleteCategory(id); }
      loadData();
    } catch (error) { toast.error("Delete failed. Item might be in use."); }
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
      toast.error("Failed to discover brands.");
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
      toast.error(msg as string);
      setShowDiscovery(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("Error adding brands: " + e);
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
                className="flex items-center gap-3 py-2.5 px-3.5 bg-muted/70 dark:bg-card/40 hover:bg-muted rounded-xl border border-line transition-all group"
                style={{ marginLeft: `${depth * 1.5}rem` }}
              >
                {depth > 0 && <ChevronRight size={14} className="text-dim shrink-0" />}
                <div className={`p-2 rounded-xl shrink-0 ${depth === 0 ? 'bg-primary-soft text-primary' : 'bg-line/60 dark:bg-muted text-dim'}`}>
                  <FolderTree size={16} />
                </div>

                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      autoFocus 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      className="flex-1 bg-card dark:bg-input border border-primary rounded-xl px-3 py-1.5 text-xs font-bold text-heading outline-none focus:ring-2 focus:ring-primary/20" 
                    />
                    <button onClick={() => handleUpdate(cat.id)} className="p-1.5 bg-success text-white rounded-lg hover:bg-success"><Save size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-line dark:bg-muted text-body rounded-lg hover:bg-danger hover:text-white"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${depth === 0 ? 'font-black text-heading' : 'font-bold text-heading'}`}>
                        {cat.name}
                      </p>
                      {subChildrenCount > 0 && (
                        <span className="text-[10px] text-dim font-mono">{subChildrenCount} sub-kategori</span>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} 
                        className="p-1.5 text-dim hover:text-primary hover:bg-primary-soft rounded-lg transition-colors"
                        title="Edit Kategori"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)} 
                        className="p-1.5 text-dim hover:text-danger hover:bg-danger-soft dark:hover:bg-danger/30 rounded-lg transition-colors"
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
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 flex flex-col gap-6 animate-fade-in w-full">
      
      {/* Top Header Banner (Subtle & Theme Adaptive) */}
      <div className="shrink-0 bg-card rounded-xl p-6 border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary border border-primary/20 flex items-center gap-1.5">
              <Layers size={13} /> Master Data Registry
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success dark:text-success border border-success/20 flex items-center gap-1.5">
              <FolderTree size={13} /> {categories.length} Kategori
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-soft text-primary dark:text-purple-400 border border-primary/20 flex items-center gap-1.5">
              <Tag size={13} /> {brands.length} Brand
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-heading">
              Kelola Kategori & Registri Brand
            </h1>
            <p className="text-xs sm:text-sm text-dim max-w-2xl leading-relaxed mt-0.5">
              Atur hirarki taksonomi obat, kategori produk, serta pendaftaran merk/pabrikan farmasi untuk katalog barang POS.
            </p>
          </div>
        </div>

        <button
          onClick={handleDiscover}
          className="flex items-center gap-2 px-4 py-2.5 bg-success hover:bg-success text-white rounded-xl text-xs font-bold shadow-md shadow-success/20 transition-all cursor-pointer shrink-0"
        >
          <Wand2 size={15} /> Auto-Discover Brand Baru
        </button>
      </div>

      {/* Segmented Tab Navigation Bar */}
      <div className="shrink-0 flex items-center gap-2 border-b border-line pb-3 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => { setActiveTab('categories'); setEditingId(null); setSearchQuery(''); }}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-card border border-line text-body hover:text-heading dark:hover:text-white hover:bg-muted/60'
          }`}
        >
          <FolderTree size={15} /> Kategori Produk ({categories.length})
        </button>

        <button
          onClick={() => { setActiveTab('brands'); setEditingId(null); setSearchQuery(''); }}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'brands'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-card border border-line text-body hover:text-heading dark:hover:text-white hover:bg-muted/60'
          }`}
        >
          <Tag size={15} /> Registri Brand ({brands.length})
        </button>
      </div>

      {/* Main Content Area: 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Column: Form Action Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card rounded-xl border border-line p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="p-3 bg-primary-soft text-primary rounded-xl">
                {activeTab === 'categories' ? <FolderTree size={20} /> : <Tag size={20} />}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-heading">
                  Tambah {activeTab === 'categories' ? 'Kategori' : 'Brand'} Baru
                </h2>
                <p className="text-xs text-dim">
                  {activeTab === 'categories' ? 'Buat taksonomi atau sub-kategori' : 'Daftarkan merk produk baru'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-heading uppercase tracking-wide">
                  Nama {activeTab === 'categories' ? 'Kategori' : 'Brand'}
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`Contoh: ${activeTab === 'categories' ? 'Obat Bebas / Vitamin' : 'Kalbe Farma'}`}
                  disabled={isSubmitting}
                  className="w-full bg-muted border border-line rounded-xl px-4 py-3 text-xs font-bold text-heading outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {activeTab === 'categories' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-heading uppercase tracking-wide">
                    Induk Kategori (Parent)
                  </label>
                  <Select
                    value={selectedParentId}
                    onChange={(v) => setSelectedParentId(v)}
                    className="w-full bg-muted border border-line rounded-xl px-4 py-3 text-xs font-bold text-heading outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Tanpa Induk (Root Level) --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !newItemName.trim()}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Simpan {activeTab === 'categories' ? 'Kategori' : 'Brand'}
              </button>
            </form>
          </div>

          {/* Additional Info / AI Card */}
          {activeTab === 'brands' && (
            <div className="bg-muted/60 rounded-xl p-6 border border-line shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-success dark:text-success">
                <Sparkles size={18} />
                <h3 className="text-sm font-bold">Auto-Assign Brand Engine</h3>
              </div>
              <p className="text-xs text-body leading-relaxed">
                Setiap kali brand baru ditambahkan, sistem akan memindai katalog barang dan otomatis menghubungkan barang berdasarkan nama merk.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Registry List & Search (8 Cols) */}
        <div className="lg:col-span-8 bg-card rounded-xl border border-line p-6 space-y-5 shadow-sm flex flex-col min-h-[500px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-soft text-primary rounded-xl">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-heading text-sm">
                  Daftar {activeTab === 'categories' ? 'Kategori Produk' : 'Brand / Merk'}
                </h3>
                <p className="text-xs text-dim">
                  {activeTab === 'categories' ? 'Struktur hirarki taksonomi' : 'Daftar pabrikan terdaftar'}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
              <input
                type="text"
                placeholder={`Cari ${activeTab === 'categories' ? 'kategori' : 'brand'}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-muted border border-line rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-heading outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-dim">
                <Loader2 size={32} className="animate-spin mb-3 text-primary" />
                <p className="text-xs font-semibold">Memuat registri data...</p>
              </div>
            ) : activeTab === 'categories' ? (
              categories.length === 0 ? (
                <div className="text-center py-20 text-dim text-xs">Belum ada kategori terdaftar.</div>
              ) : (
                renderCategoryTree(null, 0)
              )
            ) : (
              /* Brands Grid Cards */
              filteredBrands.length === 0 ? (
                <div className="text-center py-20 text-dim text-xs">Tidak ada brand ditemukan.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredBrands.map(b => (
                    <div 
                      key={b.id} 
                      className="group p-3.5 border border-line rounded-xl bg-muted/40 hover:border-primary/40 transition-all flex items-center justify-between"
                    >
                      {editingId === b.id ? (
                        <div className="flex-1 flex items-center gap-1.5">
                          <input 
                            autoFocus 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            className="flex-1 bg-card dark:bg-input border border-primary rounded-lg px-2 py-1 text-xs font-bold text-heading outline-none" 
                          />
                          <button onClick={() => handleUpdate(b.id)} className="p-1 text-success hover:bg-success-soft rounded"><Save size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-dim hover:text-danger"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                              {b.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-heading truncate">{b.name}</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => { setEditingId(b.id); setEditName(b.name); }} 
                              className="p-1 text-dim hover:text-primary hover:bg-primary-soft rounded-lg"
                              title="Edit Brand"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDelete(b.id)} 
                              className="p-1 text-dim hover:text-danger hover:bg-danger-soft rounded-lg"
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
          iconBg="bg-success/10 text-success"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowDiscovery(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleAddDiscovered} 
                disabled={isAddingDiscovered || selectedDiscovered.size === 0} 
                className="flex items-center gap-2 bg-success hover:bg-success text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-success/20 disabled:opacity-50 cursor-pointer"
              >
                {isAddingDiscovered ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Daftarkan {selectedDiscovered.size} Brand
              </button>
            </div>
          }
        >
          {isDiscovering ? (
            <div className="flex flex-col items-center py-20 text-dim">
              <Loader2 size={36} className="animate-spin mb-3 text-success" />
              <p className="text-xs font-semibold">Menganalisis katalog obat...</p>
            </div>
          ) : discoveredBrands.length === 0 ? (
            <div className="text-center py-20 space-y-2">
              <Tag size={40} className="mx-auto text-dim dark:text-body" />
              <p className="text-xs font-bold text-body">Tidak ada brand baru terdeteksi.</p>
              <p className="text-[11px] text-dim">Semua produk sudah terhubung dengan registri brand yang sesuai.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-body">
                  Ditemukan <span className="font-bold text-heading">{discoveredBrands.length}</span> merk baru. Pilih merk untuk didaftarkan:
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
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {selectedDiscovered.size === discoveredBrands.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {discoveredBrands.map((brand, idx) => (
                  <label 
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedDiscovered.has(brand.name) 
                        ? 'bg-success-soft border-success dark:bg-success/20 dark:border-success' 
                        : 'bg-card border-line hover:border-success dark:bg-card dark:border-line'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 rounded border-line-strong text-success focus:ring-success"
                      checked={selectedDiscovered.has(brand.name)}
                      onChange={(e) => {
                        const newSet = new Set(selectedDiscovered);
                        if (e.target.checked) newSet.add(brand.name);
                        else newSet.delete(brand.name);
                        setSelectedDiscovered(newSet);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-heading text-xs truncate" title={brand.name}>{brand.name}</p>
                      <p className="text-[10px] font-mono text-dim mt-0.5">{brand.count} produk terkait</p>
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