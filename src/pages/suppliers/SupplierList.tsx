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
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-heading">
            Data Pemasok & Distributor
          </h1>
          <p className="text-xs text-dim mt-0.5">
            Kelola vendor resmi pengadaan obat, alkes, dan syarat tempo pembayaran.
          </p>
        </div>
        
        <button 
          onClick={openAdd} 
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus size={15} /> Tambah Pemasok
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-card rounded-xl border border-line shadow-xs flex-1 overflow-hidden flex flex-col">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/50 dark:bg-card/30">
          <div className="flex-1 w-full flex items-center bg-card border border-line rounded-xl px-3.5 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search size={16} className="text-dim mr-2 shrink-0" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemasok berdasarkan nama, PIC, no. telepon, atau email..." 
              className="bg-transparent border-none outline-none text-xs w-full text-heading placeholder:text-dim" 
            />
          </div>

          <div className="text-xs font-bold text-dim shrink-0 px-2">
            Total: <span className="text-heading font-mono">{filteredSuppliers.length}</span> Pemasok
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-dim gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-xs font-semibold">Memuat data pemasok...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-dim p-6 text-center">
            <div className="p-4 bg-muted rounded-xl mb-3 text-dim">
              <Building2 size={36} />
            </div>
            <h3 className="font-bold text-sm text-heading">Pemasok Tidak Ditemukan</h3>
            <p className="text-xs text-dim mt-1 max-w-xs">
              {search ? 'Tidak ada hasil yang sesuai dengan kata kunci pencarian.' : 'Belum ada pemasok terdaftar. Klik tombol di atas untuk menambahkan pemasok baru.'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/90 dark:bg-card/90 backdrop-blur-md border-b border-line text-dim font-bold uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3.5 px-6">Nama Perusahaan / Vendor</th>
                  <th className="py-3.5 px-6">Contact Person (PIC)</th>
                  <th className="py-3.5 px-6">Kontak & Telepon</th>
                  <th className="py-3.5 px-6">Syarat Bayar (TOP)</th>
                  <th className="py-3.5 px-6">Alamat</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line/60 text-xs">
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-muted/80 dark:hover:bg-muted/40 group transition-colors">
                    <td className="py-3.5 px-6 font-extrabold text-heading">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-soft text-primary rounded-xl shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{s.name}</p>
                          {s.notes && <p className="text-[10px] text-dim font-normal mt-0.5 line-clamp-1">{s.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-heading">
                      {s.contact_person ? s.contact_person : <span className="text-dim italic">-</span>}
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      {s.phone ? (
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-success dark:text-success hover:underline flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Phone size={12} /> {s.phone}
                          </a>
                        </div>
                      ) : (
                        <span className="text-dim">-</span>
                      )}
                      {s.email && <p className="text-[10px] text-dim font-sans mt-0.5">{s.email}</p>}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-soft dark:bg-blue-950/40 text-primary text-[10px] font-extrabold uppercase tracking-wide border border-accent-soft dark:border-accent/40">
                        <CreditCard size={11} /> {s.payment_terms || 'NET 30'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-dim max-w-xs truncate">
                      {s.address ? s.address : <span className="text-dim">-</span>}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button 
                        onClick={() => openEdit(s)} 
                        className="p-2 text-dim hover:text-primary bg-muted hover:bg-primary-soft rounded-xl transition-all cursor-pointer shadow-xs"
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