import { useState, useEffect } from 'react';
import { getStockOverview, StockOverviewRow, createOpnameSession, submitOpnameLines, finalizeOpname } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import { Package, Search, Save, Loader2, ClipboardList, HelpCircle } from 'lucide-react';
import TourGuide from '../../components/ui/TourGuide';

export default function StockOpname() {
  const DEFAULT_BRANCH = 'branch_001';
  const { user } = useAuthStore();
  
  const [items, setItems] = useState<StockOverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [actualQty, setActualQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Tour State
  const [runTour, setRunTour] = useState(false);
  const opnameTourSteps = [
    {
      target: '.tour-so-table',
      content: 'Di sini Anda dapat melihat perbandingan antara stok di sistem dan stok fisik.',
      disableBeacon: true,
    },
    {
      target: '.tour-so-physical',
      content: 'Isi kolom Stok Fisik sesuai dengan jumlah barang yang sebenarnya ada di toko. Jika dikosongkan, item tersebut tidak akan disesuaikan.',
    },
    {
      target: '.tour-so-notes',
      content: 'Tambahkan keterangan jika ada selisih, misalnya "Barang rusak" atau "Hilang".',
    },
    {
      target: '.tour-so-process',
      content: 'Setelah selesai mengisi stok fisik, klik Proses Penyesuaian untuk menyimpan perubahan ke dalam sistem secara permanen.',
    }
  ];

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Use large limit to load all items — same fix as BulkStockAdd
      const { getItemsFiltered } = await import('../../lib/api');
      const res = await getItemsFiltered('', '', '', true, 1, 9999);
      // Map to StockOverviewRow-compatible structure via getStockOverview
      const data = await getStockOverview(DEFAULT_BRANCH);
      setItems(data);
      // Do NOT pre-fill actualQty — leave empty so diff detection works correctly.
      // User fills in the physical count; any field left blank = not counted = skip.
      setActualQty({});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.item_name.toLowerCase().includes(search.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async () => {
    // Only include items where user explicitly entered a physical count
    const enteredLines = items
      .filter(i => actualQty[i.item_id] !== undefined)
      .map(i => ({
        item_id: i.item_id,
        unit_id: i.unit_id || '',
        actual_qty: actualQty[i.item_id],
        notes: notes[i.item_id] || ''
      }));

    if (enteredLines.length === 0) {
      alert("Belum ada stok fisik yang dimasukkan. Isi kolom 'Stok Fisik' untuk item yang sudah dihitung.");
      return;
    }

    const changedLines = enteredLines.filter(l => {
      const sys = items.find(i => i.item_id === l.item_id)?.current_qty ?? 0;
      return l.actual_qty !== sys;
    });

    if (changedLines.length === 0) {
      alert("Semua item yang diisi memiliki stok fisik sama dengan stok sistem. Tidak ada penyesuaian yang diperlukan.");
      return;
    }

    if (!confirm(`Anda yakin ingin memproses Stock Opname? ${changedLines.length} item akan disesuaikan stoknya.`)) return;
    setSubmitting(true);
    
    try {
      const sessionId = await createOpnameSession(DEFAULT_BRANCH, user?.id, "Routine Opname");
      await submitOpnameLines(sessionId, changedLines);
      await finalizeOpname(sessionId);
      
      alert(`Stock Opname berhasil! ${changedLines.length} item telah disesuaikan.`);
      fetchStock();
    } catch (e: any) {
      alert("Gagal memproses stock opname: " + e.toString());
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-brand" /> Stock Opname
          </h1>
          <p className="text-slate-500 mt-1">Sesuaikan stok fisik dengan sistem.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunTour(true)} className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-xl transition-colors" title="Bantuan & Panduan">
            <HelpCircle size={20} />
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting} 
            className="tour-so-process bg-brand hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-brand/20 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            Proses Penyesuaian
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={18} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Cari item atau SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative tour-so-table">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-4 px-6">Item</th>
                <th className="py-4 px-6 text-center">Stok Sistem</th>
                <th className="py-4 px-6 text-center tour-so-physical">Stok Fisik</th>
                <th className="py-4 px-6 text-center">Selisih</th>
                <th className="py-4 px-6 tour-so-notes">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map(item => {
                const aq = actualQty[item.item_id] ?? item.current_qty;
                const diff = aq - item.current_qty;
                return (
                  <tr key={item.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Package size={18} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.item_name}</p>
                          <p className="text-xs text-slate-500">{item.sku || 'No SKU'} • {item.category_name || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-300 font-semibold">
                        {item.current_qty} {item.unit_name}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <input 
                        type="number" 
                        value={actualQty[item.item_id] === undefined ? '' : actualQty[item.item_id]}
                        onChange={e => setActualQty(prev => ({ ...prev, [item.item_id]: parseFloat(e.target.value) || 0 }))}
                        placeholder={String(item.current_qty)}
                        className="w-24 text-center font-bold font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      />
                    </td>
                    <td className="py-3 px-6 text-center">
                      {actualQty[item.item_id] === undefined ? (
                        <span className="text-xs text-slate-400 italic">belum dihitung</span>
                      ) : (
                        <span className={`font-mono font-bold ${
                          (actualQty[item.item_id] - item.current_qty) > 0 ? 'text-emerald-600' : 
                          (actualQty[item.item_id] - item.current_qty) < 0 ? 'text-rose-600' : 
                          'text-slate-400'
                        }`}>
                          {(actualQty[item.item_id] - item.current_qty) > 0 ? '+' : ''}
                          {(actualQty[item.item_id] - item.current_qty)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">
                      <input 
                        type="text" 
                        placeholder={actualQty[item.item_id] !== undefined ? "Alasan selisih (opsional)..." : ""}
                        value={notes[item.item_id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                        disabled={actualQty[item.item_id] === undefined}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <TourGuide steps={opnameTourSteps} run={runTour} onFinish={() => setRunTour(false)} />
    </div>
  );
}
