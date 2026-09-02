import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, Activity, Edit, AlertCircle, TrendingUp, 
  Tags, CalendarDays, DollarSign, Layers, MapPin, Sparkles, 
  ShieldCheck
} from 'lucide-react';
import { getItem, ItemDetailData, toggleItemActive } from '../../lib/api';

interface ItemDetailProps {
  itemId: string;
  onBack: () => void;
  onEditItem: () => void;
  refreshTrigger: number;
}

export default function ItemDetail({ itemId, onBack, onEditItem, refreshTrigger }: ItemDetailProps) {
  const [data, setData] = useState<ItemDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await getItem(itemId);
      setData(result);
    } catch (error: any) {
      console.error('Error fetching item details:', error);
      setErrorMsg(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId, refreshTrigger]);

  const handleToggleActive = async () => {
    await toggleItemActive(itemId);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse py-20">
        <Package size={36} className="mb-4 text-brand opacity-60 animate-bounce" />
        <p className="text-sm font-semibold">Memuat data lengkap produk...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20 max-w-md mx-auto text-center">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-2xl mb-3 border border-rose-200 dark:border-rose-900">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Gagal Memuat Detail Produk</h3>
        <p className="text-xs text-slate-500 mb-5">{errorMsg || 'Data produk tidak ditemukan.'}</p>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            Kembali
          </button>
          <button onClick={loadData} className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-white shadow-sm">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const { item, units, prices, price_tiers, active_batches } = data;

  // Financial & Inventory calculations
  const costPrice = item.cost_price || 0;
  const baseUnit = units.find(u => u.is_base === 1) || units[0];
  const regularPrice = prices.find(p => p.unit_id === baseUnit?.id && p.customer_tier === 'regular')?.price || item.price || 0;
  const marginRp = regularPrice - costPrice;
  const marginPercent = costPrice > 0 ? ((marginRp / costPrice) * 100).toFixed(1) : (regularPrice > 0 ? '100' : '0');
  
  const totalStock = active_batches && active_batches.length > 0
    ? active_batches.reduce((acc, b) => acc + b.current_qty, 0)
    : 0;
  const totalValuation = totalStock * costPrice;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full max-w-7xl mx-auto pb-10">
      
      {/* ─── 1. BREADCRUMB & HEADER ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B0F19] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 dark:bg-brand/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex items-start sm:items-center gap-4 relative z-10">
          <button 
            onClick={onBack} 
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all hover:scale-105 cursor-pointer"
            title="Kembali ke Katalog"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="h-14 w-14 bg-gradient-to-tr from-brand/10 to-indigo-500/10 text-brand rounded-2xl flex items-center justify-center border border-brand/20 shadow-xs shrink-0">
            <Package size={28} strokeWidth={1.75} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {item.name}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                item.is_active 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
              }`}>
                {item.is_active ? 'Aktif' : 'Non-Aktif'}
              </span>
              {item.rack_location && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold font-mono border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <MapPin size={10} /> Rak: {item.rack_location}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                SKU: {item.sku}
              </span>
              {item.barcode && (
                <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                  Barcode: {item.barcode}
                </span>
              )}
              {item.generic_name && (
                <span className="text-slate-400">
                  • {item.generic_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <button 
            onClick={handleToggleActive} 
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Activity size={15} className={item.is_active ? "text-rose-500" : "text-emerald-500"} />
            {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>

          <button 
            onClick={onEditItem} 
            className="px-5 py-2.5 bg-brand hover:bg-blue-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-brand/20 active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Edit size={15} /> Edit Produk
          </button>
        </div>
      </div>

      {/* ─── 2. CORE FINANCIAL & STOCK KPI CARDS ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cost Price (Harga Beli Modal) */}
        <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harga Pokok (Beli/HPP)</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rp {costPrice.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Modal per {baseUnit?.unit_name || 'Satuan Dasar'}
            </p>
          </div>
        </div>

        {/* Retail Selling Price (Harga Jual) */}
        <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harga Jual Retail</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              Rp {regularPrice.toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              Harga umum ke pelanggan
            </p>
          </div>
        </div>

        {/* Estimated Margin & Gross Profit */}
        <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimasi Untung / Margin</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
              <span>Rp {Math.max(0, marginRp).toLocaleString('id-ID')}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${marginRp >= 0 ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' : 'bg-rose-100 text-rose-700'}`}>
                {marginPercent}%
              </span>
            </h3>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
              Laba kotor per {baseUnit?.unit_name || 'Satuan'}
            </p>
          </div>
        </div>

        {/* Current Stock & Total Valuation */}
        <div className="bg-white dark:bg-[#0B0F19] p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stok & Valuasi Modal</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalStock} <span className="text-sm font-semibold text-slate-500">{baseUnit?.unit_name || 'Unit'}</span>
            </h3>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Total Modal Stok: Rp {totalValuation.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

      </div>

      {/* ─── 3. DETAILED MATRICES & CONFIGURATIONS ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Unit Conversions & Packaging */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Layers size={16} />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Satuan & Konversi Kemasan</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">{units.length} Satuan Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            {units.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle size={28} className="text-amber-500 mb-2 opacity-80" />
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Belum ada satuan kemasan</p>
                <p className="text-[11px] text-slate-400 mt-1">Klik "Edit Produk" untuk menambahkan satuan.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-5">Nama Satuan</th>
                    <th className="py-3 px-5">Rasio Konversi</th>
                    <th className="py-3 px-5 text-right">Barcode Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {u.unit_name}
                        {u.is_base === 1 && (
                          <span className="bg-brand/10 text-brand text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-brand/20">
                            Satuan Terkecil (Base)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 font-medium">
                        {u.is_base === 1 ? (
                          <span className="text-slate-400">1 {u.unit_name} (Standar 1:1)</span>
                        ) : (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">= {u.conversion} {baseUnit?.unit_name || 'Base Unit'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-500 text-[11px]">
                        {u.barcode || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pricing Matrix per Unit */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Tags size={16} />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Matriks Harga Jual Konsumen</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">Regular / Member / VIP</span>
          </div>

          <div className="overflow-x-auto">
            {units.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle size={28} className="text-slate-400 mb-2" />
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Belum ada harga</p>
                <p className="text-[11px] text-slate-400 mt-1">Atur harga satuan pada menu edit.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-5">Satuan</th>
                    <th className="py-3 px-5 text-right">Harga Retail</th>
                    <th className="py-3 px-5 text-right">Harga Member</th>
                    <th className="py-3 px-5 text-right">Harga VIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {units.map((u) => {
                    const regular = prices.find(p => p.unit_id === u.id && p.customer_tier === 'regular')?.price || 0;
                    const member = prices.find(p => p.unit_id === u.id && p.customer_tier === 'member')?.price || regular;
                    const vip = prices.find(p => p.unit_id === u.id && p.customer_tier === 'vip')?.price || regular;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{u.unit_name}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {regular.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          Rp {member.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          Rp {vip.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Volume Pricing Tiers (Jml 1..N & Harga Khusus Grosir) */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <TrendingUp size={16} />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Tier Harga Volume (Grosir)</h3>
            </div>
            <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">Otomatis di POS</span>
          </div>

          <div className="overflow-x-auto">
            {!price_tiers || price_tiers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada tier harga volume. Tambahkan tier di menu edit untuk diskon bertingkat otomatis.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-5">Level Tier</th>
                    <th className="py-3 px-5">Batas Jumlah (Qty)</th>
                    <th className="py-3 px-5 text-right">Harga Satuan Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {price_tiers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-brand">Tier {t.tier_level}</td>
                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300 font-semibold">
                        Hingga {t.max_qty} {baseUnit?.unit_name || 'Unit'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        Rp {t.price.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Master Data & Configuration Details */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
              <ShieldCheck size={16} />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Informasi & Aturan Produk</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Kategori</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {item.category_name || 'Tanpa Kategori'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Lokasi Rak</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {item.rack_location || 'Belum diatur'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Metode Valuasi HPP</span>
              <span className="font-bold uppercase text-brand">
                {item.hpp_method || 'AVG (Rata-rata)'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Batas Minimum Stok</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {item.min_stock} {baseUnit?.unit_name || 'Unit'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Tracking Kadaluarsa</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {item.has_expiry === 1 ? 'Ya (Aktif)' : 'Tidak'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block mb-1">Wajib Resep Dokter</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {item.requires_prescription === 1 ? 'Wajib Resep' : 'Obat Bebas'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 4. BATCH & EXPIRY MANAGEMENT (IF TRACKED) ─────────────────── */}
      {item.has_expiry === 1 && (
        <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
                <CalendarDays size={16} />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Monitoring Batch & Kadaluarsa</h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {active_batches?.length || 0} Batch Aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            {!active_batches || active_batches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada batch aktif atau informasi kadaluarsa untuk produk ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-5">Nomor Batch</th>
                    <th className="py-3 px-5">Tanggal Expired</th>
                    <th className="py-3 px-5">Status Kelayakan</th>
                    <th className="py-3 px-5 text-right">Sisa Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {active_batches.map((b, idx) => {
                    const daysLeft = b.expiry_date 
                      ? Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                      : null;

                    let statusEl = <span className="text-slate-400">-</span>;
                    if (daysLeft !== null) {
                      if (daysLeft <= 0) {
                        statusEl = <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-rose-200 dark:border-rose-900">Expired</span>;
                      } else if (daysLeft <= 30) {
                        statusEl = <span className="bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-orange-200 dark:border-orange-900">Kritis ({daysLeft} hari)</span>;
                      } else if (daysLeft <= 90) {
                        statusEl = <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-amber-200 dark:border-amber-900">Peringatan ({daysLeft} hari)</span>;
                      } else {
                        statusEl = <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-emerald-200 dark:border-emerald-900">Aman ({daysLeft} hari)</span>;
                      }
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">{b.batch_no || '-'}</td>
                        <td className="py-3.5 px-5 font-mono text-slate-600 dark:text-slate-300">{b.expiry_date || '-'}</td>
                        <td className="py-3.5 px-5">{statusEl}</td>
                        <td className="py-3.5 px-5 text-right font-extrabold text-slate-900 dark:text-white">
                          {b.current_qty} <span className="text-[10px] font-normal text-slate-400">{baseUnit?.unit_name || 'Unit'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}