import { useState } from 'react';
import { PosLine } from './POSStore';
import { createSale, CreateSaleInput } from '../../lib/api';
import { X, CreditCard, Banknote, QrCode } from 'lucide-react';

interface PaymentModalProps {
    branchId: string;
    cart: PosLine[];
    total: number;
    priceType: string;
    onClose: () => void;
    onSuccess: (saleId: string) => void;
}

export default function PaymentModal({ branchId, cart, total, priceType, onClose, onSuccess }: PaymentModalProps) {
    const [amountReceived, setAmountReceived] = useState<number | ''>('');
    const [method, setMethod] = useState<'cash' | 'card' | 'qris'>('cash');
    const [loading, setLoading] = useState(false);

    const change = Number(amountReceived) - total;
    const isReady = Number(amountReceived) >= total;

    const handleExact = () => setAmountReceived(total);

    const handlePay = async () => {
        if (!isReady) return;
        setLoading(true);

        const input: CreateSaleInput = {
            branch_id: branchId,
            customer_id: undefined, // Add later if selected
            user_id: undefined,     // From auth
            total_amount: total,
            discount_amount: 0,
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
                hpp_value: l.hpp_value
            })),
            payments: [{
                amount: total, // we only register the grand total, change is returned
                method: method
            }]
        };

        try {
            const saleId = await createSale(input);
            onSuccess(saleId);
        } catch (e) {
            alert('Payment failed: ' + e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Payment</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Due</p>
                        <p className="text-4xl font-bold text-brand mt-1">Rp {total.toLocaleString('id-ID')}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button onClick={() => setMethod('cash')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${method === 'cash' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}><Banknote size={16}/> Cash</button>
                        <button onClick={() => setMethod('card')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${method === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}><CreditCard size={16}/> Card</button>
                        <button onClick={() => setMethod('qris')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${method === 'qris' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}><QrCode size={16}/> QRIS</button>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Amount Received</label>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                autoFocus
                                value={amountReceived}
                                onChange={e => setAmountReceived(e.target.value ? Number(e.target.value) : '')}
                                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-2xl font-bold focus:ring-2 focus:ring-brand outline-none"
                                placeholder="0"
                            />
                            <button onClick={handleExact} className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">Exact</button>
                        </div>
                    </div>

                    {amountReceived !== '' && change >= 0 && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex justify-between items-center">
                            <span className="font-bold text-emerald-700 dark:text-emerald-500">Change</span>
                            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Rp {change.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={handlePay}
                        disabled={!isReady || loading}
                        className="w-full py-4 bg-brand text-white text-lg font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all active:scale-[0.98]"
                    >
                        {loading ? 'Processing...' : 'Complete Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
