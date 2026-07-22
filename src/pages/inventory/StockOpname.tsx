import { useState, useEffect } from 'react';
import { getStockOverview, StockOverviewRow, createOpnameSession, submitOpnameLines, finalizeOpname } from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';
import { Package, Search, Save, Loader2, ClipboardList, HelpCircle, CheckCircle2, TrendingUp, TrendingDown, Minus, Plus, RefreshCw, Filter, AlertTriangle, X } from 'lucide-react';
import TourGuide from '../../components/ui/TourGuide';

export default function StockOpname() {
  const DEFAULT_BRANCH = 'branch_001';
  const { user } = useAuthStore();
  
  const [items, setItems] = useState<StockOverviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyDiffFilter, setOnlyDiffFilter] = useState(false);
  
  const [actualQty, setActualQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkQtyInput, setBulkQtyInput] = useState('');

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
      const { getItemsFiltered } = await import('../../lib/api');
      await getItemsFiltered('', '', '', true, 1, 9999);
      const data = await getStockOverview(DEFAULT_BRANCH);
      setItems(data);
      setActualQty({});
      setNotes({});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStepperChange = (itemId: string, currentSysQty: number, delta: number) => {
    setActualQty(prev => {
      const currentVal = prev[itemId] !== undefined ? prev[itemId] : currentSysQty;
      const newVal = Math.max(0, currentVal + delta);
      return { ...prev, [itemId]: newVal };
    });
  };

  const handleMatchButtonClick = (itemId: string, currentSysQty: number) => {
    setActualQty(prev => ({ ...prev, [itemId]: currentSysQty }));
  };

  const handleResetAll = () => {
    if (Object.keys(actualQty).length === 0) return;
    if (confirm("Reset semua input stok fisik yang baru dimasukkan?")) {
      setActualQty({});
      setNotes({});
    }
  };

  // KPI Calculations
  const countedItems = items.filter(i => actualQty[i.item_id] !== undefined);
  const matchCount = countedItems.filter(i => actualQty[i.item_id] === i.current_qty).length;
  const surplusItems = countedItems.filter(i => actualQty[i.item_id] > i.current_qty);
  const deficitItems = countedItems.filter(i => actualQty[i.item_id] < i.current_qty);

  const totalSurplusQty = surplusItems.reduce((sum, i) => sum + (actualQty[i.item_id] - i.current_qty), 0);
  const totalDeficitQty = deficitItems.reduce((sum, i) => sum + (i.current_qty - actualQty[i.item_id]), 0);

  // Filter items
  const filteredItems = items.filter(i => {
    const matchesSearch = i.item_name.toLowerCase().includes(search.toLowerCase()) || 
                          (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (!onlyDiffFilter) return true;

    const aq = actualQty[i.item_id];
    if (aq === undefined) return false;
    return aq !== i.current_qty;
  });

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.item_id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const applyBulkQty = () => {
    if (selectedItems.size === 0) return alert("Pilih minimal satu item.");
    const val = parseFloat(bulkQtyInput);
    if (isNaN(val)) return alert("Masukkan angka yang valid.");
    
    setActualQty(prev => {
      const next = { ...prev };
      selectedItems.forEach(id => {
        next[id] = val;
      });
      return next;
    });
    setBulkQtyInput('');
  };

  const handleSubmit = async () => {
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

    if (!confirm(`Anda yakin ingin memproses Stock Opname? ${changedLines.length} item akan disesuaikan stoknya secara permanen.`)) return;
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 flex flex-col gap-6 animate-in fade-in duration-300 w-full">
      
      {/* Top Header Banner (Subtle & Theme Adaptive) */}
      <div className="shrink-0 bg-white dark:bg-[#0B0F19] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <ClipboardList size={13} /> Modul Audit Inventory
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <Package size={13} /> {items.length} Barang Terdaftar
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Stock Opname & Penyesuaian Fisik
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-0.5">
              Verifikasi stok riil di toko dengan pencatatan sistem, hitung selisih mutasi, dan perbarui saldo persediaan fisik secara akurat.
            </p>
          </div>
          
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
            <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">{selectedItems.size} terpilih</span>
            <input
              type="number"
              placeholder="Set qty..."
              value={bulkQtyInput}
              onChange={e => setBulkQtyInput(e.target.value)}
              className="w-24 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={applyBulkQty}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
            >
              Set Nilai
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setRunTour(true)}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all cursor-pointer"
            title="Panduan Langkah Audit"
          >
            <HelpCircle size={18} />
          </button>
          
          <button 
            onClick={handleSubmit} 
            disabled={submitting || countedItems.length === 0} 
            className="tour-so-process bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-brand/20 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Proses Penyesuaian ({countedItems.length})
          </button>
        </div>
      </div>

      {/* Metric KPI Dashboard (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Item Dihitung</span>
            <ClipboardList size={16} className="text-brand" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {countedItems.length} <span className="text-xs font-semibold text-slate-400">/ {items.length}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stok Sesuai</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {matchCount} <span className="text-xs font-semibold text-slate-400">item</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Surplus (+Stok)</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            +{totalSurplusQty} <span className="text-xs font-semibold text-slate-400">({surplusItems.length} item)</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-rose-200/60 dark:border-rose-900/40 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Defisit (-Stok)</span>
            <TrendingDown size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            -{totalDeficitQty} <span className="text-xs font-semibold text-slate-400">({deficitItems.length} item)</span>
          </p>
        </div>
      </div>

      {/* Filter Toolbar & Search Bar */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex-1 flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 w-full focus-within:ring-2 focus-within:ring-brand">
            <Search size={16} className="text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Cari nama obat, kode SKU, atau kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs font-bold text-slate-900 dark:text-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setOnlyDiffFilter(!onlyDiffFilter)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                onlyDiffFilter
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              Hanya Ada Selisih {onlyDiffFilter && `(${surplusItems.length + deficitItems.length})`}
            </button>

            <button
              onClick={handleResetAll}
              disabled={Object.keys(actualQty).length === 0}
              className="px-3 py-2.5 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40 cursor-pointer"
              title="Reset Input"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar tour-so-table relative">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin mb-3 text-brand" />
              <p className="text-xs font-bold">Memuat persediaan barang...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <AlertTriangle size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold">Tidak ada barang yang sesuai dengan filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] text-slate-400 font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0} 
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-6">Produk / Barang</th>
                  <th className="py-3.5 px-4 text-center">Stok Sistem</th>
                  <th className="py-3.5 px-4 text-center tour-so-physical">Input Stok Fisik</th>
                  <th className="py-3.5 px-4 text-center">Selisih</th>
                  <th className="py-3.5 px-6 tour-so-notes">Catatan Alasan Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredItems.map(item => {
                  const hasInput = actualQty[item.item_id] !== undefined;
                  const aq = hasInput ? actualQty[item.item_id] : item.current_qty;
                  const diff = aq - item.current_qty;

                  const isSurplus = hasInput && diff > 0;
                  const isDeficit = hasInput && diff < 0;
                  const isMatch = hasInput && diff === 0;

                  return (
                    <tr 
                      key={item.item_id} 
                      className={`transition-colors ${
                        isSurplus ? 'bg-emerald-50/40 dark:bg-emerald-950/20' :
                        isDeficit ? 'bg-rose-50/40 dark:bg-rose-950/20' :
                        isMatch ? 'bg-slate-50/40 dark:bg-slate-900/20' :
                        'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.has(item.item_id)} 
                          onChange={() => toggleSelect(item.item_id)}
                          className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                        />
                      </td>

                      {/* Item Details */}
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 font-bold text-xs">
                            <Package size={17} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{item.item_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.sku || 'No SKU'} • {item.category_name || 'Uncategorized'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* System Stock */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-xl text-slate-800 dark:text-slate-200 font-bold text-xs inline-block">
                          {item.current_qty} {item.unit_name || 'PCS'}
                        </span>
                      </td>

                      {/* Physical Stock Input with Quick Stepper */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepperChange(item.item_id, item.current_qty, -1)}
                            className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer"
                            title="-1 Stok Fisik"
                          >
                            <Minus size={12} />
                          </button>

                          <input 
                            type="number" 
                            value={actualQty[item.item_id] === undefined ? '' : actualQty[item.item_id]}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') {
                                setActualQty(prev => {
                                  const copy = { ...prev };
                                  delete copy[item.item_id];
                                  return copy;
                                });
                              } else {
                                setActualQty(prev => ({ ...prev, [item.item_id]: parseFloat(val) || 0 }));
                              }
                            }}
                            placeholder={String(item.current_qty)}
                            className="w-20 text-center font-bold font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl px-2 py-1.5 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepperChange(item.item_id, item.current_qty, 1)}
                            className="w-7 h-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer"
                            title="+1 Stok Fisik"
                          >
                            <Plus size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMatchButtonClick(item.item_id, item.current_qty)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-brand hover:text-white rounded-lg text-[10px] font-bold text-slate-500 transition-colors cursor-pointer ml-1"
                            title="Set Sesuai Stok Sistem"
                          >
                            Match
                          </button>
                        </div>
                      </td>

                      {/* Variance / Diff */}
                      <td className="py-3 px-4 text-center">
                        {!hasInput ? (
                          <span className="text-[11px] text-slate-400 italic">Belum dihitung</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-full ${
                            diff > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            diff < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </td>

                      {/* Notes Input */}
                      <td className="py-3 px-6">
                        <input 
                          type="text" 
                          placeholder={hasInput ? "Alasan selisih (contoh: Rusak/Expired/Hilang)..." : "Isi stok fisik dulu"}
                          value={notes[item.item_id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                          disabled={!hasInput}
                          className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <TourGuide steps={opnameTourSteps} run={runTour} onFinish={() => setRunTour(false)} />
    </div>
  );
}
