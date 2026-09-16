import { Printer, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { getSaleDetail, SaleDetail, getSettings, printRawReceipt } from '../../lib/api';
import { EscPosBuilder } from '../../lib/escpos';
import Modal from '../../components/ui/Modal';

interface ReceiptModalProps {
    saleId: string;
    onClose: () => void;
}

function generateReceiptBytes(data: SaleDetail, settings: { key: string; value: string }[]): number[] {
    const pWidth = settings.find(s => s.key === 'printer_width')?.value || '80mm';
    const pChars = settings.find(s => s.key === 'printer_chars_per_line')?.value;
    const rHeader = settings.find(s => s.key === 'receipt_header')?.value || 'KIVO ERP';
    const rAddress = settings.find(s => s.key === 'receipt_address')?.value || '';
    const rFooter = settings.find(s => s.key === 'receipt_footer')?.value || 'Terima kasih atas kunjungan Anda!';
    const pCut = settings.find(s => s.key === 'printer_autocut')?.value !== 'false';

    let width = pWidth === '58mm' ? 32 : 48;
    if (pChars) {
        const parsed = parseInt(pChars, 10);
        if (!isNaN(parsed) && parsed > 0) width = parsed;
    }
    
    const builder = new EscPosBuilder();
    builder.kickDrawer();
    builder.align('left');
    builder.bold(true).textLine(rHeader).bold(false);
    if (rAddress) builder.textLine(rAddress);
    builder.feed(1);

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

    builder.drawLine(width, '-');
    if (data.lines && data.lines.length > 0) {
        data.lines.forEach(line => {
            const itemName = line.item_name || 'Produk';
            builder.bold(true).textLine(itemName).bold(false);
            
            const qty = line.qty || 1;
            const unit = line.unit_name || 'Pcs';
            const price = line.price || 0;
            const lineSubtotal = line.subtotal || (qty * price - (line.discount_amount || 0));

            builder.leftRight(`  ${qty} ${unit} x ${price.toLocaleString('id-ID')}`, lineSubtotal.toLocaleString('id-ID'), width);

            if (line.discount_amount && line.discount_amount > 0) {
                builder.leftRight(`  (Diskon Item)`, `-${line.discount_amount.toLocaleString('id-ID')}`, width);
            }
        });
    }
    builder.drawLine(width, '-');

    const totalAmount = Math.round(data.sale?.total_amount ?? 0);
    builder.leftRight('Subtotal:', `Rp ${totalAmount.toLocaleString('id-ID')}`, width);

    if (data.sale?.discount_amount && data.sale.discount_amount > 0) {
        builder.leftRight('Diskon Total:', `-Rp ${Math.round(data.sale.discount_amount).toLocaleString('id-ID')}`, width);
    }

    if (data.sale?.tax_amount && data.sale.tax_amount > 0) {
        builder.leftRight('Pajak:', `Rp ${Math.round(data.sale.tax_amount).toLocaleString('id-ID')}`, width);
    }

    const grandTotal = Math.round(data.sale?.grand_total ?? 0);
    builder.bold(true);
    builder.leftRight('TOTAL:', `Rp ${grandTotal.toLocaleString('id-ID')}`, width);
    builder.bold(false);
    builder.drawLine(width, '-');

    if (data.payments && data.payments.length > 0) {
        data.payments.forEach(p => {
            builder.leftRight(`${(p.method || 'TUNAI').toUpperCase()}:`, `Rp ${Math.round(p.amount ?? 0).toLocaleString('id-ID')}`, width);
        });

        const totalPaid = data.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (totalPaid > grandTotal) {
            builder.bold(true);
            builder.leftRight('KEMBALI:', `Rp ${Math.round(totalPaid - grandTotal).toLocaleString('id-ID')}`, width);
            builder.bold(false);
        }
    } else {
        builder.leftRight('BAYAR (TUNAI):', `Rp ${grandTotal.toLocaleString('id-ID')}`, width);
    }
    builder.drawLine(width, '-');

    builder.feed(1);
    if (rFooter) builder.textLine(rFooter);
    builder.textLine('Kivo POS & Business Platform');
    builder.feed(5);

    if (pCut) builder.cut();
    return builder.build();
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

            if (!pName) {
                setPrintStatus('error');
                setPrintMsg('Printer belum dipilih. Buka Pengaturan > Hardware untuk memilih printer default.');
                return;
            }

            const rawBytes = generateReceiptBytes(data, settings);
            await printRawReceipt(pName, rawBytes);
            setPrintStatus('success');
            setPrintMsg(`Struk berhasil dikirim ke printer (${pName})`);
            setTimeLeft(4);
        } catch (e: any) {
            console.error("Print receipt failed:", e);
            setPrintStatus('error');
            setPrintMsg(`Gagal mencetak struk: ${e?.message || String(e)}`);
        }
    }, []);

    useEffect(() => {
        if (!detail || hasPrinted.current) return;
        hasPrinted.current = true;
        printReceipt(detail);
    }, [detail, printReceipt]);

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
            setTimeLeft(null);
            printReceipt(detail);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            size="md"
            title="Pencetakan Struk POS"
            subtitle={detail?.sale?.transaction_no ? `Faktur: ${detail.sale.transaction_no}` : 'Memuat faktur...'}
            icon={Printer}
            footer={
                <div className="flex items-center justify-between w-full">
                    <div>
                        {timeLeft !== null && printStatus === 'success' && (
                            <span className="text-xs font-semibold text-dim">
                                Menutup otomatis dalam <strong className="text-primary">{timeLeft}s</strong>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold rounded-xl border border-line text-heading hover:bg-muted transition-colors"
                        >
                            Tutup
                        </button>
                        <button
                            type="button"
                            onClick={handleManualPrint}
                            disabled={loadingDetail || printStatus === 'printing'}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw size={13} className={printStatus === 'printing' ? 'animate-spin' : ''} />
                            <span>Cetak Ulang</span>
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                {/* Status Indicator Banner */}
                {printStatus === 'printing' && (
                    <div className="p-4 rounded-xl bg-accent-soft dark:bg-blue-950/30 border border-accent/30 dark:border-accent/40 flex items-center gap-3 text-accent dark:text-accent animate-pulse">
                        <Loader2 size={20} className="animate-spin text-primary shrink-0" />
                        <span className="text-xs font-semibold">{printMsg}</span>
                    </div>
                )}

                {printStatus === 'success' && (
                    <div className="p-4 rounded-xl bg-success-soft dark:bg-success/30 border border-success/30 dark:border-success/40 flex items-center gap-3 text-success dark:text-success">
                        <CheckCircle2 size={20} className="text-success shrink-0" />
                        <div className="text-xs">
                            <p className="font-bold">Transaksi Selesai & Dicetak</p>
                            <p className="text-success/80 dark:text-success/80 mt-0.5">{printMsg}</p>
                        </div>
                    </div>
                )}

                {printStatus === 'error' && (
                    <div className="p-4 rounded-xl bg-danger-soft dark:bg-danger/30 border border-danger/30 dark:border-danger/40 flex items-center gap-3 text-danger dark:text-danger">
                        <AlertTriangle size={20} className="text-danger shrink-0" />
                        <div className="text-xs">
                            <p className="font-bold">Gagal Mencetak Struk</p>
                            <p className="text-danger/80 dark:text-danger/80 mt-0.5">{printMsg}</p>
                        </div>
                    </div>
                )}

                {/* Struk Summary Box */}
                {detail?.sale && (
                    <div className="bg-muted/60 p-4 rounded-xl border border-line space-y-2 font-mono text-xs">
                        <div className="flex justify-between text-dim border-b border-line pb-2">
                            <span>Faktur: {detail.sale.transaction_no}</span>
                            <span>{new Date(detail.sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between font-bold text-heading pt-1">
                            <span>Total Tagihan:</span>
                            <span>Rp {Math.round(detail.sale.grand_total).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
