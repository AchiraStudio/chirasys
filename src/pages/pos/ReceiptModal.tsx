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

            let width = pWidth === '80mm' ? 42 : 32;
            if (pChars) width = parseInt(pChars, 10);
            
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
                const qtyStr = `${line.qty} ${line.unit_name ?? ''} x ${line.price.toLocaleString('id-ID')}`;
                const subStr = line.subtotal.toLocaleString('id-ID');
                builder.leftRight(qtyStr, subStr, width);
            });
            builder.drawLine(width, '-');

            // Totals
            builder.leftRight('Subtotal:', data.sale.total_amount.toLocaleString('id-ID'), width);
            if (data.sale.discount_amount > 0) {
                builder.leftRight('Discount:', '-' + data.sale.discount_amount.toLocaleString('id-ID'), width);
            }
            builder.bold(true);
            builder.leftRight('Total:', data.sale.grand_total.toLocaleString('id-ID'), width);
            builder.bold(false);
            builder.drawLine(width, '-');

            // Payments
            data.payments.forEach(p => {
                builder.leftRight(`${p.method.toUpperCase()}:`, p.amount.toLocaleString('id-ID'), width);
            });

            // Change
            const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
            if (paid > data.sale.grand_total) {
                builder.bold(true);
                builder.leftRight('Change:', (paid - data.sale.grand_total).toLocaleString('id-ID'), width);
                builder.bold(false);
            }

            // Footer (All Left Aligned)
            builder.feed(1);
            if (rFooter) builder.textLine(rFooter);
            builder.textLine('Served by: System Admin');
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
                        New Sale ({timeLeft}s)
                    </button>
                </div>
            </div>
        </div>
    );
}
