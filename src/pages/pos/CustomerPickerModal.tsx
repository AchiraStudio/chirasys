// src/pages/pos/CustomerPickerModal.tsx
import { useState, useEffect } from 'react';
import { Search, X, UserCheck, Loader2 } from 'lucide-react';
import { getCustomers, Customer } from '../../lib/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer | null) => void;
    selectedId?: string;
}

const TIER_CONFIG = {
    regular: { label: 'Regular', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    member:  { label: 'Member',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'  },
    vip:     { label: 'VIP',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function CustomerPickerModal({ isOpen, onClose, onSelect, selectedId }: Props) {
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await getCustomers(search, '', true);
                setCustomers(results);
            } finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(timer);
    }, [search, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Pilih Pelanggan</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama atau nomor HP..."
                            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* Walk-in option */}
                <button
                    onClick={() => { onSelect(null); onClose(); }}
                    className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 ${!selectedId ? 'bg-brand/5' : ''}`}
                >
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <UserCheck size={16} className="text-slate-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Pelanggan Umum</p>
                        <p className="text-xs text-slate-500">Tanpa pencatatan pelanggan</p>
                    </div>
                    {!selectedId && <span className="ml-auto text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">Dipilih</span>}
                </button>

                {/* Customer list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand" /></div>
                    ) : customers.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 py-8">{search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}</p>
                    ) : (
                        customers.map(c => {
                            const tier = TIER_CONFIG[c.customer_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.regular;
                            const isSelected = c.id === selectedId;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => { onSelect(c); onClose(); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0 ${isSelected ? 'bg-brand/5' : ''}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-indigo-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{c.phone || 'Tidak ada telepon'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
                                        {isSelected && <span className="text-[10px] font-bold text-brand">✓</span>}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
