import { Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSaleDetail, SaleDetail } from '../../lib/api';

interface ReceiptModalProps {
    saleId: string;
    onClose: () => void;
}

export default function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
    const [detail, setDetail] = useState<SaleDetail | null>(null);

    useEffect(() => {
        getSaleDetail(saleId).then(setDetail).catch(console.error);
    }, [saleId]);

    const handlePrint = () => {
        window.print();
    };

    if (!detail) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:bg-white print:p-0">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                    <Loader2 className="animate-spin text-brand mb-4" size={32} />
                    <p>Loading receipt...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:bg-white print:p-0">
            {/* Screen UI - Hidden when printing */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 print:hidden flex flex-col">
                <div className="p-8 flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold">Payment Successful</h2>
                    <p className="text-slate-600 mt-2 text-sm">Transaction recorded successfully.</p>
                    <p className="text-slate-600 font-mono text-xs mt-1">{detail.sale.transaction_no}</p>
                </div>
                
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
                    <button 
                        onClick={handlePrint}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-blue-600 shadow-sm transition-all"
                    >
                        <Printer size={18} /> Print Receipt
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                        New Sale
                    </button>
                </div>
            </div>

            {/* Print Only UI - Thermal Printer Format (80mm width approx) */}
            <div className="hidden print:block w-[80mm] bg-white text-black p-4 font-mono text-sm leading-tight mx-auto">
                <div className="text-center mb-4">
                    <h1 className="font-bold text-lg">CHIRASYS ERP</h1>
                    <p className="text-xs">Main Branch</p>
                    <p className="text-xs mt-1">Receipt: {detail.sale.transaction_no}</p>
                    <p className="text-[10px] mt-1">{new Date(detail.sale.created_at).toLocaleString()}</p>
                </div>
                
                <div className="border-t border-black border-dashed py-2 text-xs">
                    {detail.lines.map((line, idx) => (
                        <div key={idx} className="mb-2">
                            <div className="font-bold">{line.item_name}</div>
                            <div className="flex justify-between">
                                <span>{line.qty} {line.unit_name} x {line.price.toLocaleString('id-ID')}</span>
                                <span>{line.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="border-t border-black border-dashed py-2 text-xs flex flex-col gap-1">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{detail.sale.total_amount.toLocaleString('id-ID')}</span>
                    </div>
                    {detail.sale.discount_amount > 0 && (
                        <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span>-{detail.sale.discount_amount.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-sm mt-1">
                        <span>Total:</span>
                        <span>{detail.sale.grand_total.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                
                <div className="border-t border-black border-dashed py-2 text-xs">
                    {detail.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between uppercase">
                            <span>{p.method}:</span>
                            <span>{p.amount.toLocaleString('id-ID')}</span>
                        </div>
                    ))}
                    
                    {/* Calculate Change */}
                    {detail.payments.reduce((sum, p) => sum + p.amount, 0) > detail.sale.grand_total && (
                        <div className="flex justify-between font-bold mt-1">
                            <span>Change:</span>
                            <span>{(detail.payments.reduce((sum, p) => sum + p.amount, 0) - detail.sale.grand_total).toLocaleString('id-ID')}</span>
                        </div>
                    )}
                </div>

                <div className="text-center text-xs mt-8 pb-4">
                    <p>Thank you for your purchase!</p>
                    <p className="mt-1 text-[10px] text-gray-500">Served by: System Admin</p>
                </div>
            </div>
        </div>
    );
}
