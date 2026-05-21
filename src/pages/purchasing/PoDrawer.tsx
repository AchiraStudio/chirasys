import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { getSuppliers, getItemsFiltered, getItem, createPurchaseOrder, Supplier, Item, PoLineInput, ItemUnit } from '../../lib/api';

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
    // Optimistically update the item ID
    setLines(lines.map(l => l.tempId === tempId ? { ...l, item_id: itemId, unit_id: '' } : l));
    
    if (itemId && !unitCache[itemId]) {
      const details = await getItem(itemId);
      setUnitCache(prev => ({ ...prev, [itemId]: details.units }));
      
      // Auto-select the base unit if available
      const baseUnit = details.units.find(u => u.is_base === 1) || details.units[0];
      if (baseUnit) {
        setLines(current => current.map(l => l.tempId === tempId ? { ...l, unit_id: baseUnit.id } : l));
      }
    } else if (itemId && unitCache[itemId]) {
        const baseUnit = unitCache[itemId].find(u => u.is_base === 1) || unitCache[itemId][0];
        if (baseUnit) {
            setLines(current => current.map(l => l.tempId === tempId ? { ...l, unit_id: baseUnit.id } : l));
        }
    }
  };

  const updateLine = (id: string, field: string, value: any) => setLines(lines.map(l => l.tempId === id ? { ...l, [field]: value } : l));
  const removeLine = (id: string) => setLines(lines.filter(l => l.tempId !== id));

  const handleSubmit = async () => {
    if (!supplierId || lines.length === 0 || lines.some(l => !l.item_id || !l.unit_id)) return alert("Fill all required fields and ensure units are selected.");
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0B0F19] h-full shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center"><h2 className="text-xl font-bold">New Purchase Order</h2><button onClick={onClose}><X /></button></div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold mb-2 block">Supplier *</label><select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"><option value="">Select...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-semibold mb-2 block">Expected Delivery</label><input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" /></div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2"><h3 className="font-bold">Line Items</h3><button onClick={addLine} className="text-sm text-brand font-semibold flex items-center"><Plus size={16}/> Add Item</button></div>
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.tempId} className="flex gap-3 items-end p-3 border rounded-xl dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex-[2]"><label className="text-xs text-slate-500 mb-1 block">Item</label><select value={line.item_id} onChange={e => handleItemSelect(line.tempId, e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700"><option value="">Select Item...</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                  <div className="flex-1"><label className="text-xs text-slate-500 mb-1 block">Unit</label><select value={line.unit_id} onChange={e => updateLine(line.tempId, 'unit_id', e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700" disabled={!line.item_id}><option value="">Select...</option>{(unitCache[line.item_id] || []).map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}</select></div>
                  <div className="w-20"><label className="text-xs text-slate-500 mb-1 block">Qty</label><input type="number" value={line.qty} onChange={e => updateLine(line.tempId, 'qty', Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700" min="1" /></div>
                  <div className="w-28"><label className="text-xs text-slate-500 mb-1 block">Est. Cost/Unit</label><input type="number" value={line.price} onChange={e => updateLine(line.tempId, 'price', Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700" min="0" /></div>
                  <button onClick={() => removeLine(line.tempId)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mb-0.5"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right p-4 bg-slate-100 dark:bg-slate-800 rounded-xl"><p className="text-sm text-slate-500">Estimated Total</p><p className="text-2xl font-bold text-brand">Rp {totalEstimate.toLocaleString()}</p></div>
        </div>

        <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-sm font-semibold">Cancel</button><button onClick={handleSubmit} disabled={isSubmitting} className="bg-brand text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Send PO</button></div>
      </div>
    </div>
  );
}