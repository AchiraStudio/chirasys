import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, Activity, Edit, AlertCircle, TrendingUp, 
  Tags, CalendarDays, DollarSign, Layers, MapPin, ShieldCheck
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
      <div className="flex flex-col items-center justify-center h-full text-dim animate-pulse py-20">
        <Package size={32} className="mb-3 text-primary opacity-60 animate-bounce" />
        <p className="text-xs font-semibold">Memuat data lengkap produk...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-dim py-16 max-w-md mx-auto text-center">
        <div className="p-3 bg-danger-soft text-danger rounded-xl mb-3 border border-danger/30">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-sm font-bold text-heading mb-1">Gagal Memuat Detail Produk</h3>
        <p className="text-xs text-dim mb-4">{errorMsg || 'Data produk tidak ditemukan.'}</p>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-muted text-body hover:text-heading cursor-pointer">
            Kembali
          </button>
          <button onClick={loadData} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white shadow-xs cursor-pointer">
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
    <div className="flex flex-col gap-4 animate-fade-in w-full pb-8">
      
      {/* ─── 1. COMPACT HEADER & ACTIONS ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 py-1">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onBack} 
            className="p-2 text-dim hover:text-heading bg-muted border border-line rounded-lg transition-colors cursor-pointer shrink-0"
            title="Kembali ke Katalog"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-heading tracking-tight truncate">
                {item.name}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                item.is_active 
                  ? 'bg-success-soft text-success border-success/30' 
                  : 'bg-danger-soft text-danger border-danger/30'
              }`}>
                {item.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
              {item.category_name && (
                <span className="px-2 py-0.5 rounded-md bg-muted text-dim text-[10px] font-medium border border-line">
                  {item.category_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-dim mt-0.5 flex-wrap">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] border border-line">
                SKU: {item.sku}
              </span>
              {item.barcode && (
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] border border-line">
                  Barcode: {item.barcode}
                </span>
              )}
              {item.rack_location && (
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <MapPin size={11} className="text-primary" /> Rak: {item.rack_location}
                </span>
              )}
              {item.generic_name && (
                <span className="text-dim italic">
                  ({item.generic_name})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button 
            onClick={handleToggleActive} 
            className="px-3 py-1.5 bg-muted hover:bg-line text-body hover:text-heading rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border border-line"
          >
            <Activity size={14} className={item.is_active ? "text-danger" : "text-success"} />
            {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>

          <button 
            onClick={onEditItem} 
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-all shadow-xs active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            <Edit size={14} /> Edit Produk
          </button>
        </div>
      </div>

      {/* ─── 2. COMPACT 4-STAT METRIC STRIP ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Cost Price */}
        <div className="bg-card p-3.5 rounded-xl border border-line shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-dim block">Harga Beli (HPP)</span>
            <div className="text-base font-bold text-heading mt-0.5">
              Rp {costPrice.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-dim block mt-0.5">
              Modal per {baseUnit?.unit_name || 'Satuan'}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-muted text-dim shrink-0">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Retail Selling Price & Margin */}
        <div className="bg-card p-3.5 rounded-xl border border-line shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-dim block">Harga Jual Retail</span>
            <div className="text-base font-bold text-success mt-0.5">
              Rp {regularPrice.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-dim block mt-0.5">
              Margin: Rp {Math.max(0, marginRp).toLocaleString('id-ID')} ({marginPercent}%)
            </span>
          </div>
          <div className="p-2 rounded-lg bg-success-soft text-success shrink-0">
            <TrendingUp size={16} />
          </div>
        </div>

        {/* Current Stock & Valuation */}
        <div className="bg-card p-3.5 rounded-xl border border-line shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-dim block">Sisa Stok Fisik</span>
            <div className="text-base font-bold text-heading mt-0.5">
              {totalStock} <span className="text-xs font-medium text-dim">{baseUnit?.unit_name || 'Unit'}</span>
            </div>
            <span className="text-[10px] text-dim block mt-0.5">
              Valuasi: Rp {totalValuation.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-warning-soft text-warning shrink-0">
            <Package size={16} />
          </div>
        </div>

        {/* Quick Rules */}
        <div className="bg-card p-3.5 rounded-xl border border-line shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-dim block">Aturan & Status</span>
            <div className="text-xs font-bold text-heading mt-0.5 flex items-center gap-1.5">
              <span>HPP {item.hpp_method || 'AVG'}</span>
              <span>•</span>
              <span>Min {item.min_stock} {baseUnit?.unit_name || 'Unit'}</span>
            </div>
            <span className="text-[10px] text-dim block mt-0.5">
              {item.requires_prescription === 1 ? 'Wajib Resep Dokter' : 'Obat Bebas'}
              {item.has_expiry === 1 ? ' • Expiry Aktif' : ''}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-primary-soft text-primary shrink-0">
            <ShieldCheck size={16} />
          </div>
        </div>

      </div>

      {/* ─── 3. STRUCTURED 2-COLUMN LAYOUT ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* Left Column: Satuan & Matriks Harga Jual */}
        <div className="space-y-4">
          
          {/* Units & Pricing Table */}
          <div className="bg-card rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-line flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-primary" />
                <h3 className="font-bold text-heading text-xs sm:text-sm">Satuan & Matriks Harga Jual</h3>
              </div>
              <span className="text-[11px] font-semibold text-dim">{units.length} Satuan</span>
            </div>

            <div className="overflow-x-auto">
              {units.length === 0 ? (
                <div className="p-6 text-center text-dim text-xs">
                  Belum ada satuan kemasan.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-dim font-bold uppercase tracking-wider border-b border-line text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3.5">Satuan / Konversi</th>
                      <th className="py-2.5 px-3 text-right">Retail</th>
                      <th className="py-2.5 px-3 text-right">Member</th>
                      <th className="py-2.5 px-3.5 text-right">VIP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {units.map((u) => {
                      const regular = prices.find(p => p.unit_id === u.id && p.customer_tier === 'regular')?.price || 0;
                      const member = prices.find(p => p.unit_id === u.id && p.customer_tier === 'member')?.price || regular;
                      const vip = prices.find(p => p.unit_id === u.id && p.customer_tier === 'vip')?.price || regular;

                      return (
                        <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-heading flex items-center gap-1.5">
                              {u.unit_name}
                              {u.is_base === 1 && (
                                <span className="bg-primary-soft text-primary text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-primary/20">
                                  Base
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-dim mt-0.5 font-mono">
                              {u.is_base === 1 
                                ? '1 : 1' 
                                : `= ${u.conversion} ${baseUnit?.unit_name || 'Base'}`}
                              {u.barcode ? ` • ${u.barcode}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-success">
                            Rp {regular.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-accent">
                            Rp {member.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-warning">
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

          {/* Volume Pricing Tiers (Grosir) */}
          <div className="bg-card rounded-xl border border-line shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-line flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Tags size={15} className="text-primary" />
                <h3 className="font-bold text-heading text-xs sm:text-sm">Tier Harga Grosir (Volume)</h3>
              </div>
              <span className="text-[10px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
                Otomatis di Kasir
              </span>
            </div>

            <div className="overflow-x-auto">
              {!price_tiers || price_tiers.length === 0 ? (
                <div className="p-4 text-center text-dim text-xs">
                  Tidak ada tier harga volume khusus. Harga mengikuti matriks standar di atas.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-dim font-bold uppercase tracking-wider border-b border-line text-[10px]">
                    <tr>
                      <th className="py-2 px-3.5">Level Tier</th>
                      <th className="py-2 px-3.5">Batas Jumlah (Qty)</th>
                      <th className="py-2 px-3.5 text-right">Harga Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {price_tiers.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-primary">Tier {t.tier_level}</td>
                        <td className="py-2.5 px-3.5 text-heading font-medium">
                          Hingga {t.max_qty} {baseUnit?.unit_name || 'Unit'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-heading">
                          Rp {t.price.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Spesifikasi Produk & Monitoring Batch */}
        <div className="space-y-4">
          
          {/* Specifications & Rules */}
          <div className="bg-card rounded-xl border border-line shadow-xs p-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-line mb-3">
              <ShieldCheck size={15} className="text-primary" />
              <h3 className="font-bold text-heading text-xs sm:text-sm">Informasi & Spesifikasi</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Kategori</span>
                <span className="font-bold text-heading truncate block mt-0.5">
                  {item.category_name || '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Lokasi Rak</span>
                <span className="font-bold font-mono text-heading truncate block mt-0.5">
                  {item.rack_location || '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Metode HPP</span>
                <span className="font-bold uppercase text-primary truncate block mt-0.5">
                  {item.hpp_method || 'AVG'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Minimum Stok</span>
                <span className="font-bold text-heading truncate block mt-0.5">
                  {item.min_stock} {baseUnit?.unit_name || 'Unit'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Resep Dokter</span>
                <span className="font-bold text-heading truncate block mt-0.5">
                  {item.requires_prescription === 1 ? 'Wajib Resep' : 'Bebas'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/50 border border-line">
                <span className="text-dim text-[10px] block">Tracking Expired</span>
                <span className="font-bold text-heading truncate block mt-0.5">
                  {item.has_expiry === 1 ? 'Aktif' : 'Tidak Aktif'}
                </span>
              </div>
            </div>
          </div>

          {/* Batch & Expiry Tracking */}
          {item.has_expiry === 1 && (
            <div className="bg-card rounded-xl border border-line shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-line flex items-center justify-between bg-muted/40">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-danger" />
                  <h3 className="font-bold text-heading text-xs sm:text-sm">Monitoring Batch & Kadaluarsa</h3>
                </div>
                <span className="text-[11px] font-semibold text-dim">
                  {active_batches?.length || 0} Batch
                </span>
              </div>

              <div className="overflow-x-auto">
                {!active_batches || active_batches.length === 0 ? (
                  <div className="p-4 text-center text-dim text-xs">
                    Tidak ada batch aktif atau informasi tanggal kadaluarsa untuk produk ini.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-dim font-bold uppercase tracking-wider border-b border-line text-[10px]">
                      <tr>
                        <th className="py-2 px-3.5">Nomor Batch</th>
                        <th className="py-2 px-3">Tgl Kadaluarsa</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3.5 text-right">Sisa Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {active_batches.map((b, idx) => {
                        const daysLeft = b.expiry_date 
                          ? Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                          : null;

                        let statusEl = <span className="text-dim">-</span>;
                        if (daysLeft !== null) {
                          if (daysLeft <= 0) {
                            statusEl = <span className="bg-danger-soft text-danger px-1.5 py-0.5 rounded text-[10px] font-bold border border-danger/30">Expired</span>;
                          } else if (daysLeft <= 30) {
                            statusEl = <span className="bg-warning-soft text-warning px-1.5 py-0.5 rounded text-[10px] font-bold border border-warning/30">Kritis ({daysLeft}h)</span>;
                          } else if (daysLeft <= 90) {
                            statusEl = <span className="bg-warning-soft text-warning px-1.5 py-0.5 rounded text-[10px] font-bold border border-warning/30">Peringatan ({daysLeft}h)</span>;
                          } else {
                            statusEl = <span className="bg-success-soft text-success px-1.5 py-0.5 rounded text-[10px] font-bold border border-success/30">Aman ({daysLeft}h)</span>;
                          }
                        }

                        return (
                          <tr key={idx} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-3.5 font-mono font-bold text-heading">{b.batch_no || '-'}</td>
                            <td className="py-2.5 px-3 font-mono text-body">{b.expiry_date || '-'}</td>
                            <td className="py-2.5 px-3">{statusEl}</td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-heading">
                              {b.current_qty} <span className="text-[10px] font-normal text-dim">{baseUnit?.unit_name || 'Unit'}</span>
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

      </div>

    </div>
  );
}