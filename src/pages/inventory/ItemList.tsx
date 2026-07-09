import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Eye, Trash2, Edit, Upload, Download, HelpCircle } from 'lucide-react';
import { getItemsFiltered, deleteItem, Item, importItemsExcel, exportItemsExcel } from '../../lib/api';
import { open, save } from '@tauri-apps/plugin-dialog';
import TourGuide from '../../components/ui/TourGuide';

interface ItemListProps {
  onViewItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onAddItem: () => void;
  refreshTrigger: number;
}

export default function ItemList({ onViewItem, onEditItem, onAddItem, refreshTrigger }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getItemsFiltered(search, '', '', false, page, 20);
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
  }, [search, page, refreshTrigger]);

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
          const { invoke } = await import('@tauri-apps/api/core');
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
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all font-semibold text-sm border border-emerald-200 dark:border-emerald-500/20 active:scale-[0.98]">
            <Download size={18} /> Ekspor
          </button>
          <button 
            onClick={handleImport}
            disabled={isImporting}
            className="tour-inv-import flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all font-semibold text-sm disabled:opacity-50 border border-indigo-200 dark:border-indigo-500/20 active:scale-[0.98]">
            {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {isImporting ? 'Mengimpor...' : 'Impor'}
          </button>
          <button onClick={onAddItem} className="tour-inv-add flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-brand/20 active:scale-[0.98]">
            <Plus size={18} /> Tambah Item
          </button>
          <button onClick={() => setRunTour(true)} className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-xl transition-colors" title="Bantuan & Panduan">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden tour-inv-table">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="tour-inv-search flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-slate-500 mr-2" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, SKU, atau barcode..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
              <tr className="text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6">Nama Item</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6 text-right w-44">Harga Eceran (Retail)</th>
                <th className="py-4 px-6 text-right w-44">Harga Grosir (Wholesale)</th>
                <th className="py-4 px-6 text-center w-28">Status</th>
                <th className="py-4 px-6 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-brand" /></td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group ${item.is_active === 0 ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-6">
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.generic_name && <p className="text-xs text-slate-600 mt-0.5">{item.generic_name}</p>}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs text-slate-600">{item.sku}</td>
                  
                  {/* Inline Retail Price Input */}
                  <td className="py-3 px-6 text-right">
                    <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-brand/30">
                      <span className="text-xs text-slate-400 font-bold mr-1">Rp</span>
                      <input
                        type="number"
                        defaultValue={item.price || 0}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val === item.price) return;
                          try {
                            const { setItemPrice } = await import('../../lib/api');
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
                  </td>

                  {/* Inline Wholesale Price Input */}
                  <td className="py-3 px-6 text-right">
                    <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-brand/30">
                      <span className="text-xs text-slate-400 font-bold mr-1">Rp</span>
                      <input
                        type="number"
                        defaultValue={item.wholesale_price || 0}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val === item.wholesale_price) return;
                          try {
                            const { updateItemWholesalePrice } = await import('../../lib/api');
                            await updateItemWholesalePrice(item.id, val);
                          } catch (err) {
                            alert('Gagal update harga grosir: ' + err);
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
                      <button onClick={() => onEditItem(item.id)} className="p-2 text-slate-500 hover:text-amber-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Edit Item">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-500 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-lg" title="Nonaktifkan">
                        <Trash2 size={16} />
                      </button>
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