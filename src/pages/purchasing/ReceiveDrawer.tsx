import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import { getPoLines, receiveGoods, PoLine, ReceiveLineInput, PurchaseOrder, getPurchaseOrders } from '../../lib/api';

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
  }, [isOpen, poId]);

  const updateLine = (id: string, field: string, value: any) => setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));

  const handleSubmit = async () => {
    if (!po) return;
    
    // Validate quantities
    if (lines.some(l => l.receiving_now < 0 || l.receiving_now > l.max_qty)) {
        return alert("Quantities cannot exceed the remaining ordered amount.");
    }
    
    // Filter out lines where nothing is being received in this batch
    const activeLines = lines.filter(l => l.receiving_now > 0);
    if (activeLines.length === 0) return alert("Must receive at least one item.");

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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0B0F19] h-full shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <div><h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2/> Receive Goods</h2><p className="text-sm font-mono mt-1 opacity-80">PO: {po.id.split('-')[0]}</p></div>
          <button onClick={onClose}><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div><label className="text-sm font-semibold mb-2 block text-slate-700 dark:text-slate-300">Supplier Invoice No.</label><input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-1/2 p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" placeholder="e.g. INV-2026-991" /></div>

          <div className="border rounded-xl overflow-hidden dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800"><tr><th className="p-3">Item</th><th className="p-3">Unit</th><th className="p-3 text-right">Remaining</th><th className="p-3 w-28">Receiving</th><th className="p-3 w-32">Actual Cost</th><th className="p-3">Batch/Expiry</th></tr></thead>
              <tbody className="divide-y dark:divide-slate-800">
                {lines.map(line => (
                  <tr key={line.id} className="bg-white dark:bg-slate-950">
                    <td className="p-3 font-medium">{line.item_name}</td>
                    <td className="p-3 text-slate-500">{line.unit_name}</td>
                    <td className="p-3 text-slate-500 font-mono text-right">{line.max_qty}</td>
                    <td className="p-3"><input type="number" value={line.receiving_now} onChange={e => updateLine(line.id, 'receiving_now', Number(e.target.value))} max={line.max_qty} min="0" className="w-full p-1.5 border rounded bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-center font-bold" /></td>
                    <td className="p-3"><input type="number" value={line.actual_price} onChange={e => updateLine(line.id, 'actual_price', Number(e.target.value))} className="w-full p-1.5 border rounded dark:bg-slate-900 dark:border-slate-700" /></td>
                    <td className="p-3 flex gap-2">
                      <input type="text" placeholder="Batch" value={line.batch_no} onChange={e => updateLine(line.id, 'batch_no', e.target.value)} className="w-1/2 p-1.5 border rounded text-xs dark:bg-slate-900 dark:border-slate-700" />
                      <input type="date" value={line.expiry_date} onChange={e => updateLine(line.id, 'expiry_date', e.target.value)} className="w-1/2 p-1.5 border rounded text-xs dark:bg-slate-900 dark:border-slate-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Confirm Receipt & Update Stock</button></div>
      </div>
    </div>
  );
}