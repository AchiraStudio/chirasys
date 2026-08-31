// src/pages/pos/CustomerPickerModal.tsx
import { useState, useEffect } from 'react';
import { Search, UserCheck, Loader2, Users } from 'lucide-react';
import { getCustomers, Customer } from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // Arrow navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, customers.length)); // customers.length is for walk-in (index 0) + customers
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, -1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedIndex === -1) {
                    // Do nothing or maybe select first if search is active
                } else if (focusedIndex === 0) {
                    onSelect(null); onClose();
                } else if (focusedIndex > 0 && customers[focusedIndex - 1]) {
                    onSelect(customers[focusedIndex - 1]); onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, customers, focusedIndex, onSelect, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await getCustomers(search, '', true);
                const filtered = results.filter(
                    c => c.id !== 'cust_umum' && c.name.trim().toLowerCase() !== 'pelanggan umum'
                );
                setCustomers(filtered);
            } finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(timer);
    }, [search, isOpen]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            title="Pilih Pelanggan"
            icon={Users}
            noPadding={true}
        >
            {/* Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama atau nomor HP... (Panah Bawah untuk memilih)"
                        className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={() => { onSelect(null); onClose(); }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 focus:outline-none focus:bg-brand/10 ${(!selectedId || selectedId === 'cust_umum') ? 'bg-brand/5' : ''} ${focusedIndex === 0 ? 'ring-2 ring-inset ring-brand bg-brand/10' : ''}`}
            >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <UserCheck size={16} className="text-slate-500" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Pelanggan Umum</p>
                    <p className="text-xs text-slate-500">Tanpa pencatatan pelanggan</p>
                </div>
                {(!selectedId || selectedId === 'cust_umum') && <span className="ml-auto text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">Dipilih</span>}
            </button>

            {/* Customer list */}
            <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand" /></div>
                ) : customers.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-8">{search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}</p>
                ) : (
                    customers.map((c, idx) => {
                        const tier = TIER_CONFIG[c.customer_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.regular;
                        const isSelected = c.id === selectedId;
                        const isFocused = focusedIndex === idx + 1;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => { onSelect(c); onClose(); }}
                                className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus:bg-brand/10 ${isSelected ? 'bg-brand/5' : ''} ${isFocused ? 'ring-2 ring-inset ring-brand bg-brand/10' : ''}`}
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
        </Modal>
    );
}
