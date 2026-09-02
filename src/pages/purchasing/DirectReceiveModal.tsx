import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Loader2, Plus, Trash2, Search, 
  Building2, FileText, Download, FileSpreadsheet, AlertTriangle, X 
} from 'lucide-react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { 
  receiveGoodsDirect, ReceiveLineInput, getSuppliers, Supplier, 
  getItemsFiltered, getItem, Item, ItemUnit,
  exportReceiveTemplate, parseReceiveExcel
} from '../../lib/api';
import Modal from '../../components/ui/Modal';

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
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isExportingTemplate, setIsExportingTemplate] = useState(false);

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
              unit_name: baseUnit ? baseUnit.unit_name : 'PCS',
              available_units: units,
              price_per_unit: detail.item.cost_price || detail.item.avg_hpp || 0,
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

  // --- Excel Actions ---
  const handleDownloadTemplate = async () => {
    setIsExportingTemplate(true);
    try {
      const filePath = await save({
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        defaultPath: 'Template_Penerimaan_Barang.xlsx',
      });
      if (!filePath) return;

      await exportReceiveTemplate(filePath);
      alert('Template Excel berhasil diunduh!');
    } catch (e) {
      console.error(e);
      alert(`Gagal mengunduh template: ${e}`);
    } finally {
      setIsExportingTemplate(false);
    }
  };

  const handleImportExcel = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;

      setIsParsingExcel(true);
      const parsedItems = await parseReceiveExcel(filePath);
      if (parsedItems.length === 0) {
        return alert('File Excel tidak berisi data yang valid.');
      }

      const newLines: DirectLine[] = await Promise.all(
        parsedItems.map(async p => {
          let available_units: ItemUnit[] = [];
          if (p.item_id) {
            try {
              const detail = await getItem(p.item_id);
              available_units = detail.units || [];
            } catch (_) {}
          }
          return {
            id: Math.random().toString(),
            item_id: p.item_id,
            item_name: p.item_name,
            unit_id: p.unit_id,
            unit_name: p.unit_name,
            available_units,
            qty_received: p.qty_received,
            price_per_unit: p.price_per_unit,
            batch_no: p.batch_no,
            expiry_date: p.expiry_date,
          };
        })
      );

      setLines(newLines);

      const unmatchedCount = parsedItems.filter(p => !p.matched).length;
      if (unmatchedCount > 0) {
        alert(`Berhasil memuat ${parsedItems.length} baris dari Excel.\nPerhatian: Ada ${unmatchedCount} item yang belum cocok dengan SKU master data.`);
      } else {
        alert(`Berhasil memuat ${parsedItems.length} baris barang dari Excel!`);
      }
    } catch (err) {
      console.error(err);
      alert(`Gagal memproses Excel: ${err}`);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const totalAmount = lines.reduce((sum, l) => sum + (l.qty_received > 0 ? l.qty_received * l.price_per_unit : 0), 0);
  const totalQty = lines.reduce((sum, l) => sum + (l.qty_received > 0 ? l.qty_received : 0), 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      return alert('Pilih supplier / pemasok terlebih dahulu.');
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title="Penerimaan Barang Langsung (Direct Receipt)"
      subtitle="Catat faktur penerimaan barang & update stok fisik beserta hutang dagang"
      icon={CheckCircle2}
      noPadding={true}
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Kuantitas</p>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{totalQty} Unit</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:border-slate-800" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Nilai Faktur</p>
              <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                Rp {totalAmount.toLocaleString('id-ID')}
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
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Konfirmasi & Tambah ke Stok
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

        {/* Toolbar & Excel Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Input Cepat via Spreadsheet Excel</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Unduh template standar, isi data faktur supplier, dan import otomatis ke formulir.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isExportingTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
            >
              {isExportingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download Template
            </button>
            <button
              type="button"
              onClick={handleImportExcel}
              disabled={isParsingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shadow-emerald-600/20"
            >
              {isParsingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Import dari Excel
            </button>
          </div>
        </div>

        {/* Header Information (Supplier & Invoice) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pemasok / Distributor *
            </label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
              <Building2 size={16} className="text-slate-400 mr-2 shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 dark:text-white p-0"
              >
                <option value="">-- Pilih Pemasok --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No. Faktur / Surat Jalan Supplier
            </label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20">
              <FileText size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="contoh: INV-KF-2026-881"
                className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-white font-mono p-0"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Barang & Batch Masuk ({lines.length} Baris)
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              <Plus size={15} /> Tambah Baris Manual
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Nama Produk / Obat</th>
                  <th className="py-2.5 px-3 w-28">Satuan</th>
                  <th className="py-2.5 px-3 w-24 text-center">Kuantitas</th>
                  <th className="py-2.5 px-3 w-32">Harga Beli Satuan</th>
                  <th className="py-2.5 px-3 w-32">No. Batch</th>
                  <th className="py-2.5 px-3 w-32">Kadaluarsa</th>
                  <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((line, idx) => {
                  const lineSubtotal = line.qty_received * line.price_per_unit;
                  const isUnmatched = !line.item_id;

                  return (
                    <tr key={line.id} className="bg-white dark:bg-slate-950 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                      {/* Product Selector */}
                      <td className="p-2.5 relative">
                        {line.item_id ? (
                          <div className="flex items-center justify-between group">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{line.item_name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveLineIdForSearch(line.id);
                                setSearchQuery('');
                              }}
                              className="text-[10px] font-bold text-brand hover:underline ml-2 cursor-pointer"
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
                              className="w-full text-left px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 flex items-center justify-between text-xs transition-colors cursor-pointer"
                            >
                              <span>{line.item_name || 'Cari / Pilih Barang...'}</span>
                              <Search size={14} />
                            </button>
                            {isUnmatched && line.item_name && (
                              <p className="text-[10px] text-amber-500 font-semibold mt-0.5 flex items-center gap-1">
                                <AlertTriangle size={10} /> Belum cocok di master
                              </p>
                            )}
                          </div>
                        )}

                        {/* Dropdown Popup */}
                        {activeLineIdForSearch === line.id && (
                          <div className="absolute left-2.5 top-12 z-30 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <Search size={14} className="text-slate-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Ketik nama produk atau SKU..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none"
                              />
                              <button onClick={() => setActiveLineIdForSearch(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                              {isSearching ? (
                                <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                                  <Loader2 size={14} className="animate-spin" /> Mencari item...
                                </div>
                              ) : searchResults.length === 0 ? (
                                <div className="p-3 text-center text-slate-400">
                                  {searchQuery.length < 2 ? 'Ketik minimal 2 huruf...' : 'Tidak ditemukan.'}
                                </div>
                              ) : (
                                searchResults.map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelectItem(line.id, item)}
                                    className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex justify-between items-center transition-colors cursor-pointer"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</p>
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
                      <td className="p-2.5">
                        {line.available_units.length > 0 ? (
                          <select
                            value={line.unit_id}
                            onChange={e => handleUnitChange(line.id, e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {line.available_units.map(u => (
                              <option key={u.id} value={u.id}>{u.unit_name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={line.unit_name || 'PCS'}
                            onChange={e => updateLine(line.id, 'unit_name', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none uppercase"
                          />
                        )}
                      </td>

                      {/* Qty */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={line.qty_received || ''}
                          onChange={e => updateLine(line.id, 'qty_received', parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </td>

                      {/* Cost Price */}
                      <td className="p-2.5">
                        <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                          <span className="text-[10px] text-slate-400 font-bold mr-1">Rp</span>
                          <input
                            type="number"
                            min="0"
                            value={line.price_per_unit || ''}
                            onChange={e => updateLine(line.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border-none outline-none text-right font-bold text-slate-900 dark:text-white font-mono p-0"
                          />
                        </div>
                      </td>

                      {/* Batch No */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="BATCH-..."
                          value={line.batch_no}
                          onChange={e => updateLine(line.id, 'batch_no', e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono outline-none"
                        />
                      </td>

                      {/* Expiry Date */}
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={line.expiry_date}
                          onChange={e => updateLine(line.id, 'expiry_date', e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="p-2.5 text-right font-bold font-mono text-slate-900 dark:text-white">
                        Rp {lineSubtotal.toLocaleString('id-ID')}
                      </td>

                      {/* Delete */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
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
    </Modal>
  );
}
