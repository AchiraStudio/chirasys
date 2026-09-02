import { useState, useEffect } from 'react';
import { getSuppliers, Supplier } from '../../lib/api';
import { Loader2, Plus, Building2, Edit2, Search, Phone, CreditCard } from 'lucide-react';
import SupplierDrawer from './SupplierDrawer';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const loadData = () => {
    setLoading(true);
    getSuppliers().then(data => { setSuppliers(data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openAdd = () => { setSupplierToEdit(null); setIsDrawerOpen(true); };
  const openEdit = (s: Supplier) => { setSupplierToEdit(s); setIsDrawerOpen(true); };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 h-full">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Data Pemasok & Distributor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola vendor resmi pengadaan obat, alkes, dan syarat pembayaran tempo.
          </p>
        </div>
        
        <button 
          onClick={openAdd} 
          className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md shadow-brand/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={16} /> Tambah Pemasok Baru
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex-1 overflow-hidden flex flex-col">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex-1 w-full flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemasok berdasarkan nama, PIC, no. telepon, atau email..." 
              className="bg-transparent border-none outline-none text-xs w-full text-slate-900 dark:text-white placeholder-slate-400" 
            />
          </div>

          <div className="text-xs font-bold text-slate-500 shrink-0 px-2">
            Total: <span className="text-slate-900 dark:text-white font-mono">{filteredSuppliers.length}</span> Pemasok
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="animate-spin text-brand" size={32} />
            <p className="text-xs font-semibold">Memuat data pemasok...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 p-6 text-center">
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-3xl mb-3 text-slate-400">
              <Building2 size={36} />
            </div>
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">Pemasok Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {search ? 'Tidak ada hasil yang sesuai dengan kata kunci pencarian.' : 'Belum ada pemasok terdaftar. Klik tombol di atas untuk menambahkan pemasok baru.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3.5 px-6">Nama Perusahaan / Vendor</th>
                  <th className="py-3.5 px-6">Contact Person (PIC)</th>
                  <th className="py-3.5 px-6">Kontak & Telepon</th>
                  <th className="py-3.5 px-6">Syarat Bayar (TOP)</th>
                  <th className="py-3.5 px-6">Alamat</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group transition-colors">
                    <td className="py-3.5 px-6 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 text-brand rounded-xl shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{s.name}</p>
                          {s.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">{s.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-700 dark:text-slate-300">
                      {s.contact_person ? s.contact_person : <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      {s.phone ? (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Phone size={12} /> {s.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                      {s.email && <p className="text-[10px] text-slate-400 font-sans mt-0.5">{s.email}</p>}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-brand text-[10px] font-extrabold uppercase tracking-wide border border-blue-100 dark:border-blue-900/40">
                        <CreditCard size={11} /> {s.payment_terms || 'NET 30'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 max-w-xs truncate">
                      {s.address ? s.address : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button 
                        onClick={() => openEdit(s)} 
                        className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 hover:bg-brand/10 rounded-xl transition-all cursor-pointer shadow-xs"
                        title="Edit Data Pemasok"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SupplierDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={loadData} 
        supplierToEdit={supplierToEdit} 
      />
    </div>
  );
}