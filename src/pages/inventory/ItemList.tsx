import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Eye, Trash2, Edit, Upload, Download, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getItemsFiltered, deleteItem, Item, importItemsExcel, exportItemsExcel, getCategories, Category, setItemPrice, setItemCostPrice } from '../../lib/api';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import TourGuide from '../../components/ui/TourGuide';
import { usePermissions } from '../../lib/permissions';

interface ItemListProps {
  onViewItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onAddItem: () => void;
  refreshTrigger: number;
}

export default function ItemList({ onViewItem, onEditItem, onAddItem, refreshTrigger }: ItemListProps) {
  const { can } = usePermissions();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'category' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Tour State
  const [runTour, setRunTour] = useState(false);
  const inventoryTourSteps = [
    {
      target: '.tour-inv-add',
      content: 'Klik di sini untuk menambah item/obat baru secara manual ke dalam sistem.',
      disableBeacon: true,
    },
    {
      target: '.tour-inv-import',
      content: 'Gunakan fitur ini untuk memasukkan banyak data sekaligus dari file Excel (.xlsx).',
    },
    {
      target: '.tour-inv-search',
      content: 'Cari barang dengan cepat menggunakan nama, SKU, atau scan barcode.',
    },
    {
      target: '.tour-inv-table',
      content: 'Tabel ini menampilkan seluruh katalog Anda. Klik icon mata untuk melihat detail pergerakan stok. Anda dapat mengubah harga eceran dan grosir secara langsung di dalam baris tabel ini.',
    }
  ];

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getItemsFiltered(search, selectedCategory, '', false, page, 20, sortBy, sortOrder);
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => { loadData(); }, 300);
    return () => clearTimeout(delay);
  }, [search, selectedCategory, page, sortBy, sortOrder, refreshTrigger]);

  const handleSort = (column: 'name' | 'sku' | 'category' | 'price') => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (column: 'name' | 'sku' | 'category' | 'price') => {
    if (sortBy !== column) {
      return <ArrowUpDown size={14} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className="text-brand font-bold" />
    ) : (
      <ArrowDown size={14} className="text-brand font-bold" />
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menonaktifkan item ini?")) {
      await deleteItem(id);
      loadData();
    }
  };

  const handleImport = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
      });

      if (!file) return;

      setIsImporting(true);
      const res = await importItemsExcel(file as string);
      if (res.success) {
        try {
          await invoke('auto_assign_brands');
        } catch (e) {
          console.warn("Failed to auto-assign brands", e);
        }
        alert(`Berhasil import ${res.rows_imported} baris data!`);
        loadData();
      } else {
        alert(`Gagal import: \n${res.errors.join('\n')}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error: ${e}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        defaultPath: 'Daftar_Item.xlsx',
      });
      if (!filePath) return;

      await exportItemsExcel(filePath);
      alert('Berhasil mengekspor data ke Excel!');
    } catch (e) {
      console.error(e);
      alert(`Gagal export: ${e}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Obat & Barang</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Kelola katalog produk Anda. Total data: {total}</p>
        </div>
        <div className="flex gap-2">
          {can('reports.export') && (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all font-semibold text-sm border border-emerald-200 dark:border-emerald-500/20 active:scale-[0.98]">
              <Download size={18} /> Ekspor
            </button>
          )}
          {can('items.create') && (
            <button 
              onClick={handleImport}
              disabled={isImporting}
              className="tour-inv-import flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all font-semibold text-sm disabled:opacity-50 border border-indigo-200 dark:border-indigo-500/20 active:scale-[0.98]">
              {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              {isImporting ? 'Mengimpor...' : 'Impor'}
            </button>
          )}
          {can('items.create') && (
            <button onClick={onAddItem} className="tour-inv-add flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98]">
              <Plus size={18} /> Tambah Item
            </button>
          )}
          <button onClick={() => setRunTour(true)} className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-xl transition-colors" title="Bantuan & Panduan">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden tour-inv-table">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="tour-inv-search flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari berdasarkan nama, SKU, atau barcode..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg px-3.5 py-2 outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Semua Kategori</option>
            {Array.from(new Map(categories.map(c => [c.name.trim().toUpperCase(), c])).values()).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#0B0F19] z-10">
              <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
                <th 
                  onClick={() => handleSort('name')}
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Item</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('sku')}
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU</span>
                    {renderSortIcon('sku')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('category')}
                  className="py-4 px-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th className="py-4 px-6 text-right w-36">Harga Pokok</th>
                <th 
                  onClick={() => handleSort('price')}
                  className="py-4 px-6 text-right w-44 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Harga Eceran (Retail)</span>
                    {renderSortIcon('price')}
                  </div>
                </th>
                <th className="py-4 px-6 text-left min-w-[220px]">Tier Harga Volume (Jml 1..N)</th>
                <th className="py-4 px-6 text-center w-28">Status</th>
                <th className="py-4 px-6 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-medium">Tidak ada item ditemukan.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group fast-render-row ${item.is_active === 0 ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      {item.rack_location && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                          Rak: {item.rack_location}
                        </span>
                      )}
                    </div>
                    {item.generic_name && <p className="text-xs text-slate-500 mt-0.5">{item.generic_name}</p>}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{item.sku}</td>

                  {/* Kategori Column */}
                  <td className="py-4 px-6">
                    {item.category_name ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                        {item.category_name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">-</span>
                    )}
                  </td>
                  
                  {/* Harga Pokok (Cost / Buy Price) - Inline Editable */}
                  <td className="py-3 px-6 text-right">
                    {can('items.change_price') ? (
                      <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-brand/30" title="Harga Beli / Pokok Modal (HPP)">
                        <span className="text-xs text-slate-400 font-bold mr-1">Rp</span>
                        <input
                          type="number"
                          defaultValue={item.cost_price || 0}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val === item.cost_price) return;
                            try {
                              await setItemCostPrice(item.id, val);
                              item.cost_price = val;
                            } catch (err) {
                              alert('Gagal update harga pokok: ' + err);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-0 p-0 text-right font-mono"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Rp {(item.cost_price || 0).toLocaleString('id-ID')}
                      </span>
                    )}
                  </td>

                  {/* Inline Retail Price Input */}
                  <td className="py-3 px-6 text-right">
                    {can('items.change_price') ? (
                      <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-brand/30">
                        <span className="text-xs text-slate-400 font-bold mr-1">Rp</span>
                        <input
                          type="number"
                          defaultValue={item.price || 0}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val === item.price) return;
                            try {
                              await setItemPrice(item.id, item.base_unit_id || 'base', 'regular', val);
                            } catch (err) {
                              alert('Gagal update harga retail: ' + err);
                            }
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white focus:ring-0 p-0 text-right font-mono"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-xs font-mono text-slate-900 dark:text-white">
                        Rp {(item.price || 0).toLocaleString('id-ID')}
                      </span>
                    )}
                  </td>

                  {/* Tier Harga Volume (Badges + Quick Edit) */}
                  <td className="py-3 px-6">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.price_tiers && item.price_tiers.length > 0 ? (
                        item.price_tiers.map((t) => (
                          <span
                            key={t.id || t.tier_level}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-brand dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-2xs"
                            title={`Tier ${t.tier_level}: Maks ${t.max_qty} Pcs @ Rp ${t.price.toLocaleString('id-ID')}`}
                          >
                            <span className="text-[10px] opacity-75 font-mono">≤{t.max_qty}</span>
                            <span>Rp {t.price.toLocaleString('id-ID')}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Tanpa Tier</span>
                      )}
                      {can('items.change_price') && (
                        <button
                          onClick={() => onEditItem(item.id)}
                          className="p-1 text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Atur Tier Harga"
                        >
                          <Edit size={13} />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-400/20'} ring-1 ring-inset`}>
                      {item.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right relative">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onViewItem(item.id)} className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-lg" title="Lihat Detail">
                        <Eye size={16} />
                      </button>
                      {can('items.edit') && (
                        <button onClick={() => onEditItem(item.id)} className="p-2 text-slate-500 hover:text-amber-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Edit Item">
                          <Edit size={16} />
                        </button>
                      )}
                      {can('items.delete') && (
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Nonaktifkan / Hapus">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-sm text-slate-500">
            Menampilkan {items.length} dari {total} data (Halaman {page} dari {Math.ceil(total / 20) || 1})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20) || items.length === 0}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
      <TourGuide steps={inventoryTourSteps} run={runTour} onFinish={() => setRunTour(false)} />
    </div>
  );
}