// src/pages/pos/CustomerPickerModal.tsx
import { useState, useEffect } from 'react';
import { Search, UserCheck, Loader2, Users, Check } from 'lucide-react';
import { getCustomers, Customer } from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer | null) => void;
    selectedId?: string;
}

const TIER_CONFIG = {
    regular: { label: 'Regular', color: 'bg-muted text-body dark:bg-muted dark:text-body' },
    member:  { label: 'Member',  color: 'bg-accent-soft text-accent dark:bg-accent/30 dark:text-accent'  },
    vip:     { label: 'VIP',     color: 'bg-warning-soft text-warning dark:bg-warning/30 dark:text-warning' },
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
            <div className="p-4 border-b border-line">
                <div className="flex items-center gap-2 bg-muted border border-line rounded-xl px-3 py-2">
                    <Search size={16} className="text-dim" />
                    <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari nama atau nomor HP... (Panah Bawah untuk memilih)"
                        className="flex-1 bg-transparent outline-none text-sm text-heading placeholder:text-dim"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={() => { onSelect(null); onClose(); }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/50 transition-colors border-b border-line focus:outline-none focus:bg-primary-soft ${(!selectedId || selectedId === 'cust_umum') ? 'bg-primary-soft' : ''} ${focusedIndex === 0 ? 'ring-2 ring-inset ring-primary bg-primary-soft' : ''}`}
            >
                <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center">
                    <UserCheck size={16} className="text-dim" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-heading">Pelanggan Umum</p>
                    <p className="text-xs text-dim">Tanpa pencatatan pelanggan</p>
                </div>
                {(!selectedId || selectedId === 'cust_umum') && <span className="ml-auto text-[10px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">Dipilih</span>}
            </button>

            {/* Customer list */}
            <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-line dark:divide-line/60">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
                ) : customers.length === 0 ? (
                    <p className="text-center text-sm text-dim py-8">{search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}</p>
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
                                className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:bg-primary-soft ${isSelected ? 'bg-primary-soft' : ''} ${isFocused ? 'ring-2 ring-inset ring-primary bg-primary-soft' : ''}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-heading truncate">{c.name}</p>
                                    <p className="text-xs text-dim truncate">{c.phone || 'Tidak ada telepon'}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
                                    {isSelected && <Check size={13} className="text-primary stroke-[3]" />}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}
