import { Printer, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getSaleDetail, SaleDetail, getSettings, printRawReceipt } from '../../lib/api';
import { EscPosBuilder } from '../../lib/escpos';
import Modal from '../../components/ui/Modal';

interface ReceiptModalProps {
    saleId: string;
    onClose: () => void;
}

export default function ReceiptModal({ saleId, onClose }: ReceiptModalProps) {
    const [detail, setDetail] = useState<SaleDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(true);
    const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
    const [printMsg, setPrintMsg] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const hasPrinted = useRef(false);

    useEffect(() => {
        setLoadingDetail(true);
        getSaleDetail(saleId)
            .then(res => {
                setDetail(res);
                setLoadingDetail(false);
            })
            .catch(err => {
                console.error("Failed to load sale details:", err);
                setPrintStatus('error');
                setPrintMsg('Gagal memuat rincian transaksi: ' + (err?.message || String(err)));
                setLoadingDetail(false);
            });
    }, [saleId]);

    const printReceipt = useCallback(async (data: SaleDetail) => {
        setPrintStatus('printing');
        setPrintMsg('Menghubungi printer...');
        try {
            const settings = await getSettings();
            const pName = settings.find(s => s.key === 'printer_name')?.value;
            const pWidth = settings.find(s => s.key === 'printer_width')?.value || '80mm';
            const pChars = settings.find(s => s.key === 'printer_chars_per_line')?.value;
            const rHeader = settings.find(s => s.key === 'receipt_header')?.value || 'CHIRASYS ERP';
            const rAddress = settings.find(s => s.key === 'receipt_address')?.value || '';
            const rFooter = settings.find(s => s.key === 'receipt_footer')?.value || 'Terima kasih atas kunjungan Anda!';
            const pCut = settings.find(s => s.key === 'printer_autocut')?.value !== 'false';

            if (!pName) {
                setPrintStatus('error');
                setPrintMsg('Printer belum dipilih. Buka Pengaturan > Hardware untuk memilih printer default.');
                return;
            }

            const defaultWidth = pWidth === '58mm' ? 32 : 48;
            let width = defaultWidth;
            if (pChars) {
                const parsed = parseInt(pChars, 10);
                if (!isNaN(parsed) && parsed > 0) width = parsed;
            }
            
            const builder = new EscPosBuilder();
            
            // 1. Kick cash drawer immediately with receipt
            builder.kickDrawer();

            // 2. Header & Store Info
            builder.align('left');
            builder.bold(true).textLine(rHeader).bold(false);
            if (rAddress) builder.textLine(rAddress);
            builder.feed(1);

            // 3. Metadata
            let dateFormatted = '-';
            try {
                if (data.sale?.created_at) {
                    const dt = new Date(data.sale.created_at.replace(' ', 'T'));
                    dateFormatted = isNaN(dt.getTime()) ? data.sale.created_at : dt.toLocaleString('id-ID');
                }
            } catch {
                dateFormatted = data.sale?.created_at || '-';
            }

            builder.leftRight(`No: ${data.sale?.transaction_no || '-'}`, dateFormatted, width);
            const cashierName = data.cashier_name || 'Kasir';
            const priceTypeLabel = data.sale?.price_type === 'wholesale' ? 'Grosir' : 'Eceran';
            builder.leftRight(`Kasir: ${cashierName}`, `Tipe: ${priceTypeLabel}`, width);
            builder.feed(1);

            // 4. Items Table
            builder.drawLine(width, '-');
            if (data.lines && data.lines.length > 0) {
                data.lines.forEach(line => {
                    const itemName = line.item_name || 'Produk';
                    builder.bold(true).textLine(itemName).bold(false);
                    
                    const qty = line.qty || 1;
                    const unit = line.unit_name || 'Pcs';
                    const price = line.price || 0;
                    const lineSubtotal = line.subtotal || (qty * price - (line.discount_amount || 0));

                    const qtyStr = `${qty} ${unit} x ${price.toLocaleString('id-ID')}`;
                    const subtotalStr = lineSubtotal.toLocaleString('id-ID');
                    builder.leftRight(`  ${qtyStr}`, subtotalStr, width);

                    if (line.discount_amount && line.discount_amount > 0) {
                        builder.leftRight(`  (Diskon Item)`, `-${line.discount_amount.toLocaleString('id-ID')}`, width);
                    }
                });
            }
            builder.drawLine(width, '-');

            // 5. Totals
            const totalAmount = Math.round(data.sale?.total_amount ?? 0);
            builder.leftRight('Subtotal:', `Rp ${totalAmount.toLocaleString('id-ID')}`, width);

            if (data.sale?.discount_amount && data.sale.discount_amount > 0) {
                const discVal = Math.round(data.sale.discount_amount);
                builder.leftRight('Diskon Total:', `-Rp ${discVal.toLocaleString('id-ID')}`, width);
            }

            if (data.sale?.tax_amount && data.sale.tax_amount > 0) {
                const taxVal = Math.round(data.sale.tax_amount);
                builder.leftRight('Pajak:', `Rp ${taxVal.toLocaleString('id-ID')}`, width);
            }

            const grandTotal = Math.round(data.sale?.grand_total ?? 0);
            builder.bold(true);
            builder.leftRight('TOTAL:', `Rp ${grandTotal.toLocaleString('id-ID')}`, width);
            builder.bold(false);
            builder.drawLine(width, '-');

            // 6. Payments & Change
            if (data.payments && data.payments.length > 0) {
                data.payments.forEach(p => {
                    const payVal = Math.round(p.amount ?? 0);
                    const methodUpper = (p.method || 'TUNAI').toUpperCase();
                    builder.leftRight(`${methodUpper}:`, `Rp ${payVal.toLocaleString('id-ID')}`, width);
                });

                const totalPaid = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
                if (totalPaid > grandTotal) {
                    const changeVal = Math.round(totalPaid - grandTotal);
                    builder.bold(true);
                    builder.leftRight('KEMBALI:', `Rp ${changeVal.toLocaleString('id-ID')}`, width);
                    builder.bold(false);
                }
            } else {
                builder.leftRight('BAYAR (TUNAI):', `Rp ${grandTotal.toLocaleString('id-ID')}`, width);
            }
            builder.drawLine(width, '-');

            // 7. Footer
            builder.feed(1);
            if (rFooter) builder.textLine(rFooter);
            builder.textLine('ChiraSys ERP & Cashier');
            builder.feed(5);

            if (pCut) builder.cut();

            await printRawReceipt(pName, builder.build());
            setPrintStatus('success');
            setPrintMsg(`Struk berhasil dikirim ke printer (${pName})`);
            setTimeLeft(4); // Start auto-close timer only after successful print
        } catch (e: any) {
            console.error("Print receipt failed:", e);
            setPrintStatus('error');
            setPrintMsg(`Gagal mencetak struk: ${e?.message || String(e)}`);
        }
    }, []);

    // Auto-trigger printing when details are loaded
    useEffect(() => {
        if (!detail || hasPrinted.current) return;
        hasPrinted.current = true;
        printReceipt(detail);
    }, [detail, printReceipt]);

    // Countdown auto-close timer (only active on success)
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onClose]);

    const handleManualPrint = () => {
        if (detail) {
            setTimeLeft(null); // pause countdown if manually retrying
            printReceipt(detail);
        }
    };

    if (loadingDetail || !detail) {
        return (
            <Modal isOpen={true} onClose={onClose} size="sm">
                <div className="py-12 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-brand mb-4" size={32} />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Memuat rincian transaksi...</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="sm"
            noPadding={true}
            footer={
                <div className="flex flex-col gap-2.5 w-full">
                    <button 
                        type="button"
                        onClick={handleManualPrint}
                        disabled={printStatus === 'printing'}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                    >
                        {printStatus === 'printing' ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Printer size={16} />
                        )}
                        <span>{printStatus === 'error' ? 'Coba Cetak Ulang' : 'Cetak Ulang Struk'}</span>
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                    >
                        {timeLeft !== null && timeLeft > 0 ? `Tutup Otomatis (${timeLeft}s)` : 'Tutup Jendela (ESC)'}
                    </button>
                </div>
            }
        >
            {/* Header Success / Status Icon */}
            <div className="p-6 flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                    printStatus === 'error' 
                        ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-500' 
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                }`}>
                    {printStatus === 'error' ? (
                        <AlertTriangle size={28} />
                    ) : (
                        <CheckCircle2 size={30} />
                    )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pembayaran Berhasil</h2>
                <p className="text-slate-500 text-xs mt-0.5 font-mono font-bold">{detail.sale?.transaction_no}</p>
                
                {/* Dynamic Printer Status Pill */}
                <div className="mt-3 w-full">
                    {printStatus === 'printing' && (
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand bg-brand/10 dark:bg-brand/20 px-3 py-1.5 rounded-xl border border-brand/20 animate-pulse">
                            <RefreshCw size={13} className="animate-spin" />
                            <span>{printMsg || 'Mengirim data ke printer...'}</span>
                        </div>
                    )}
                    {printStatus === 'success' && (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span className="truncate">{printMsg}</span>
                        </div>
                    )}
                    {printStatus === 'error' && (
                        <div className="text-left text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-800/80 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                                <AlertTriangle size={13} className="shrink-0" />
                                <span>Peringatan Cetak Struk</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-rose-600/90 dark:text-rose-300/90">{printMsg}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Receipt Breakdown Preview */}
            <div className="p-4 mx-5 my-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar">
                {detail.lines && detail.lines.map((l, i) => (
                    <div key={i} className="mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0 last:mb-0 last:pb-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{l.item_name || 'Produk'}</p>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{l.qty} {l.unit_name || 'Pcs'} x Rp {(l.price || 0).toLocaleString('id-ID')}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">Rp {(l.subtotal || (l.qty * l.price - (l.discount_amount || 0))).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 mt-2 flex justify-between font-bold text-slate-900 dark:text-white text-xs">
                    <span>TOTAL</span>
                    <span className="text-brand">Rp {(detail.sale?.grand_total || 0).toLocaleString('id-ID')}</span>
                </div>
            </div>
        </Modal>
    );
}
