import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2, ShoppingCart, Building2, Calendar } from 'lucide-react';
import { getSuppliers, getItemsFiltered, getItem, createPurchaseOrder, Supplier, Item, PoLineInput, ItemUnit } from '../../lib/api';
import Modal from '../../components/ui/Modal';

interface PoDrawerProps { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  branchId: string; 
}

export default function PoDrawer({ isOpen, onClose, onSuccess, branchId }: PoDrawerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [unitCache, setUnitCache] = useState<Record<string, ItemUnit[]>>({});
  
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<(PoLineInput & { tempId: string })[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getSuppliers('', true).then(setSuppliers).catch(console.error);
      getItemsFiltered('', '', '', true, 1, 1000).then(res => setItems(res.items)).catch(console.error);
      setSupplierId(''); 
      setExpectedDate(''); 
      setNotes('');
      setLines([
        { tempId: Math.random().toString(), item_id: '', unit_id: '', qty: 1, price: 0 }
      ]); 
      setUnitCache({});
    }
  }, [isOpen]);

  const addLine = () => setLines([...lines, { tempId: Math.random().toString(), item_id: '', unit_id: '', qty: 1, price: 0 }]);
  
  const handleItemSelect = async (tempId: string, itemId: string) => {
    setLines(lines.map(l => l.tempId === tempId ? { ...l, item_id: itemId, unit_id: '' } : l));
    if (!itemId) return;

    let units = unitCache[itemId];
    let defaultHpp = 0;
    if (!units) {
      try {
        const details = await getItem(itemId);
        units = details.units || [];
        defaultHpp = details.item.cost_price || details.item.avg_hpp || 0;
        setUnitCache(prev => ({ ...prev, [itemId]: units }));
      } catch (e) {
        console.error(e);
      }
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
    if (lines.length === 1) {
      setLines([{ tempId: Math.random().toString(), item_id: '', unit_id: '', qty: 1, price: 0 }]);
    } else {
      setLines(lines.filter(l => l.tempId !== tempId));
    }
  };

  const handleSubmit = async () => {
    if (!supplierId) return alert("Pilih pemasok / supplier terlebih dahulu.");
    const validLines = lines.filter(l => l.item_id && l.unit_id && l.qty > 0);
    if (validLines.length === 0) return alert("Tambahkan minimal 1 item produk dengan kuantitas > 0.");

    setIsSubmitting(true);
    try {
      const payload = validLines.map(({ tempId, ...rest }) => rest);
      await createPurchaseOrder(branchId, supplierId, expectedDate || null, notes || null, payload);
      onSuccess();
      onClose();
    } catch (e) { 
      alert("Gagal membuat purchase order: " + e); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (!isOpen) return null;

  const totalEstimate = lines.reduce((sum, l) => sum + (l.qty * l.price), 0);
  const totalQty = lines.reduce((sum, l) => sum + (l.qty || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title="Surat Pesanan Pembelian Baru (PO)"
      subtitle="Buat dan kirim pesanan pengadaan obat & barang ke vendor/distributor"
      icon={ShoppingCart}
      noPadding={true}
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Unit Pesanan</p>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{totalQty} Item</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Estimasi Total Nilai PO</p>
              <p className="text-base font-extrabold text-brand font-mono">
                Rp {totalEstimate.toLocaleString('id-ID')}
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
              className="flex items-center gap-2 bg-brand hover:bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
              Simpan & Terbitkan PO
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
        
        {/* Supplier & Delivery Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pemasok / Vendor *
            </label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand/20">
              <Building2 size={16} className="text-slate-400 mr-2 shrink-0" />
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white p-0"
              >
                <option value="">-- Pilih Pemasok --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Estimasi Tanggal Tiba
            </label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand/20">
              <Calendar size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white p-0"
              />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Barang Pesanan
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-bold text-brand hover:underline cursor-pointer"
            >
              <Plus size={15}/> Tambah Item
            </button>
          </div>
          
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.tempId} className="flex flex-col sm:flex-row gap-3 items-end p-4 border rounded-2xl dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shadow-xs">
                <div className="flex-[3] w-full">
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Produk / Obat</label>
                  <select
                    value={line.item_id}
                    onChange={e => handleItemSelect(line.tempId, e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                  </select>
                </div>

                <div className="flex-1 w-full">
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Satuan</label>
                  <select
                    value={line.unit_id}
                    onChange={e => updateLine(line.tempId, 'unit_id', e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none uppercase"
                    disabled={!line.item_id}
                  >
                    <option value="">Satuan...</option>
                    {(unitCache[line.item_id] || []).map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                  </select>
                </div>

                <div className="w-full sm:w-24">
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Qty Order</label>
                  <input
                    type="number"
                    value={line.qty}
                    onChange={e => updateLine(line.tempId, 'qty', Number(e.target.value))}
                    className="w-full p-2 border rounded-xl text-xs text-center font-bold font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    min="1"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Est. Harga Beli (Rp)</label>
                  <input
                    type="number"
                    value={line.price}
                    onChange={e => updateLine(line.tempId, 'price', Number(e.target.value))}
                    className="w-full p-2 border rounded-xl text-xs font-mono font-bold text-right bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    min="0"
                  />
                </div>

                <div className="w-full sm:w-32 text-right">
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">Subtotal</label>
                  <p className="text-xs font-bold font-mono text-slate-900 dark:text-white py-2">
                    Rp {((line.qty || 0) * (line.price || 0)).toLocaleString('id-ID')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeLine(line.tempId)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl mb-0.5 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
}