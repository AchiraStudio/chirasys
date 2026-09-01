import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { getSuppliers, getItemsFiltered, getItem, createPurchaseOrder, Supplier, Item, PoLineInput, ItemUnit } from '../../lib/api';
import Drawer from '../../components/ui/Drawer';

interface PoDrawerProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; branchId: string; }

export default function PoDrawer({ isOpen, onClose, onSuccess, branchId }: PoDrawerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [unitCache, setUnitCache] = useState<Record<string, ItemUnit[]>>({}); // Cache units per item
  
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<(PoLineInput & { tempId: string })[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getSuppliers('', true).then(setSuppliers);
      getItemsFiltered('', '', '', true, 1, 1000).then(res => setItems(res.items));
      setSupplierId(''); setExpectedDate(''); setLines([]); setUnitCache({});
    }
  }, [isOpen]);

  const addLine = () => setLines([...lines, { tempId: Math.random().toString(), item_id: '', unit_id: '', qty: 1, price: 0 }]);
  
  const handleItemSelect = async (tempId: string, itemId: string) => {
    setLines(lines.map(l => l.tempId === tempId ? { ...l, item_id: itemId, unit_id: '' } : l));
    if (!itemId) return;

    let units = unitCache[itemId];
    let defaultHpp = 0;
    if (!units) {
      const details = await getItem(itemId);
      units = details.units;
      defaultHpp = details.item.avg_hpp || 0;
      setUnitCache(prev => ({ ...prev, [itemId]: details.units }));
    }

    const baseUnit = units?.find(u => u.is_base === 1) || units?.[0];
    if (baseUnit) {
      setLines(current => current.map(l => l.tempId === tempId ? { ...l, unit_id: baseUnit.id, price: l.price || defaultHpp } : l));
    }
  };

  const updateLine = (tempId: string, field: keyof PoLineInput, value: any) => {
    setLines(lines.map(l => l.tempId === tempId ? { ...l, [field]: value } : l));
  };

  const removeLine = (tempId: string) => {
    setLines(lines.filter(l => l.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (!supplierId) return alert("Pilih pemasok terlebih dahulu.");
    if (lines.length === 0) return alert("Tambahkan minimal 1 item produk.");
    for (const l of lines) {
      if (!l.item_id || !l.unit_id || l.qty <= 0) {
        return alert("Lengkapi data item, satuan, dan jumlah pesanan.");
      }
    }

    setIsSubmitting(true);
    try {
      const payload = lines.map(({ tempId, ...rest }) => rest);
      await createPurchaseOrder(branchId, supplierId, expectedDate || null, null, payload);
      onSuccess();
      onClose();
    } catch (e) { alert("Error: " + e); } finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;

  const totalEstimate = lines.reduce((sum, l) => sum + (l.qty * l.price), 0);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Surat Pesanan Baru (PO)"
      subtitle="Buat pesanan pembelian ke pemasok/distributor"
      icon={ShoppingCart}
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
            className="bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-brand/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
            Kirim Purchase Order
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
              Pemasok / Supplier *
            </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Pilih Pemasok...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
              Estimasi Tanggal Tiba
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={e => setExpectedDate(e.target.value)}
              className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Daftar Barang Pesanan</h3>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-brand font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={14}/> Tambah Item
            </button>
          </div>
          
          <div className="space-y-3">
            {lines.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
                Belum ada produk ditambahkan. Klik "Tambah Item" untuk memulai pesanan.
              </div>
            ) : (
              lines.map((line) => (
                <div key={line.tempId} className="flex gap-3 items-end p-3.5 border rounded-2xl dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                  <div className="flex-[2]">
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Produk</label>
                    <select
                      value={line.item_id}
                      onChange={e => handleItemSelect(line.tempId, e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    >
                      <option value="">Pilih Produk...</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Satuan</label>
                    <select
                      value={line.unit_id}
                      onChange={e => updateLine(line.tempId, 'unit_id', e.target.value)}
                      className="w-full p-2 border rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      disabled={!line.item_id}
                    >
                      <option value="">Pilih Satuan...</option>
                      {(unitCache[line.item_id] || []).map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Qty</label>
                    <input
                      type="number"
                      value={line.qty}
                      onChange={e => updateLine(line.tempId, 'qty', Number(e.target.value))}
                      className="w-full p-2 border rounded-xl text-xs text-center font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      min="1"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">Est. Biaya/Unit</label>
                    <input
                      type="number"
                      value={line.price}
                      onChange={e => updateLine(line.tempId, 'price', Number(e.target.value))}
                      className="w-full p-2 border rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      min="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.tempId)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl mb-0.5"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-right p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Estimasi Total Pembelian</p>
          <p className="text-xl font-bold text-brand mt-0.5">Rp {totalEstimate.toLocaleString('id-ID')}</p>
        </div>
      </div>
    </Drawer>
  );
}