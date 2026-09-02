import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, PackageCheck, FileText, Calendar, Hash, Tag } from 'lucide-react';
import { getPoLines, receiveGoods, PoLine, ReceiveLineInput, PurchaseOrder, getPurchaseOrders } from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
      return alert("Jumlah barang diterima tidak boleh melebihi sisa pesanan PO.");
    }
    
    // Filter out lines where nothing is being received in this batch
    const activeLines = lines.filter(l => l.receiving_now > 0);
    if (activeLines.length === 0) return alert("Pilih dan tentukan minimal 1 item dengan jumlah diterima > 0.");

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
      alert("Gagal memproses penerimaan PO: " + e); 
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
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Diterima</p>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{totalReceivingQty} Unit</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Nilai Tagihan</p>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                Rp {totalReceivingAmount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              Pemasok / Vendor
            </label>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              {po.supplier_name || 'Vendor'}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">PO Ref: #{po.id.slice(0, 12)}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              Nomor Faktur / Surat Jalan Supplier
            </label>
            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500/20">
              <FileText size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white font-mono p-0"
                placeholder="contoh: INV-2026-991"
              />
            </div>
          </div>
        </div>

        {/* PO Line Items Validation Matrix */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Item Pesanan PO ({lines.length} Item Menunggu Penerimaan)
            </h3>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map(line => {
                  const lineSubtotal = line.receiving_now * line.actual_price;

                  return (
                    <tr key={line.id} className="bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{line.item_name}</p>
                      </td>
                      <td className="p-3 text-slate-500 font-bold uppercase text-[11px]">{line.unit_name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-right font-bold text-xs">{line.max_qty}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={line.receiving_now}
                          onChange={e => updateLine(line.id, 'receiving_now', Number(e.target.value))}
                          max={line.max_qty}
                          min="0"
                          className="w-full p-1.5 border rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-center font-bold text-emerald-800 dark:text-emerald-300 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={line.actual_price}
                          onChange={e => updateLine(line.id, 'actual_price', Number(e.target.value))}
                          className="w-full p-1.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono font-bold text-right text-xs outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="No Batch"
                          value={line.batch_no}
                          onChange={e => updateLine(line.id, 'batch_no', e.target.value)}
                          className="w-full p-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={line.expiry_date}
                          onChange={e => updateLine(line.id, 'expiry_date', e.target.value)}
                          className="w-full p-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                        />
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-slate-900 dark:text-white">
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