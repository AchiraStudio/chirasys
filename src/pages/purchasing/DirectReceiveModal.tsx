import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, Plus, Trash2, Search, Building2, FileText } from 'lucide-react';
import { receiveGoodsDirect, ReceiveLineInput, getSuppliers, Supplier, getItemsFiltered, getItem, Item, ItemUnit } from '../../lib/api';

interface DirectReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branchId: string;
}

interface DirectLine {
  id: string;
  item_id: string;
  item_name: string;
  unit_id: string;
  unit_name: string;
  available_units: ItemUnit[];
  qty_received: number;
  price_per_unit: number;
  batch_no: string;
  expiry_date: string;
}

export default function DirectReceiveModal({ isOpen, onClose, onSuccess, branchId }: DirectReceiveModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [lines, setLines] = useState<DirectLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Item Search Popup State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeLineIdForSearch, setActiveLineIdForSearch] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getSuppliers('', true).then(setSuppliers).catch(console.error);
      setSelectedSupplierId('');
      setInvoiceNo('');
      setLines([
        {
          id: Math.random().toString(),
          item_id: '',
          item_name: '',
          unit_id: '',
          unit_name: '',
          available_units: [],
          qty_received: 1,
          price_per_unit: 0,
          batch_no: '',
          expiry_date: '',
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        getItemsFiltered(searchQuery, '', '', true, 1, 10)
          .then(res => setSearchResults(res.items))
          .catch(console.error)
          .finally(() => setIsSearching(false));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSelectItem = async (lineId: string, item: Item) => {
    try {
      const detail = await getItem(item.id);
      const units = detail.units || [];
      const baseUnit = units.find(u => u.is_base === 1) || units[0];

      setLines(prev =>
        prev.map(l => {
          if (l.id === lineId) {
            return {
              ...l,
              item_id: item.id,
              item_name: item.name,
              unit_id: baseUnit ? baseUnit.id : '',
              unit_name: baseUnit ? baseUnit.unit_name : 'Pcs',
              available_units: units,
              price_per_unit: detail.item.avg_hpp || 0,
            };
          }
          return l;
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setActiveLineIdForSearch(null);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleUnitChange = (lineId: string, unitId: string) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id === lineId) {
          const unit = l.available_units.find(u => u.id === unitId);
          return {
            ...l,
            unit_id: unitId,
            unit_name: unit ? unit.unit_name : l.unit_name,
          };
        }
        return l;
      })
    );
  };

  const updateLine = (id: string, field: keyof DirectLine, value: any) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        item_id: '',
        item_name: '',
        unit_id: '',
        unit_name: '',
        available_units: [],
        qty_received: 1,
        price_per_unit: 0,
        batch_no: '',
        expiry_date: '',
      }
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) {
      setLines([
        {
          id: Math.random().toString(),
          item_id: '',
          item_name: '',
          unit_id: '',
          unit_name: '',
          available_units: [],
          qty_received: 1,
          price_per_unit: 0,
          batch_no: '',
          expiry_date: '',
        }
      ]);
    } else {
      setLines(prev => prev.filter(l => l.id !== id));
    }
  };

  const totalAmount = lines.reduce((sum, l) => sum + (l.qty_received > 0 ? l.qty_received * l.price_per_unit : 0), 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      return alert('Pilih supplier terlebih dahulu.');
    }

    const validLines = lines.filter(l => l.item_id && l.qty_received > 0);
    if (validLines.length === 0) {
      return alert('Harap pilih minimal satu barang dengan kuantitas lebih dari 0.');
    }

    setIsSubmitting(true);
    try {
      const payload: ReceiveLineInput[] = validLines.map(l => ({
        item_id: l.item_id,
        unit_id: l.unit_id,
        qty_received: Number(l.qty_received),
        price_per_unit: Number(l.price_per_unit),
        batch_no: l.batch_no.trim() || undefined,
        expiry_date: l.expiry_date.trim() || undefined,
      }));

      await receiveGoodsDirect(branchId, selectedSupplierId, invoiceNo.trim() || null, payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      alert('Gagal memproses penerimaan barang: ' + (e?.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0B0F19] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-500/10">
          <div>
            <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={22} className="text-emerald-500" /> Penerimaan Barang Langsung (Tanpa PO)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Catat faktur pembelian langsung dari supplier ke dalam stok dan hutang usaha
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Supplier & Invoice info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Building2 size={14} className="text-emerald-500" /> Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <FileText size={14} className="text-emerald-500" /> Nomor Faktur / Surat Jalan
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="Contoh: INV/2026/09/001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Barang Diterima</h3>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors"
              >
                <Plus size={14} /> Tambah Baris
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-8 text-center">#</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 w-28">Satuan</th>
                    <th className="p-3 w-24 text-center">Qty</th>
                    <th className="p-3 w-32">Harga Beli</th>
                    <th className="p-3 w-32">Batch No</th>
                    <th className="p-3 w-36">Kadaluarsa</th>
                    <th className="p-3 w-32 text-right">Subtotal</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lines.map((line, idx) => {
                    const lineSubtotal = line.qty_received * line.price_per_unit;
                    return (
                      <tr key={line.id} className="bg-white dark:bg-[#0B0F19] hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        
                        {/* Item Name / Picker */}
                        <td className="p-3 relative">
                          {line.item_id ? (
                            <div className="flex items-center justify-between group">
                              <span className="font-semibold text-slate-900 dark:text-white">{line.item_name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLineIdForSearch(line.id);
                                  setSearchQuery('');
                                }}
                                className="text-[11px] text-brand hover:underline ml-2"
                              >
                                Ganti
                              </button>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveLineIdForSearch(line.id);
                                  setSearchQuery('');
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-between text-xs transition-colors"
                              >
                                <span>Pilih Barang...</span>
                                <Search size={14} />
                              </button>
                            </div>
                          )}

                          {/* Inline Search Modal / Dropdown */}
                          {activeLineIdForSearch === line.id && (
                            <div className="absolute left-3 top-12 z-30 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <Search size={14} className="text-slate-400" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Ketik minimal 2 huruf nama/SKU..."
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                                />
                                <button onClick={() => setActiveLineIdForSearch(null)} className="text-slate-400 hover:text-slate-600">
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                {isSearching ? (
                                  <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                                    <Loader2 size={14} className="animate-spin" /> Mencari...
                                  </div>
                                ) : searchResults.length === 0 ? (
                                  <div className="p-3 text-center text-slate-400">
                                    {searchQuery.length < 2 ? 'Ketik nama barang...' : 'Tidak ditemukan.'}
                                  </div>
                                ) : (
                                  searchResults.map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleSelectItem(line.id, item)}
                                      className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex justify-between items-center transition-colors"
                                    >
                                      <div>
                                        <p className="font-semibold text-slate-900 dark:text-white text-xs">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-600">Pilih</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Unit Selector */}
                        <td className="p-3">
                          {line.available_units.length > 0 ? (
                            <select
                              value={line.unit_id}
                              onChange={e => handleUnitChange(line.id, e.target.value)}
                              className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none"
                            >
                              {line.available_units.map(u => (
                                <option key={u.id} value={u.id}>{u.unit_name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Qty */}
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={line.qty_received || ''}
                            onChange={e => updateLine(line.id, 'qty_received', parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Cost Price */}
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={line.price_per_unit || ''}
                            onChange={e => updateLine(line.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Batch No */}
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Batch"
                            value={line.batch_no}
                            onChange={e => updateLine(line.id, 'batch_no', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-3">
                          <input
                            type="date"
                            value={line.expiry_date}
                            onChange={e => updateLine(line.id, 'expiry_date', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          Rp {lineSubtotal.toLocaleString('id-ID')}
                        </td>

                        {/* Delete line */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500">Total Nilai Pembelian:</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              Rp {totalAmount.toLocaleString('id-ID')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Simpan & Tambah ke Stok
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
