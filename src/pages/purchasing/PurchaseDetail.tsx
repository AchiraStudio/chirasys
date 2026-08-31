// src/pages/purchasing/PurchaseDetail.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Plus, Undo2, CreditCard, RotateCcw } from 'lucide-react';
import { getPurchaseDetail, addPurchasePayment, createPurchaseReturn } from '../../lib/api';
import type { PurchaseDetail as PurchaseDetailData, ReceiveLineInput } from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface PurchaseDetailProps {
  purchaseId: string;
  onBack: () => void;
}

export default function PurchaseDetail({ purchaseId, onBack }: PurchaseDetailProps) {
  const [data, setData] = useState<PurchaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment form
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');

  // Return form
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLines, setReturnLines] = useState<{ line: any; qty: number }[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const detail = await getPurchaseDetail(purchaseId);
      setData(detail);
      setReturnLines(detail.lines.map(l => ({ line: l, qty: 0 })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [purchaseId]);

  const handlePayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return alert('Enter a valid amount.');
    try {
      await addPurchasePayment(purchaseId, Number(paymentAmount), paymentMethod, paymentRef || undefined);
      setShowPayment(false);
      setPaymentAmount(''); setPaymentMethod('cash'); setPaymentRef('');
      loadData();
    } catch (e) { alert('Payment failed: ' + e); }
  };

  const handleReturn = async () => {
    const lines: ReceiveLineInput[] = returnLines
      .filter(r => r.qty > 0)
      .map(r => ({
        po_line_id: '', // not needed
        item_id: r.line.item_id,
        unit_id: r.line.unit_id,
        qty_received: r.qty,
        price_per_unit: 0,
        expiry_date: undefined,
        batch_no: undefined,
      }));
    if (lines.length === 0 || !returnReason) return alert('Specify reason and at least one quantity.');
    try {
      await createPurchaseReturn(purchaseId, lines, returnReason);
      setShowReturn(false);
      setReturnReason('');
      loadData();
    } catch (e) { alert('Return failed: ' + e); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={32} /></div>;
  if (!data) return null;

  const { purchase, lines, payments, returns } = data;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border rounded-xl"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-bold">Purchase #{purchase.id.split('-')[0]}</h1>
          <p className="text-sm text-slate-600">Invoice: {purchase.invoice_no || 'N/A'} &middot; Status: {purchase.status}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowReturn(true)} className="flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-sm"><Undo2 size={14} /> Return</button>
          <button onClick={() => setShowPayment(true)} className="flex items-center gap-1 bg-brand text-white px-4 py-1.5 rounded-lg text-sm"><Plus size={14} /> Add Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border shadow-sm p-4">
            <h3 className="font-semibold mb-3">Items Received</h3>
            <table className="w-full text-left text-sm">
              <thead><tr><th className="py-2">Item</th><th className="py-2">Qty</th><th className="py-2">Unit Price</th><th className="py-2 text-right">Subtotal</th></tr></thead>
              <tbody>{lines.map(l => (
                <tr key={l.id} className="border-t dark:border-slate-700">
                  <td className="py-2">{l.item_name || l.item_id} {l.unit_name ? `(${l.unit_name})` : ''}</td>
                  <td className="py-2">{l.qty_received}</td>
                  <td className="py-2">Rp {l.price_per_unit.toLocaleString('id-ID')}</td>
                  <td className="py-2 text-right">Rp {(l.qty_received * l.price_per_unit).toLocaleString('id-ID')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border shadow-sm p-4">
            <h3 className="font-semibold mb-2">Payments</h3>
            <div className="text-sm space-y-1">
              <p>Total: <strong>Rp {purchase.total_amount.toLocaleString('id-ID')}</strong></p>
              <p>Paid: <strong>Rp {totalPaid.toLocaleString('id-ID')}</strong></p>
              <p>Remaining: <strong>Rp {(purchase.total_amount - totalPaid).toLocaleString('id-ID')}</strong></p>
            </div>
            {payments.length > 0 && (
              <ul className="mt-2 divide-y dark:divide-slate-700 text-xs">
                {payments.map(p => (
                  <li key={p.id} className="py-1 flex justify-between">
                    <span>{p.method} {p.reference && `(${p.reference})`}</span>
                    <span>Rp {p.amount.toLocaleString('id-ID')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {returns.length > 0 && (
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border shadow-sm p-4">
              <h3 className="font-semibold mb-2">Returns</h3>
              <ul className="text-xs space-y-1">
                {returns.map(r => <li key={r.id}>{r.reason} (ID: {r.id.split('-')[0]})</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <Modal
          isOpen={true}
          onClose={() => setShowPayment(false)}
          size="sm"
          title="Catat Pembayaran"
          subtitle="Catat pelunasan atau cicilan pembelian"
          icon={CreditCard}
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePayment}
                className="bg-brand hover:bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-brand/20 transition-all"
              >
                Simpan Pembayaran
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Jumlah Bayar</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value))}
                placeholder="Jumlah (Rp)"
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Metode Pembayaran</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="bank_transfer">Transfer Bank</option>
                <option value="cheque">Giro / Cek</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nomor Referensi / Bukti Transfer</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="No. Referensi (Opsional)"
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Return Modal */}
      {showReturn && (
        <Modal
          isOpen={true}
          onClose={() => setShowReturn(false)}
          size="lg"
          title="Retur Pembelian ke Supplier"
          subtitle="Pilih item dan jumlah yang akan dikembalikan"
          icon={RotateCcw}
          iconBg="bg-rose-500/10 text-rose-500"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowReturn(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReturn}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 transition-all"
              >
                Proses Retur
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Alasan Retur</label>
              <input
                type="text"
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Alasan retur (barang rusak / kadaluarsa / salah kirim)"
                className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {returnLines.map((r, i) => (
                <div key={r.line.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex-1">{r.line.item_name || r.line.item_id} {r.line.unit_name ? `(${r.line.unit_name})` : ''}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={r.line.qty_received}
                      value={r.qty}
                      onChange={e => {
                        const newLines = [...returnLines];
                        newLines[i].qty = Number(e.target.value);
                        setReturnLines(newLines);
                      }}
                      className="w-20 p-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-center font-bold text-xs"
                      placeholder="Qty"
                    />
                    <span className="text-xs text-slate-500 font-mono">/ {r.line.qty_received}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}