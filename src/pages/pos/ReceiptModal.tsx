import { Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getSaleDetail, SaleDetail, getSettings, printRawReceipt } from '../../lib/api';
import { EscPosBuilder } from '../../lib/escpos';

interface ReceiptModalProps {
    saleId: string;
    onClose: () => void;
}

export default function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
    const [detail, setDetail] = useState<SaleDetail | null>(null);
    const [timeLeft, setTimeLeft] = useState(3);
    const hasPrinted = useRef(false);

    useEffect(() => {
        getSaleDetail(saleId).then(setDetail).catch(console.error);
    }, [saleId]);

    const printReceipt = useCallback(async (data: SaleDetail) => {
        try {
            const settings = await getSettings();
            const pName = settings.find(s => s.key === 'printer_name')?.value;
            const pWidth = settings.find(s => s.key === 'printer_width')?.value || '80mm';
            const pChars = settings.find(s => s.key === 'printer_chars_per_line')?.value;
            const rHeader = settings.find(s => s.key === 'receipt_header')?.value || 'CHIRASYS ERP';
            const rAddress = settings.find(s => s.key === 'receipt_address')?.value || '';
            const rFooter = settings.find(s => s.key === 'receipt_footer')?.value || 'Thank you for your purchase!';
            const pCut = settings.find(s => s.key === 'printer_autocut')?.value !== 'false';

            if (!pName) {
                console.warn("No printer configured in settings.");
                return;
            }

            const defaultWidth = pWidth === '58mm' ? 32 : 48;
            let width = defaultWidth;
            if (pChars) {
                const parsed = parseInt(pChars, 10);
                if (!isNaN(parsed) && parsed > 0) width = parsed;
            }
            
            const builder = new EscPosBuilder();
            
            // Header & Info (All Left Aligned)
            builder.align('left');
            builder.bold(true).textLine(rHeader).bold(false);
            if (rAddress) builder.textLine(rAddress);
            builder.feed(1);
            builder.textLine(`Receipt: ${data.sale.transaction_no}`);
            builder.textLine(new Date(data.sale.created_at).toLocaleString('id-ID'));
            builder.feed(1);

            // Items
            builder.drawLine(width, '-');
            data.lines.forEach(line => {
                builder.bold(true).textLine(line.item_name ?? '').bold(false);
                const lineDetail = `${line.qty} ${line.unit_name ?? ''} x ${line.price.toLocaleString('id-ID')} = ${line.subtotal.toLocaleString('id-ID')}`;
                builder.textLine(lineDetail);
            });
            builder.drawLine(width, '-');

            // Totals (Left Aligned - Never Cutoff)
            const subtotalVal = Math.round(data.sale.total_amount ?? 0);
            builder.textLine(`Subtotal: Rp ${subtotalVal.toLocaleString('id-ID')}`);

            if (data.sale.discount_amount && data.sale.discount_amount > 0) {
                const discVal = Math.round(data.sale.discount_amount);
                builder.textLine(`Diskon: -Rp ${discVal.toLocaleString('id-ID')}`);
            }

            const grandTotalVal = Math.round(data.sale.grand_total ?? 0);
            builder.bold(true);
            builder.textLine(`TOTAL: Rp ${grandTotalVal.toLocaleString('id-ID')}`);
            builder.bold(false);
            builder.drawLine(width, '-');

            // Payments & Change
            data.payments.forEach(p => {
                const payVal = Math.round(p.amount ?? 0);
                builder.textLine(`${p.method.toUpperCase()}: Rp ${payVal.toLocaleString('id-ID')}`);
            });

            const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
            if (paid > data.sale.grand_total) {
                const changeVal = Math.round(paid - data.sale.grand_total);
                builder.textLine(`Kembali: Rp ${changeVal.toLocaleString('id-ID')}`);
            }
            builder.drawLine(width, '-');

            // Footer (All Left Aligned)
            builder.feed(1);
            if (rFooter) builder.textLine(rFooter);
            const cashierName = data.cashier_name || 'System Admin';
            builder.textLine(`Served by: ${cashierName}`);
            builder.feed(5);

            if (pCut) builder.cut();

            await printRawReceipt(pName, builder.build());
        } catch (e) {
            console.error("Auto-print failed", e);
        }
    }, []);

    useEffect(() => {
        if (!detail || hasPrinted.current) return;
        hasPrinted.current = true;
        printReceipt(detail);
    }, [detail, printReceipt]);

    useEffect(() => {
        if (!detail) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [detail, onClose]);

    const handlePrint = () => {
        if (detail) printReceipt(detail);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            {/* Screen UI */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="p-8 flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pembayaran Berhasil</h2>
                    <p className="text-slate-500 text-xs mt-1 font-mono">{detail.sale.transaction_no}</p>
                </div>

                {/* Visual Receipt Breakdown Preview */}
                <div className="p-4 mx-6 my-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar">
                    {detail.lines.map((l, i) => (
                        <div key={i} className="mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 last:mb-0 last:pb-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{l.item_name}</p>
                            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span>{l.qty} {l.unit_name || 'Pcs'} x Rp {l.price.toLocaleString('id-ID')}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">Rp {l.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    ))}
                    <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 mt-2 flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                        <span>TOTAL</span>
                        <span className="text-brand">Rp {(detail.sale.grand_total || 0).toLocaleString('id-ID')}</span>
                    </div>
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
                        New Sale ({timeLeft}s)
                    </button>
                </div>
            </div>
        </div>
    );
}
