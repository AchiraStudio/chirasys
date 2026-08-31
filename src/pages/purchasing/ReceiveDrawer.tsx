import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, PackageCheck } from 'lucide-react';
import { getPoLines, receiveGoods, PoLine, ReceiveLineInput, PurchaseOrder, getPurchaseOrders } from '../../lib/api';
import Drawer from '../../components/ui/Drawer';

interface ReceiveDrawerProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; poId: string; branchId: string; }

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

  const handleSubmit = async () => {
    if (!po) return;
    
    // Validate quantities
    if (lines.some(l => l.receiving_now < 0 || l.receiving_now > l.max_qty)) {
        return alert("Jumlah barang diterima tidak boleh melebihi sisa pesanan.");
    }
    
    // Filter out lines where nothing is being received in this batch
    const activeLines = lines.filter(l => l.receiving_now > 0);
    if (activeLines.length === 0) return alert("Pilih minimal 1 item untuk diterima.");

    setIsSubmitting(true);
    try {
      const payload: ReceiveLineInput[] = activeLines.map(l => ({
        po_line_id: l.id, item_id: l.item_id, unit_id: l.unit_id,
        qty_received: l.receiving_now, price_per_unit: l.actual_price,
        batch_no: l.batch_no || undefined, expiry_date: l.expiry_date || undefined
      }));
      await receiveGoods(po.id, branchId, po.supplier_id, invoiceNo || null, payload);
      onSuccess();
      onClose();
    } catch (e) { alert("Error: " + e); } finally { setIsSubmitting(false); }
  };

  if (!isOpen || !po) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Penerimaan Barang (Goods Receipt)"
      subtitle={`PO No: ${po.id.split('-')[0]}`}
      icon={PackageCheck}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
            Konfirmasi Penerimaan & Update Stok
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
            Nomor Faktur / Surat Jalan Supplier
          </label>
          <input
            type="text"
            value={invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
            className="w-full sm:w-80 p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
            placeholder="contoh: INV-2026-991"
          />
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase">
              <tr>
                <th className="p-3">Produk</th>
                <th className="p-3">Satuan</th>
                <th className="p-3 text-right">Sisa PO</th>
                <th className="p-3 w-28 text-center">Diterima</th>
                <th className="p-3 w-32 text-right">HPP Faktur</th>
                <th className="p-3">Batch & Kadaluarsa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map(line => (
                <tr key={line.id} className="bg-white dark:bg-slate-950">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{line.item_name}</td>
                  <td className="p-3 text-slate-500">{line.unit_name}</td>
                  <td className="p-3 text-slate-600 font-mono text-right font-bold">{line.max_qty}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={line.receiving_now}
                      onChange={e => updateLine(line.id, 'receiving_now', Number(e.target.value))}
                      max={line.max_qty}
                      min="0"
                      className="w-full p-1.5 border rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-center font-bold text-emerald-800 dark:text-emerald-300 text-xs"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={line.actual_price}
                      onChange={e => updateLine(line.id, 'actual_price', Number(e.target.value))}
                      className="w-full p-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-right text-xs"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="No Batch"
                        value={line.batch_no}
                        onChange={e => updateLine(line.id, 'batch_no', e.target.value)}
                        className="w-1/2 p-1.5 border rounded-xl text-[11px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                      <input
                        type="date"
                        value={line.expiry_date}
                        onChange={e => updateLine(line.id, 'expiry_date', e.target.value)}
                        className="w-1/2 p-1.5 border rounded-xl text-[11px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}