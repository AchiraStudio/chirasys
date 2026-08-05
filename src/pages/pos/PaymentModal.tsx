// src/pages/pos/PaymentModal.tsx
// Redesigned UI — Modern, responsive 2-column layout, quick-cash helpers, and theme consistency.
import { useState, useEffect, useRef } from 'react';
import { PosLine } from './POSStore';
import { createSale, CreateSaleInput } from '../../lib/api';
import { X, Banknote, CreditCard, Smartphone, ArrowRightLeft, Loader2, CheckCircle2, Ticket, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store/AuthStore';
import { invoke } from '@tauri-apps/api/core';

interface PaymentModalProps {
    branchId: string;
    cart: PosLine[];
    total: number;
    priceType: string;
    customerId?: string;
    taxAmount: number;
    discountAmount: number;
    onClose: () => void;
    onSuccess: (saleId: string, print: boolean) => void;
}

interface Bank { id: string; name: string; code: string; }

const PAYMENT_METHODS = [
    { key: 'cash',      label: 'Tunai',        icon: Banknote,       colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { key: 'transfer',  label: 'Transfer',     icon: ArrowRightLeft,  colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20'    },
    { key: 'debit',     label: 'Debit Card',   icon: CreditCard,      colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'  },
    { key: 'credit',    label: 'Kredit Card',  icon: CreditCard,      colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20'  },
    { key: 'qris',      label: 'QRIS',         icon: Smartphone,      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20'   },
] as const;

type MethodKey = typeof PAYMENT_METHODS[number]['key'];

export default function PaymentModal({ branchId, cart, total, priceType, customerId, taxAmount, discountAmount, onClose, onSuccess }: PaymentModalProps) {
    const [adjustedTotalStr, setAdjustedTotalStr] = useState(total.toString());
    const lastResolvedTotal = useRef<number>(total);

    const [amounts, setAmounts] = useState<Record<MethodKey, string>>({
        cash: total.toString(), transfer: '', debit: '', credit: '', qris: ''
    });
    const lastResolvedAmounts = useRef<Record<MethodKey, number>>({
        cash: total, transfer: 0, debit: 0, credit: 0, qris: 0
    });

    const [activeMethod, setActiveMethod] = useState<MethodKey>('cash');
    const [bankIds, setBankIds] = useState<Record<string, string>>({ debit: '', credit: '', transfer: '' });
    const [banks, setBanks] = useState<Bank[]>([]);
    const [voucher, setVoucher] = useState('');
    const [manualDiscountStr, setManualDiscountStr] = useState('');
    const [loading, setLoading] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuthStore();

    // Parse manual discount: supports "5000" (fixed Rp) or "10%" (percent of total)
    const parseManualDiscount = (str: string, baseTotal: number): number => {
        const trimmed = str.trim();
        if (!trimmed) return 0;
        if (trimmed.endsWith('%')) {
            const pct = parseFloat(trimmed);
            return isNaN(pct) ? 0 : Math.round(baseTotal * Math.min(pct, 100) / 100);
        }
        const val = parseFloat(trimmed);
        return isNaN(val) ? 0 : Math.max(0, val);
    };

    const evaluateValue = (str: string, base: number): number => {
        const trimmed = str.trim();
        if (!trimmed) return 0;
        if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
            const val = parseFloat(trimmed);
            return isNaN(val) ? base : Math.max(0, base + val);
        }
        if (/[+-]/.test(trimmed)) {
            try {
                const tokens = trimmed.match(/([+-]?\d+(\.\d+)?)/g);
                if (tokens) {
                    return Math.max(0, tokens.reduce((sum, t) => sum + (parseFloat(t) || 0), 0));
                }
            } catch {}
        }
        const val = parseFloat(trimmed);
        return isNaN(val) ? 0 : val;
    };

    const totalBayar = PAYMENT_METHODS.reduce((sum, m) => sum + evaluateValue(amounts[m.key], lastResolvedAmounts.current[m.key]), 0);
    const resolvedTotal = evaluateValue(adjustedTotalStr, total);
    const manualDiscountAmt = parseManualDiscount(manualDiscountStr, resolvedTotal);
    // Combined discount = promo discounts (passed in as discountAmount) + manual input discount
    const totalDiscountAmt = discountAmount + manualDiscountAmt;
    // Net total after all discounts
    const netTotal = Math.max(0, resolvedTotal - manualDiscountAmt);
    const kembali = totalBayar - netTotal;
    const isReady = totalBayar >= netTotal;

    const evaluateMethodAmount = (method: MethodKey) => {
        const resolved = evaluateValue(amounts[method], lastResolvedAmounts.current[method]);
        lastResolvedAmounts.current[method] = resolved;
        setAmounts(prev => ({ ...prev, [method]: resolved === 0 ? '' : resolved.toString() }));
    };

    const evaluateTotal = () => {
        const resolved = evaluateValue(adjustedTotalStr, total);
        lastResolvedTotal.current = resolved;
        setAdjustedTotalStr(resolved.toString());
    };

    useEffect(() => {
        // Load banks from DB
        invoke<Bank[]>('get_banks').then(setBanks).catch(() => {});
        // Focus active input
        setTimeout(() => amountInputRef.current?.focus(), 150);
    }, []);

    useEffect(() => {
        // Focus input when active method changes
        amountInputRef.current?.focus();
    }, [activeMethod]);

    const keysPressed = useRef<Set<string>>(new Set());

    // Keyboard shortcut: End = Simpan, c+End / Ctrl+End = Simpan & Cetak, ESC = close
    useEffect(() => {
        const downHandler = (e: KeyboardEvent) => {
            keysPressed.current.add(e.key.toLowerCase());
            if (e.key === 'End' && isReady && !loading) {
                e.preventDefault();
                const isCetak = e.ctrlKey || e.altKey || keysPressed.current.has('c');
                handlePay(isCetak);
            }
            if (e.key === 'Escape') onClose();
        };
        const upHandler = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };
        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);
        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [isReady, loading, amounts, bankIds, voucher, resolvedTotal]);

    const setAmount = (method: MethodKey, val: string) => {
        const cleanVal = typeof val === 'string' ? val.replace(/[a-zA-Z]/g, '') : val;
        setAmounts(prev => ({ ...prev, [method]: cleanVal }));
    };

    const handleExact = () => {
        const nonActive = PAYMENT_METHODS
            .filter(m => m.key !== activeMethod)
            .reduce((sum, m) => sum + evaluateValue(amounts[m.key], lastResolvedAmounts.current[m.key]), 0);
        const remaining = Math.max(0, resolvedTotal - nonActive);
        lastResolvedAmounts.current[activeMethod] = remaining;
        setAmount(activeMethod, remaining > 0 ? remaining.toString() : '');
    };

    const handleQuickCash = (value: number, type: 'add' | 'set') => {
        const currentVal = lastResolvedAmounts.current[activeMethod];
        const resolved = type === 'add' ? currentVal + value : value;
        lastResolvedAmounts.current[activeMethod] = resolved;
        setAmount(activeMethod, resolved.toString());
    };

    const handleClear = () => {
        lastResolvedAmounts.current[activeMethod] = 0;
        setAmount(activeMethod, '');
    };

    const handlePay = async (print: boolean) => {
        if (!isReady || loading) return;
        setLoading(true);

        const payments = PAYMENT_METHODS
            .filter(m => evaluateValue(amounts[m.key], lastResolvedAmounts.current[m.key]) > 0)
            .map(m => ({
                amount: evaluateValue(amounts[m.key], lastResolvedAmounts.current[m.key]),
                method: m.key,
                reference: bankIds[m.key] || undefined,
            }));

        const totalAmount = cart.reduce((s, l) => s + l.qty * l.price, 0);

        const input: CreateSaleInput = {
            branch_id: branchId,
            customer_id: customerId,
            user_id: user?.id,
            total_amount: totalAmount,
            discount_amount: totalDiscountAmt,
            tax_amount: taxAmount,
            grand_total: netTotal,
            price_type: priceType,
            lines: cart.map(l => ({
                item_id: l.item_id,
                unit_id: l.unit_id,
                qty: l.qty,
                price_type: l.price_type,
                price: l.price,
                discount_amount: l.discount_amount,
                hpp_value: l.hpp_value,
            })),
            payments,
            notes: voucher ? `VOUCHER: ${voucher}` : undefined,
        };

        try {
            const saleId = await createSale(input);
            onSuccess(saleId, print);
        } catch (e) {
            alert('Pembayaran gagal: ' + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0B0F19] rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200/80 dark:border-slate-800/85 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Checkout Transaksi</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pilih metode pembayaran dan masukkan jumlah bayar</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Left Column: Payment Inputs & Methods (7 cols) */}
                    <div className="md:col-span-7 space-y-6">
                        
                        {/* Payment Methods Grid Selector */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon;
                                    const isActive = activeMethod === method.key;
                                    const hasValue = parseFloat(amounts[method.key]) > 0;
                                    return (
                                        <button
                                            key={method.key}
                                            onClick={() => setActiveMethod(method.key)}
                                            className={`relative p-3.5 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all text-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand ${
                                                isActive 
                                                    ? 'bg-brand/10 border-brand text-brand shadow-sm shadow-brand/10' 
                                                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl transition-colors ${method.colorClass}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-xs font-bold tracking-tight">{method.label}</span>
                                            
                                            {/* Badge indicating this method has an entered amount */}
                                            {hasValue && !isActive && (
                                                <div className="absolute top-2 right-2 text-emerald-500 dark:text-emerald-400">
                                                    <CheckCircle2 size={14} className="fill-emerald-500/10" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Input Field for Active Method */}
                        <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Jumlah ({PAYMENT_METHODS.find(m => m.key === activeMethod)?.label})
                                </span>
                                <button
                                    onClick={handleClear}
                                    className="text-xs font-bold text-rose-500 dark:text-rose-400 hover:underline focus:outline-none focus:ring-2 focus:ring-rose-500 rounded px-1"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg font-bold">Rp</span>
                                <input
                                    ref={amountInputRef}
                                    type="text"
                                    value={amounts[activeMethod]}
                                    onChange={e => setAmount(activeMethod, e.target.value)}
                                    onBlur={() => evaluateMethodAmount(activeMethod)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            evaluateMethodAmount(activeMethod);
                                        }
                                        if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    placeholder="0"
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand outline-none text-right shadow-inner font-mono"
                                />
                            </div>

                            {/* Bank Selection dropdown if applicable */}
                            {['transfer', 'debit', 'credit'].includes(activeMethod) && (
                                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Pilih Rekening Bank</label>
                                    <select
                                        value={bankIds[activeMethod] || ''}
                                        onChange={e => setBankIds(prev => ({ ...prev, [activeMethod]: e.target.value }))}
                                        className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand focus:border-brand outline-none shadow-sm"
                                    >
                                        <option value="">-- Pilih Bank --</option>
                                        {banks.map(b => (
                                            <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Quick Cash Buttons (Only for Tunai/Cash) */}
                            {activeMethod === 'cash' && (
                                <div className="space-y-2 pt-2">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bantuan Uang Tunai</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={handleExact}
                                            className="py-2.5 bg-brand/5 dark:bg-brand/10 hover:bg-brand/10 dark:hover:bg-brand/20 text-brand font-bold text-xs rounded-xl border border-brand/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            Uang Pas
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(50000, 'set')}
                                            className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            Rp 50.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(100000, 'set')}
                                            className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            Rp 100.000
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            onClick={() => handleQuickCash(10000, 'add')}
                                            className="py-2 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            +10.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(20000, 'add')}
                                            className="py-2 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            +20.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(50000, 'add')}
                                            className="py-2 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            +50.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(100000, 'add')}
                                            className="py-2 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
                                        >
                                            +100.000
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Split Tender Overview (Summary of entered payments) */}
                        {PAYMENT_METHODS.some(m => parseFloat(amounts[m.key]) > 0 && m.key !== activeMethod) && (
                            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Rincian Split Payment</span>
                                <div className="space-y-2">
                                    {PAYMENT_METHODS.map(m => {
                                        const amount = parseFloat(amounts[m.key]) || 0;
                                        if (amount === 0) return null;
                                        return (
                                            <div key={m.key} className="flex justify-between items-center text-sm">
                                                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> {m.label}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white">Rp {amount.toLocaleString('id-ID')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Voucher Section */}
                        <div className="bg-slate-50/30 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                                <Ticket size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Kode Voucher / Promo</p>
                                <input
                                    type="text"
                                    value={voucher}
                                    onChange={e => setVoucher(e.target.value.toUpperCase())}
                                    placeholder="Masukkan kode voucher..."
                                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 p-0"
                                />
                            </div>
                        </div>

                        {/* Manual Discount Input */}
                        <div className="bg-rose-50/40 dark:bg-rose-900/10 border border-dashed border-rose-200 dark:border-rose-800/50 rounded-2xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/></svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Diskon Manual</p>
                                <input
                                    type="text"
                                    value={manualDiscountStr}
                                    onChange={e => setManualDiscountStr(e.target.value)}
                                    placeholder="Rp nominal atau 10% (persen)..."
                                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-rose-700 dark:text-rose-300 placeholder-rose-300 dark:placeholder-rose-700 focus:ring-0 p-0"
                                />
                            </div>
                            {manualDiscountAmt > 0 && (
                                <span className="text-xs font-extrabold text-rose-500 bg-rose-100 dark:bg-rose-900/40 px-2 py-1 rounded-lg whitespace-nowrap">
                                    - Rp {manualDiscountAmt.toLocaleString('id-ID')}
                                </span>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Billing Summary, Item Details & Actions (5 cols) */}
                    <div className="md:col-span-5 flex flex-col space-y-5">
                        
                        {/* Summary Sticky/Visual Card */}
                        <div className="bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 space-y-5 shadow-xl shadow-indigo-900/30 relative overflow-hidden border border-indigo-800/30 dark:border-slate-700/50">
                            
                            {/* Abstract gradient backdrop */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-brand opacity-25 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <p className="text-xs font-extrabold tracking-widest text-indigo-200 uppercase mb-2">Total Tagihan</p>
                                    <div className="relative flex items-center bg-white/15 rounded-2xl border border-white/20 px-4 py-3 focus-within:ring-2 focus-within:ring-white/40 focus-within:border-white/40 shadow-inner transition-all">
                                        <span className="text-xl font-extrabold text-indigo-200 mr-2">Rp</span>
                                        <input
                                            type="text"
                                            value={adjustedTotalStr}
                                            onChange={e => setAdjustedTotalStr(e.target.value)}
                                            onBlur={evaluateTotal}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    evaluateTotal();
                                                }
                                            }}
                                            className="w-full bg-transparent border-none outline-none text-3xl sm:text-4xl font-black text-white focus:ring-0 p-0 text-right font-mono tracking-tight"
                                        />
                                    </div>
                                </div>
                                
                                <div className="h-px bg-slate-800/80"></div>

                                {/* Discount Breakdown */}
                                {(discountAmount > 0 || manualDiscountAmt > 0) && (
                                    <div className="space-y-1.5">
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-300">Diskon Promo{voucher ? ` (${voucher})` : ''}</span>
                                                <span className="text-xs font-bold text-rose-400">- Rp {discountAmount.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        {manualDiscountAmt > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-slate-300">Diskon Manual</span>
                                                <span className="text-xs font-bold text-rose-400">- Rp {manualDiscountAmt.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-white/10 pt-1.5">
                                            <span className="text-xs font-bold text-white">Total Setelah Diskon</span>
                                            <span className="text-base font-extrabold text-white font-mono">Rp {netTotal.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-300">Total Pembayaran</span>
                                    <span className="text-base font-bold text-slate-100 font-mono">Rp {totalBayar.toLocaleString('id-ID')}</span>
                                </div>

                                {kembali > 0 ? (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-emerald-400">Uang Kembalian</span>
                                        <span className="text-2xl font-extrabold text-emerald-400 font-mono">Rp {kembali.toLocaleString('id-ID')}</span>
                                    </div>
                                ) : totalBayar > 0 && totalBayar < netTotal ? (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-rose-400">Kekurangan</span>
                                        <span className="text-2xl font-extrabold text-rose-400 font-mono">Rp {(netTotal - totalBayar).toLocaleString('id-ID')}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-amber-400">Status</span>
                                        <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/20">Belum Lunas</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rincian Item Dibeli Container */}
                        <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
                                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                                    <ShoppingBag size={15} className="text-brand" />
                                    <span>Item Dibeli ({cart.reduce((s, i) => s + i.qty, 0)})</span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                    {cart.length} Jenis Produk
                                </span>
                            </div>

                            <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {cart.map((item, idx) => {
                                    const lineSubtotal = item.qty * item.price - (item.discount_amount || 0);
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-2xl bg-white/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700/60 transition-colors">
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {item.item_name}
                                                    {item.is_bogo_free && (
                                                        <span className="ml-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded">
                                                            FREE
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                    {item.qty} {item.unit_name} × Rp {item.price.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                                                    Rp {lineSubtotal.toLocaleString('id-ID')}
                                                </span>
                                                {item.discount_amount > 0 && (
                                                    <p className="text-[10px] text-rose-500 font-mono">
                                                        -Rp {item.discount_amount.toLocaleString('id-ID')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2.5 pt-1">
                            <button
                                onClick={() => handlePay(true)}
                                disabled={!isReady || loading}
                                className="w-full py-3.5 bg-brand hover:bg-blue-600 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 rounded-2xl text-sm font-bold shadow-lg shadow-brand/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand dark:focus:ring-offset-[#0B0F19]"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                                <span>{loading ? 'Memproses...' : 'Simpan & Cetak (c+End)'}</span>
                            </button>

                            <button
                                onClick={() => handlePay(false)}
                                disabled={!isReady || loading}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 dark:focus:ring-offset-[#0B0F19]"
                            >
                                Simpan Transaksi (End)
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                Batal (ESC)
                            </button>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    );
}
