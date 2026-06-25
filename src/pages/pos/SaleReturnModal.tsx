import { useState, useEffect } from 'react';
import { getSaleDetail, createSaleReturn, SaleDetail, SaleReturnLineInput } from '../../lib/api';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  saleId: string;
  onClose: () => void;
}

export default function SaleReturnModal({ saleId, onClose }: Props) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSaleDetail(saleId).then(res => {
      setDetail(res);
      const initialQtys: Record<string, number> = {};
      res.lines.forEach(l => {
        initialQtys[l.id] = 0;
      });
      setReturnQty(initialQtys);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [saleId]);

  const handleSubmit = async () => {
    if (!detail) return;
    const linesToReturn: SaleReturnLineInput[] = [];
    
    for (const line of detail.lines) {
      const rq = returnQty[line.id] || 0;
      if (rq > 0) {
        linesToReturn.push({
          sale_line_id: line.id,
          item_id: line.item_id,
          unit_id: line.unit_id,
          qty: rq,
          price: line.price - (line.discount_amount > 0 ? (line.discount_amount / line.qty) : 0),
          hpp_value: line.hpp_value
        });
      }
    }

    if (linesToReturn.length === 0) {
      alert("Pilih minimal 1 item untuk diretur.");
      return;
    }
    if (!reason.trim()) {
      alert("Alasan retur harus diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await createSaleReturn(saleId, linesToReturn, reason);
      alert("Retur berhasil diproses!");
      onClose();
    } catch (e: any) {
      alert("Gagal memproses retur: " + e.toString());
    } finally {
      setSubmitting(false);
    }
  };

  const updateQty = (lineId: string, val: number, max: number) => {
    let newQty = val;
    if (newQty < 0) newQty = 0;
    if (newQty > max) newQty = max;
    setReturnQty(prev => ({ ...prev, [lineId]: newQty }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <Loader2 className="animate-spin text-white relative z-10" size={48} />
      </div>
    );
  }

  if (!detail) return null;

  const totalReturnVal = detail.lines.reduce((sum, line) => {
    const rq = returnQty[line.id] || 0;
    const unitPrice = line.price - (line.discount_amount / line.qty);
    return sum + (rq * unitPrice);
  }, 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Proses Retur Penjualan</h2>
            <p className="text-sm font-mono text-slate-500 mt-0.5">{detail.sale.transaction_no}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 flex gap-3 mb-6">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Informasi Retur</p>
              <p>Dana akan dikembalikan (Refund) melalui Kas Kecil (Kasir) dan stok akan dikembalikan ke inventaris.</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {detail.lines.map(line => (
              <div key={line.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{line.item_name}</p>
                  <p className="text-sm text-slate-500">Harga: Rp {line.price.toLocaleString('id-ID')} / {line.unit_name}</p>
                  <p className="text-sm text-slate-500">Terjual: <strong className="text-slate-700 dark:text-slate-300">{line.qty}</strong></p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="text-xs font-semibold text-slate-500">Qty Diretur</label>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                    <button type="button" onClick={() => updateQty(line.id, (returnQty[line.id] || 0) - 1, line.qty)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600">-</button>
                    <input 
                      type="number" 
                      min="0" max={line.qty} 
                      value={returnQty[line.id] || 0}
                      onChange={e => updateQty(line.id, parseInt(e.target.value) || 0, line.qty)}
                      className="w-12 text-center bg-transparent border-none outline-none font-bold text-slate-900 dark:text-white"
                    />
                    <button type="button" onClick={() => updateQty(line.id, (returnQty[line.id] || 0) + 1, line.qty)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600">+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan Retur</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              required 
              placeholder="Barang cacat, salah barang, dll..." 
              rows={2} 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-brand resize-none text-sm" 
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-0.5">Total Nilai Retur</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-500">Rp {totalReturnVal.toLocaleString('id-ID')}</p>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || totalReturnVal === 0 || !reason.trim()} 
            className="px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Memproses...' : 'Proses Retur'}
          </button>
        </div>
      </div>
    </div>
  );
}
