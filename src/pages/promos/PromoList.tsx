import { useEffect, useState, useMemo } from 'react';
import { getPromos, deletePromo, togglePromoActive, Promo } from '../../lib/api';
import { Plus, Edit2, Trash2, Tag, Percent, Gift, Package, Layers, Search, Coins, ToggleLeft, ToggleRight, Sparkles, Filter } from 'lucide-react';
import PromoDrawer from './PromoDrawer';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function PromoList() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editPromoId, setEditPromoId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const data = await getPromos(activeOnly);
      setPromos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [activeOnly]);

  const handleToggleActive = async (id: string) => {
    try {
      await togglePromoActive(id);
      fetchPromos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await deletePromo(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchPromos();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const filteredPromos = useMemo(() => {
    return promos.filter(p => {
      if (selectedType !== 'all' && p.promo_type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        return matchName || matchDesc;
      }
      return true;
    });
  }, [promos, selectedType, searchQuery]);

  // Statistics
  const totalPromos = promos.length;
  const activeCount = promos.filter(p => p.active === 1).length;
  const bundleCount = promos.filter(p => p.promo_type === 'bundle' || p.promo_type === 'bogo').length;
  const memberOnlyCount = promos.filter(p => p.member_only === 1 || p.member_tier).length;

  const getPromoBadge = (type: string) => {
    switch (type) {
      case 'percentage':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <Percent size={12} /> Diskon %
          </span>
        );
      case 'fixed_amount':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <Coins size={12} /> Potongan Rp
          </span>
        );
      case 'bogo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Gift size={12} /> BOGO
          </span>
        );
      case 'tiered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <Layers size={12} /> Bertingkat
          </span>
        );
      case 'bundle':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
            <Package size={12} /> Paket Bundle
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  const getTargetBadge = (appliesTo: string) => {
    switch (appliesTo) {
      case 'item':
        return <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Item Tertentu</span>;
      case 'category':
        return <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Kategori</span>;
      case 'transaction':
        return <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Total Transaksi</span>;
      default:
        return <span className="text-xs font-semibold text-slate-500">{appliesTo}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Promosi & Diskon
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola aturan diskon harga, voucher, paket bundle, dan promo kasir
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditPromoId(null);
              setIsDrawerOpen(true);
            }}
            className="px-4 py-2.5 bg-brand hover:bg-brand/90 active:scale-[0.98] text-white rounded-2xl font-bold text-xs shadow-md shadow-brand/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} /> Buat Promo Baru
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Total Promo</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{totalPromos}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Tag size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Promo Aktif</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Bundle & BOGO</div>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{bundleCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <Package size={16} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">Khusus Member</div>
            <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{memberOnlyCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Gift size={16} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#0B0F19] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari promo berdasarkan nama atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="all">Semua Tipe Promo</option>
              <option value="percentage">Diskon Persen (%)</option>
              <option value="fixed_amount">Potongan Nominal (Rp)</option>
              <option value="bogo">Beli X Gratis Y (BOGO)</option>
              <option value="tiered">Diskon Bertingkat (Tier)</option>
              <option value="bundle">Paket Bundle</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 px-3 py-2 rounded-xl">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={e => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-brand focus:ring-brand accent-brand"
            />
            <span>Hanya Aktif</span>
          </label>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-5">Nama Promo</th>
                <th className="py-3.5 px-4">Tipe Promo</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4">Nilai Diskon / Aturan</th>
                <th className="py-3.5 px-4">Masa Berlaku</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400 font-medium">
                    Memuat daftar promo...
                  </td>
                </tr>
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Sparkles className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={32} />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada promo ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Buat program promosi baru untuk menarik lebih banyak transaksi.</p>
                  </td>
                </tr>
              ) : (
                filteredPromos.map(promo => {
                  const isExpired = promo.end_date && new Date(promo.end_date) < new Date();
                  return (
                    <tr 
                      key={promo.id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {promo.name}
                        </div>
                        {promo.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {promo.description}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {promo.member_tier && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full">
                              Member {promo.member_tier.toUpperCase()}
                            </span>
                          )}
                          {promo.min_qty > 1 && (
                            <span className="text-[10px] font-medium text-slate-400">
                              Min. Beli: {promo.min_qty}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getPromoBadge(promo.promo_type)}
                      </td>

                      <td className="py-3.5 px-4">
                        {getTargetBadge(promo.applies_to)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {promo.promo_type === 'percentage' && `${promo.discount_percent}%`}
                          {promo.promo_type === 'fixed_amount' && `Rp ${(promo.discount_value || 0).toLocaleString('id-ID')}`}
                          {promo.promo_type === 'bogo' && 'Gratis Produk Spesifik'}
                          {promo.promo_type === 'tiered' && 'Diskon Kuantitas Bertingkat'}
                          {promo.promo_type === 'bundle' && (
                            promo.discount_percent > 0 
                              ? `Diskon ${promo.discount_percent}%` 
                              : `Potongan Rp ${(promo.discount_value || 0).toLocaleString('id-ID')}`
                          )}
                        </div>
                        {promo.max_discount_amount && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Maks: Rp {promo.max_discount_amount.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {promo.start_date || promo.end_date ? (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            {promo.start_date ? promo.start_date.split('T')[0] : 'Kapan saja'} s/d {promo.end_date ? promo.end_date.split('T')[0] : 'Seterusnya'}
                            {isExpired && (
                              <span className="block text-[10px] font-bold text-rose-500 mt-0.5">Kadaluarsa</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Tanpa Batas Waktu</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(promo.id)}
                          className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all"
                          title="Klik untuk mengubah status aktif"
                        >
                          {promo.active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <ToggleRight size={15} className="text-emerald-600" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <ToggleLeft size={15} className="text-slate-400" /> Nonaktif
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditPromoId(promo.id);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-xl transition-all"
                            title="Edit Promo"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(promo.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                            title="Hapus Promo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promo Drawer Modal */}
      <PromoDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSaved={fetchPromos} 
        editPromoId={editPromoId} 
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Hapus Promosi?"
        message="Apakah Anda yakin ingin menghapus aturan promosi ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Promo"
        loading={deleting}
      />
    </div>
  );
}
