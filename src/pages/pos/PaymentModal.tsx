// src/pages/pos/PaymentModal.tsx
// Redesigned UI — Modern, responsive 2-column layout, quick-cash helpers, and theme consistency.
import { useState, useEffect, useRef } from 'react';
import { PosLine } from './POSStore';
import { createSale, CreateSaleInput } from '../../lib/api';
import { Banknote, CreditCard, Smartphone, ArrowRightLeft, Loader2, CheckCircle2, Ticket, ShoppingBag } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import Modal from '../../components/ui/Modal';
import { useAuthStore } from '../../store/AuthStore';

import { toast } from '../../components/ui/Toast';
import Select from '../../components/ui/Select';
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
    { key: 'cash',      label: 'Tunai',        icon: Banknote,       colorClass: 'text-success bg-success/10 border-success/20' },
    { key: 'transfer',  label: 'Transfer',     icon: ArrowRightLeft,  colorClass: 'text-accent bg-accent/10 border-accent/20'    },
    { key: 'debit',     label: 'Debit Card',   icon: CreditCard,      colorClass: 'text-primary bg-primary-soft border-primary/20'  },
    { key: 'credit',    label: 'Kredit Card',  icon: CreditCard,      colorClass: 'text-primary bg-primary-soft border-primary/20'  },
    { key: 'qris',      label: 'QRIS',         icon: Smartphone,      colorClass: 'text-warning bg-warning/10 border-warning/20'   },
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

    const handleSelectMethod = (methodKey: MethodKey) => {
        if (methodKey === activeMethod) return;

        const filledMethods = PAYMENT_METHODS.filter(
            m => evaluateValue(amounts[m.key], lastResolvedAmounts.current[m.key]) > 0
        );

        // If only 1 method (e.g. the default cash) was filled, transfer the amount to the new method
        if (filledMethods.length <= 1) {
            const currentTotal = netTotal > 0 ? netTotal : total;
            setAmounts({
                cash: '', transfer: '', debit: '', credit: '', qris: '',
                [methodKey]: currentTotal.toString(),
            });
            lastResolvedAmounts.current = {
                cash: 0, transfer: 0, debit: 0, credit: 0, qris: 0,
                [methodKey]: currentTotal,
            };
        }
        setActiveMethod(methodKey);
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
            branch_id: branchId || 'branch_001',
            customer_id: customerId?.trim() ? customerId : undefined,
            user_id: user?.id?.trim() ? user.id : undefined,
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
            toast.error('Pembayaran gagal: ' + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="5xl"
            title="Checkout Transaksi"
            subtitle="Pilih metode pembayaran dan masukkan jumlah bayar"
            noPadding={true}
        >
            <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Payment Inputs & Methods (7 cols) */}
                <div className="md:col-span-7 space-y-6">
                        
                        {/* Payment Methods Grid Selector */}
                        <div>
                            <label className="text-xs font-bold text-dim uppercase tracking-wider block mb-3">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {PAYMENT_METHODS.map((method) => {
                                    const Icon = method.icon;
                                    const isActive = activeMethod === method.key;
                                    const hasValue = parseFloat(amounts[method.key]) > 0;
                                    return (
                                        <button
                                            key={method.key}
                                            onClick={() => handleSelectMethod(method.key)}
                                            className={`relative p-3.5 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all text-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                                                isActive 
                                                    ? 'bg-primary-soft border-primary text-primary shadow-sm shadow-primary/10' 
                                                    : 'bg-muted/40 border-line hover:border-line-strong dark:hover:border-line-strong text-body hover:text-heading dark:hover:text-white'
                                            }`}
                                        >
                                            <div className={`p-2.5 rounded-xl transition-colors ${method.colorClass}`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-xs font-bold tracking-tight">{method.label}</span>
                                            
                                            {/* Badge indicating this method has an entered amount */}
                                            {hasValue && !isActive && (
                                                <div className="absolute top-2 right-2 text-success dark:text-success">
                                                    <CheckCircle2 size={14} className="fill-success/10" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Input Field for Active Method */}
                        <div className="bg-muted/50 dark:bg-card/35 border border-line rounded-xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-heading">
                                    Jumlah ({PAYMENT_METHODS.find(m => m.key === activeMethod)?.label})
                                </span>
                                <button
                                    onClick={handleClear}
                                    className="text-xs font-bold text-danger dark:text-danger hover:underline focus:outline-none focus:ring-2 focus:ring-danger rounded px-1"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dim text-lg font-bold">Rp</span>
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
                                    className="w-full pl-12 pr-4 py-3 bg-card border border-line rounded-xl text-xl font-black text-heading focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right shadow-inner font-mono"
                                />
                            </div>

                            {/* Bank Selection dropdown if applicable */}
                            {['transfer', 'debit', 'credit'].includes(activeMethod) && (
                                <div className="space-y-2 pt-2 animate-fade-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-dim">Pilih Rekening Bank</label>
                                    <Select
                                        value={bankIds[activeMethod] || ''}
                                        onChange={v => setBankIds(prev => ({ ...prev, [activeMethod]: v }))}
                                        className="w-full bg-card border border-line rounded-xl px-4 py-2.5 text-sm font-semibold text-heading focus:ring-2 focus:ring-primary focus:border-primary outline-none shadow-sm"
                                    >
                                        <option value="">-- Pilih Bank --</option>
                                        {banks.map(b => (
                                            <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                                        ))}
                                    </Select>
                                </div>
                            )}

                            {/* Quick Cash Buttons (Only for Tunai/Cash) */}
                            {activeMethod === 'cash' && (
                                <div className="space-y-2 pt-2">
                                    <label className="text-xs font-bold text-dim uppercase tracking-wider">Bantuan Uang Tunai</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={handleExact}
                                            className="py-2.5 bg-primary-soft dark:bg-primary-soft hover:bg-primary-soft dark:hover:bg-primary-soft text-primary font-bold text-xs rounded-xl border border-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            Uang Pas
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(50000, 'set')}
                                            className="py-2.5 bg-muted hover:bg-line dark:hover:bg-line-strong text-heading font-bold text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            Rp 50.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(100000, 'set')}
                                            className="py-2.5 bg-muted hover:bg-line dark:hover:bg-line-strong text-heading font-bold text-xs rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            Rp 100.000
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <button
                                            onClick={() => handleQuickCash(10000, 'add')}
                                            className="py-2 bg-muted/70 dark:bg-muted/60 hover:bg-line dark:hover:bg-line-strong text-body font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            +10.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(20000, 'add')}
                                            className="py-2 bg-muted/70 dark:bg-muted/60 hover:bg-line dark:hover:bg-line-strong text-body font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            +20.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(50000, 'add')}
                                            className="py-2 bg-muted/70 dark:bg-muted/60 hover:bg-line dark:hover:bg-line-strong text-body font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            +50.000
                                        </button>
                                        <button
                                            onClick={() => handleQuickCash(100000, 'add')}
                                            className="py-2 bg-muted/70 dark:bg-muted/60 hover:bg-line dark:hover:bg-line-strong text-body font-semibold text-xs rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            +100.000
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Split Tender Overview (Summary of entered payments) */}
                        {PAYMENT_METHODS.some(m => parseFloat(amounts[m.key]) > 0 && m.key !== activeMethod) && (
                            <div className="border border-line rounded-xl p-5 space-y-3">
                                <span className="text-xs font-bold text-dim uppercase tracking-wider block">Rincian Split Payment</span>
                                <div className="space-y-2">
                                    {PAYMENT_METHODS.map(m => {
                                        const amount = parseFloat(amounts[m.key]) || 0;
                                        if (amount === 0) return null;
                                        return (
                                            <div key={m.key} className="flex justify-between items-center text-sm">
                                                <span className="font-semibold text-body flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-dim"></span> {m.label}
                                                </span>
                                                <span className="font-bold text-heading">Rp {amount.toLocaleString('id-ID')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Voucher Section */}
                        <div className="bg-muted/30 dark:bg-card/10 border border-dashed border-line rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-muted text-dim rounded-lg">
                                <Ticket size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-dim uppercase tracking-wider mb-0.5">Kode Voucher / Promo</p>
                                <input
                                    type="text"
                                    value={voucher}
                                    onChange={e => setVoucher(e.target.value.toUpperCase())}
                                    placeholder="Masukkan kode voucher..."
                                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-heading placeholder:text-dim dark:placeholder:text-dim focus:ring-0 p-0"
                                />
                            </div>
                        </div>

                        {/* Manual Discount Input */}
                        <div className="bg-danger-soft/40 dark:bg-danger/10 border border-dashed border-danger/30 dark:border-danger/50 rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2 bg-danger-soft dark:bg-danger/30 text-danger rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/></svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-0.5">Diskon Manual</p>
                                <input
                                    type="text"
                                    value={manualDiscountStr}
                                    onChange={e => setManualDiscountStr(e.target.value)}
                                    placeholder="Rp nominal atau 10% (persen)..."
                                    className="w-full bg-transparent border-none outline-none text-sm font-semibold text-danger dark:text-danger placeholder-danger dark:placeholder-danger focus:ring-0 p-0"
                                />
                            </div>
                            {manualDiscountAmt > 0 && (
                                <span className="text-xs font-extrabold text-danger bg-danger-soft dark:bg-danger/40 px-2 py-1 rounded-lg whitespace-nowrap">
                                    - Rp {manualDiscountAmt.toLocaleString('id-ID')}
                                </span>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Billing Summary, Item Details & Actions (5 cols) */}
                    <div className="md:col-span-5 flex flex-col space-y-5">
                        
                        {/* Summary Sticky/Visual Card */}
                        <div className="bg-card rounded-xl p-6 space-y-5 shadow-sm relative overflow-hidden border border-line">
                            
                            
                            
                            
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <p className="text-xs font-extrabold tracking-widest text-dim uppercase mb-2">Total Tagihan</p>
                                    <div className="relative flex items-center bg-muted rounded-xl border border-line px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors">
                                        <span className="text-xl font-extrabold text-dim mr-2">Rp</span>
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
                                            className="w-full bg-transparent border-none outline-none text-3xl sm:text-4xl font-black text-heading focus:ring-0 p-0 text-right font-mono tracking-tight"
                                        />
                                    </div>
                                </div>
                                
                                <div className="h-px bg-muted/80"></div>

                                {/* Discount Breakdown */}
                                {(discountAmount > 0 || manualDiscountAmt > 0) && (
                                    <div className="space-y-1.5">
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-dim">Diskon Promo{voucher ? ` (${voucher})` : ''}</span>
                                                <span className="text-xs font-bold text-danger">- Rp {discountAmount.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        {manualDiscountAmt > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-dim">Diskon Manual</span>
                                                <span className="text-xs font-bold text-danger">- Rp {manualDiscountAmt.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-line pt-1.5">
                                            <span className="text-xs font-bold text-heading">Total Setelah Diskon</span>
                                            <span className="text-base font-extrabold text-heading font-mono">Rp {netTotal.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-dim">Total Pembayaran</span>
                                    <span className="text-base font-bold text-heading font-mono">Rp {totalBayar.toLocaleString('id-ID')}</span>
                                </div>

                                {kembali > 0 ? (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-success">Uang Kembalian</span>
                                        <span className="text-2xl font-extrabold text-success font-mono">Rp {kembali.toLocaleString('id-ID')}</span>
                                    </div>
                                ) : totalBayar > 0 && totalBayar < netTotal ? (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-danger">Kekurangan</span>
                                        <span className="text-2xl font-extrabold text-danger font-mono">Rp {(netTotal - totalBayar).toLocaleString('id-ID')}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-xs font-bold text-warning">Status</span>
                                        <span className="text-xs font-bold bg-warning/20 text-warning px-3 py-1 rounded-full border border-warning/20">Belum Lunas</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rincian Item Dibeli Container */}
                        <div className="bg-muted/80 dark:bg-card/50 border border-line rounded-xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-line pb-2.5">
                                <div className="flex items-center gap-2 text-heading font-bold text-xs uppercase tracking-wider">
                                    <ShoppingBag size={15} className="text-primary" />
                                    <span>Item Dibeli ({cart.reduce((s, i) => s + i.qty, 0)})</span>
                                </div>
                                <span className="text-[11px] font-semibold text-dim">
                                    {cart.length} Jenis Produk
                                </span>
                            </div>

                            <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {cart.map((item, idx) => {
                                    const lineSubtotal = item.qty * item.price - (item.discount_amount || 0);
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-card/70 dark:bg-input/40 border border-line/60 hover:border-line dark:hover:border-line transition-colors">
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="font-semibold text-heading truncate">
                                                    {item.item_name}
                                                    {item.is_bogo_free && (
                                                        <span className="ml-1.5 text-[10px] bg-success/10 text-success font-bold px-1.5 py-0.5 rounded">
                                                            FREE
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-dim font-mono mt-0.5">
                                                    {item.qty} {item.unit_name} × Rp {item.price.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="font-bold text-heading font-mono text-xs">
                                                    Rp {lineSubtotal.toLocaleString('id-ID')}
                                                </span>
                                                {item.discount_amount > 0 && (
                                                    <p className="text-[10px] text-danger font-mono">
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
                                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white disabled:bg-line dark:disabled:bg-muted disabled:text-dim dark:disabled:text-body rounded-xl text-sm font-bold shadow-sm shadow-primary/25 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary "
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                                <span>{loading ? 'Memproses...' : 'Simpan & Cetak (c+End)'}</span>
                            </button>

                            <button
                                onClick={() => handlePay(false)}
                                disabled={!isReady || loading}
                                className="w-full py-3 bg-muted hover:bg-line-strong text-heading disabled:bg-line dark:disabled:bg-muted disabled:text-dim dark:disabled:text-body rounded-xl text-sm font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-line-strong "
                            >
                                Simpan Transaksi (End)
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full py-2.5 border border-line rounded-xl text-xs font-bold text-dim hover:text-heading dark:hover:text-white hover:bg-muted transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-dim"
                            >
                                Batal (ESC)
                            </button>
                        </div>
                    </div>
                </div>
        </Modal>
    );
}
