import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, PackageCheck, FileText } from 'lucide-react';
import { getPoLines, receiveGoods, PoLine, ReceiveLineInput, PurchaseOrder, getPurchaseOrders } from '../../lib/api';
import Modal from '../../components/ui/Modal';

import { toast } from '../../components/ui/Toast';
interface ReceiveDrawerProps { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  poId: string; 
  branchId: string; 
}

export default function ReceiveDrawer({ isOpen, onClose, onSuccess, poId, branchId }: ReceiveDrawerProps) {
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<(PoLine & { receiving_now: number, actual_price: number, batch_no: string, expiry_date: string, max_qty: number })[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getPurchaseOrders(branchId).then(pos => {
        const found = pos.find(p => p.id === poId);
        if (found) setPo(found);
      });
      getPoLines(poId).then(data => {
        // Filter out fully received lines and calculate maximum allowed quantities
        const pendingLines = data.filter(l => l.qty_received < l.qty_ordered).map(l => {
          const remaining = l.qty_ordered - l.qty_received;
          return { ...l, receiving_now: remaining, actual_price: l.price_estimate, batch_no: '', expiry_date: '', max_qty: remaining };
        });
        setLines(pendingLines);
      });
    }
  }, [isOpen, poId, branchId]);

  const updateLine = (id: string, field: string, value: any) => setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));

  const totalReceivingAmount = lines.reduce((sum, l) => sum + (l.receiving_now > 0 ? l.receiving_now * l.actual_price : 0), 0);
  const totalReceivingQty = lines.reduce((sum, l) => sum + (l.receiving_now > 0 ? l.receiving_now : 0), 0);

  const handleSubmit = async () => {
    if (!po) return;
    
    // Validate quantities
    if (lines.some(l => l.receiving_now < 0 || l.receiving_now > l.max_qty)) {
      return toast.info("Jumlah barang diterima tidak boleh melebihi sisa pesanan PO.");
    }
    
    // Filter out lines where nothing is being received in this batch
    const activeLines = lines.filter(l => l.receiving_now > 0);
    if (activeLines.length === 0) return toast.info("Pilih dan tentukan minimal 1 item dengan jumlah diterima > 0.");

    setIsSubmitting(true);
    try {
      const payload: ReceiveLineInput[] = activeLines.map(l => ({
        po_line_id: l.id, 
        item_id: l.item_id, 
        unit_id: l.unit_id,
        qty_received: l.receiving_now, 
        price_per_unit: l.actual_price,
        batch_no: l.batch_no.trim() || undefined, 
        expiry_date: l.expiry_date.trim() || undefined
      }));
      await receiveGoods(po.id, branchId, po.supplier_id, invoiceNo.trim() || null, payload);
      onSuccess();
      onClose();
    } catch (e) { 
      toast.error("Gagal memproses penerimaan PO: " + e); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!isOpen || !po) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Penerimaan Barang Pesanan (PO Receipt)"
      subtitle={`Faktur Masuk untuk Pesanan Pembelian #${po.id.slice(0, 8).toUpperCase()}`}
      icon={PackageCheck}
      noPadding={true}
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase text-dim">Total Diterima</p>
              <p className="text-sm font-extrabold text-heading">{totalReceivingQty} Unit</p>
            </div>
            <div className="h-8 w-px bg-line dark:bg-muted" />
            <div>
              <p className="text-[10px] font-bold uppercase text-dim">Total Nilai Tagihan</p>
              <p className="text-base font-extrabold text-success dark:text-success font-mono">
                Rp {totalReceivingAmount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-body hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-success hover:bg-success text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-success/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
              Konfirmasi Penerimaan & Update Stok
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
        
        {/* PO Reference & Invoice No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-xl border border-line">
          <div>
            <label className="text-xs font-bold text-heading uppercase tracking-wider mb-1 block">
              Pemasok / Vendor
            </label>
            <p className="text-sm font-extrabold text-heading">
              {po.supplier_name || 'Vendor'}
            </p>
            <p className="text-xs text-dim font-mono mt-0.5">PO Ref: #{po.id.slice(0, 12)}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-heading uppercase tracking-wider mb-1 block">
              Nomor Faktur / Surat Jalan Supplier
            </label>
            <div className="relative flex items-center bg-card border border-line rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-success/20">
              <FileText size={16} className="text-dim mr-2 shrink-0" />
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-heading font-mono p-0"
                placeholder="contoh: INV-2026-991"
              />
            </div>
          </div>
        </div>

        {/* PO Line Items Validation Matrix */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-heading uppercase tracking-wider">
              Item Pesanan PO ({lines.length} Item Menunggu Penerimaan)
            </h3>
          </div>

          <div className="border border-line rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/80 border-b border-line text-dim font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Produk / Item</th>
                  <th className="p-3 w-20">Satuan</th>
                  <th className="p-3 text-right w-20">Sisa PO</th>
                  <th className="p-3 w-24 text-center">Diterima</th>
                  <th className="p-3 w-32 text-right">Harga Satuan (Rp)</th>
                  <th className="p-3 w-32">No. Batch</th>
                  <th className="p-3 w-32">Kadaluarsa</th>
                  <th className="p-3 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line">
                {lines.map(line => {
                  const lineSubtotal = line.receiving_now * line.actual_price;

                  return (
                    <tr key={line.id} className="bg-card dark:bg-input hover:bg-muted/50 dark:hover:bg-card/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-heading text-xs">{line.item_name}</p>
                      </td>
                      <td className="p-3 text-dim font-bold uppercase text-[11px]">{line.unit_name}</td>
                      <td className="p-3 text-body font-mono text-right font-bold text-xs">{line.max_qty}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={line.receiving_now}
                          onChange={e => updateLine(line.id, 'receiving_now', Number(e.target.value))}
                          max={line.max_qty}
                          min="0"
                          className="w-full p-1.5 border rounded-lg bg-success-soft dark:bg-success/40 border-success dark:border-success text-center font-bold text-success dark:text-success text-xs font-mono outline-none focus:ring-1 focus:ring-success"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={line.actual_price}
                          onChange={e => updateLine(line.id, 'actual_price', Number(e.target.value))}
                          className="w-full p-1.5 border rounded-lg bg-muted border-line font-mono font-bold text-right text-xs outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="No Batch"
                          value={line.batch_no}
                          onChange={e => updateLine(line.id, 'batch_no', e.target.value)}
                          className="w-full p-1.5 border rounded-lg text-xs bg-muted border-line font-mono outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={line.expiry_date}
                          onChange={e => updateLine(line.id, 'expiry_date', e.target.value)}
                          className="w-full p-1.5 border rounded-lg text-xs bg-muted border-line outline-none"
                        />
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-heading">
                        Rp {lineSubtotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  );
}