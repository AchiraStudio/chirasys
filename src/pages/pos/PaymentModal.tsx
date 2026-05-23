// src/pages/pos/PaymentModal.tsx
// Full rebuild — Indonesian UI, split-tender, banks selector
import { useState, useEffect, useRef } from 'react';
import { PosLine } from './POSStore';
import { createSale, CreateSaleInput, getCustomers, Customer } from '../../lib/api';
import { X, Banknote, CreditCard, Smartphone, ArrowRightLeft, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PaymentModalProps {
    branchId: string;
    cart: PosLine[];
    total: number;
    priceType: string;
    customerId?: string;
    onClose: () => void;
    onSuccess: (saleId: string) => void;
}

interface Bank { id: string; name: string; code: string; }

const PAYMENT_METHODS = [
    { key: 'cash',      label: 'Tunai',        icon: Banknote,       color: 'emerald' },
    { key: 'transfer',  label: 'Transfer Bank', icon: ArrowRightLeft,  color: 'blue'    },
    { key: 'debit',     label: 'Kartu Debit',  icon: CreditCard,      color: 'indigo'  },
    { key: 'credit',    label: 'Kartu Kredit', icon: CreditCard,      color: 'purple'  },
    { key: 'qris',      label: 'QRIS/E-Money', icon: Smartphone,      color: 'amber'   },
] as const;

type MethodKey = typeof PAYMENT_METHODS[number]['key'];

export default function PaymentModal({ branchId, cart, total, priceType, customerId, onClose, onSuccess }: PaymentModalProps) {
    const [amounts, setAmounts] = useState<Record<MethodKey, string>>({
        cash: total.toString(), transfer: '', debit: '', credit: '', qris: ''
    });
    const [bankIds, setBankIds] = useState<Record<string, string>>({ debit: '', credit: '', transfer: '' });
    const [banks, setBanks] = useState<Bank[]>([]);
    const [voucher, setVoucher] = useState('');
    const [loading, setLoading] = useState(false);
    const cashInputRef = useRef<HTMLInputElement>(null);

    const totalBayar = PAYMENT_METHODS.reduce((sum, m) => sum + (parseFloat(amounts[m.key]) || 0), 0);
    const kembali = totalBayar - total;
    const isReady = totalBayar >= total;

    useEffect(() => {
        // Load banks from DB
        invoke<Bank[]>('get_banks').then(setBanks).catch(() => {});
        // Focus cash input
        setTimeout(() => cashInputRef.current?.focus(), 100);
    }, []);

    // Keyboard shortcut: Enter = pay, ESC = close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && isReady && !loading) handlePay();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isReady, loading, amounts]);

    const setAmount = (method: MethodKey, val: string) => {
        setAmounts(prev => ({ ...prev, [method]: val }));
    };

    const handleExact = () => {
        // Fill remaining in cash
        const nonCash = PAYMENT_METHODS
            .filter(m => m.key !== 'cash')
            .reduce((sum, m) => sum + (parseFloat(amounts[m.key]) || 0), 0);
        const remaining = Math.max(0, total - nonCash);
        setAmounts(prev => ({ ...prev, cash: remaining > 0 ? remaining.toString() : '' }));
    };

    const handlePay = async () => {
        if (!isReady || loading) return;
        setLoading(true);

        const payments = PAYMENT_METHODS
            .filter(m => parseFloat(amounts[m.key]) > 0)
            .map(m => ({
                amount: parseFloat(amounts[m.key]),
                method: m.key,
                reference: bankIds[m.key] || undefined,
            }));

        const totalAmount = cart.reduce((s, l) => s + l.qty * l.price, 0);
        const discountAmount = cart.reduce((s, l) => s + l.discount_amount, 0);

        const input: CreateSaleInput = {
            branch_id: branchId,
            customer_id: customerId,
            user_id: undefined,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            tax_amount: 0,
            grand_total: total,
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
        };

        try {
            const saleId = await createSale(input);
            onSuccess(saleId);
        } catch (e) {
            alert('Pembayaran gagal: ' + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0B0F19] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">PEMBAYARAN</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Total Banner */}
                <div className="mx-6 mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700/50 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">TOTAL TAGIHAN</p>
                    <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-300">
                        Rp {total.toLocaleString('id-ID')}
                    </p>
                </div>

                {/* Payment Methods */}
                <div className="px-6 py-4 space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const needsBank = ['transfer', 'debit', 'credit'].includes(method.key);
                        return (
                            <div key={method.key}>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                        <Icon size={15} className="text-slate-500" />
                                        {method.label}
                                    </div>
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">Rp</span>
                                        <input
                                            ref={method.key === 'cash' ? cashInputRef : undefined}
                                            type="number"
                                            value={amounts[method.key]}
                                            onChange={e => setAmount(method.key, e.target.value)}
                                            placeholder="0"
                                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand outline-none text-right"
                                        />
                                    </div>
                                    {method.key === 'cash' && (
                                        <button
                                            onClick={handleExact}
                                            className="text-xs font-bold text-brand hover:underline shrink-0 px-2"
                                        >
                                            Pas
                                        </button>
                                    )}
                                </div>
                                {needsBank && parseFloat(amounts[method.key]) > 0 && (
                                    <div className="ml-[9.5rem] mt-1.5">
                                        <select
                                            value={bankIds[method.key] || ''}
                                            onChange={e => setBankIds(prev => ({ ...prev, [method.key]: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="">-- Pilih Bank --</option>
                                            {banks.map(b => (
                                                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Voucher */}
                <div className="px-6 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 w-32 shrink-0">Kode Voucher</span>
                        <input
                            type="text"
                            value={voucher}
                            onChange={e => setVoucher(e.target.value.toUpperCase())}
                            placeholder="Masukkan kode voucher..."
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Total Bayar & Kembali */}
                <div className="px-6 pb-4 space-y-2">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">TOTAL BAYAR</span>
                        <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                            Rp {totalBayar.toLocaleString('id-ID')}
                        </span>
                    </div>
                    {kembali > 0 && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-xl flex justify-between items-center">
                            <span className="text-sm font-bold text-orange-700 dark:text-orange-400">KEMBALIAN</span>
                            <span className="text-lg font-extrabold text-orange-700 dark:text-orange-300">
                                Rp {kembali.toLocaleString('id-ID')}
                            </span>
                        </div>
                    )}
                    {totalBayar > 0 && totalBayar < total && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/50 rounded-xl flex justify-between items-center">
                            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">KURANG</span>
                            <span className="text-lg font-extrabold text-rose-700 dark:text-rose-300">
                                Rp {(total - totalBayar).toLocaleString('id-ID')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Batal (ESC)
                    </button>
                    <button
                        onClick={handlePay}
                        disabled={!isReady || loading}
                        className="flex-[2] py-3.5 bg-brand text-white rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                        {loading ? 'Memproses...' : 'Simpan + Cetak (Enter)'}
                    </button>
                </div>
            </div>
        </div>
    );
}
