import { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle2, Cpu, Barcode, Zap, Sliders, Play, X, Check, Monitor, WifiOff, AlertTriangle, Network, Server } from 'lucide-react';
import { getSettings, setSetting, listPrinters, kickCashDrawer, printRawReceipt, DetectedPrinterInfo, getLanStatus, LanStatus } from '../../lib/api';
import { EscPosBuilder } from '../../lib/escpos';

export default function HardwareSettings() {

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [lanStatus, setLanStatus] = useState<LanStatus | null>(null);
  const [isTestingLan, setIsTestingLan] = useState(false);

  // Hardware config state (mirrored from DB via get_settings)
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [selectedPrinterPort, setSelectedPrinterPort] = useState('');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [printerCharsPerLine, setPrinterCharsPerLine] = useState(32);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(true);
  const [autoCutPaper, setAutoCutPaper] = useState(true);
  const [enableBarcodeSound, setEnableBarcodeSound] = useState(true);
  const [customerDisplay, setCustomerDisplay] = useState(false);

  // Template config state
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptAddress, setReceiptAddress] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  // Live detected printers from Windows OS via Tauri invoke
  const [detectedPrinters, setDetectedPrinters] = useState<DetectedPrinterInfo[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printersError, setPrintersError] = useState('');

  useEffect(() => {
    loadHardwareSettings();
    detectPrinters(); // Auto-detect on mount
  }, []);

  const loadHardwareSettings = async () => {
    try {
      const data = await getSettings();
      const pName = data.find(s => s.key === 'printer_name')?.value;
      const pPort = data.find(s => s.key === 'printer_port')?.value;
      const pWidth = data.find(s => s.key === 'printer_width')?.value;
      const pChars = data.find(s => s.key === 'printer_chars_per_line')?.value;
      const pDrawer = data.find(s => s.key === 'drawer_auto_open')?.value;
      const pCut = data.find(s => s.key === 'printer_autocut')?.value;
      const pBip = data.find(s => s.key === 'barcode_sound')?.value;
      const pDisp = data.find(s => s.key === 'customer_display')?.value;
      
      const rHeader = data.find(s => s.key === 'receipt_header')?.value;
      const rAddress = data.find(s => s.key === 'receipt_address')?.value;
      const rFooter = data.find(s => s.key === 'receipt_footer')?.value;

      if (pName) setSelectedPrinter(pName);
      if (pPort) setSelectedPrinterPort(pPort);
      if (pWidth === '58mm' || pWidth === '80mm') {
        setPaperWidth(pWidth);
        if (!pChars) setPrinterCharsPerLine(pWidth === '80mm' ? 48 : 32);
      }
      if (pChars) setPrinterCharsPerLine(parseInt(pChars, 10));
      if (pDrawer !== undefined) setAutoOpenDrawer(pDrawer === 'true');
      if (pCut !== undefined) setAutoCutPaper(pCut === 'true');
      if (pBip !== undefined) setEnableBarcodeSound(pBip === 'true');
      if (pDisp !== undefined) setCustomerDisplay(pDisp === 'true');

      if (rHeader) setReceiptHeader(rHeader);
      if (rAddress) setReceiptAddress(rAddress);
      if (rFooter) setReceiptFooter(rFooter);
    } catch (e) {
      console.error('Failed to load hardware settings:', e);
    }
  };

  const detectPrinters = async () => {
    setPrintersLoading(true);
    setPrintersError('');
    try {
      const [printers, lan] = await Promise.all([
        listPrinters().catch(() => []),
        getLanStatus().catch(() => null),
      ]);

      setLanStatus(lan);

      let allPrinters = [...printers];

      // If LAN parent is paired or child mode is enabled, add LAN Printer option
      if (lan?.paired_parent_ip || lan?.role === 'child') {
        const lanPrinterName = `[LAN] Printer & Laci Server Induk (${lan.paired_parent_name || lan.paired_parent_ip || 'Server'})`;
        const exists = allPrinters.some(p => p.Name.startsWith('[LAN]'));
        if (!exists) {
          allPrinters.unshift({
            Name: lanPrinterName,
            DriverName: 'LAN Remote Spooler',
            PortName: 'LAN:3699',
            Default: false,
            PrinterStatus: 0,
          });
        }
      }

      setDetectedPrinters(allPrinters);

      // Auto-select printer if nothing is saved yet
      if (!selectedPrinter && allPrinters.length > 0) {
        const defaultPrinter = allPrinters.find(p => p.Default) ?? allPrinters[0];
        setSelectedPrinter(defaultPrinter.Name);
        setSelectedPrinterPort(defaultPrinter.PortName);
      }
    } catch (e: any) {
      console.error('Printer detection failed:', e);
      setPrintersError(`Gagal mendeteksi printer: ${e?.message || String(e)}`);
    } finally {
      setPrintersLoading(false);
    }
  };

  // Update port when printer selection changes
  const handlePrinterChange = (printerName: string) => {
    setSelectedPrinter(printerName);
    const printer = detectedPrinters.find(p => p.Name === printerName);
    if (printer) setSelectedPrinterPort(printer.PortName);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await setSetting('printer_name', selectedPrinter);
      await setSetting('printer_port', selectedPrinterPort);
      await setSetting('printer_width', paperWidth);
      await setSetting('printer_chars_per_line', String(printerCharsPerLine));
      await setSetting('drawer_auto_open', String(autoOpenDrawer));
      await setSetting('printer_autocut', String(autoCutPaper));
      await setSetting('barcode_sound', String(enableBarcodeSound));
      await setSetting('customer_display', String(customerDisplay));
      
      await setSetting('receipt_header', receiptHeader);
      await setSetting('receipt_address', receiptAddress);
      await setSetting('receipt_footer', receiptFooter);

      setSuccessMsg('Pengaturan printer & hardware berhasil disimpan ke database!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(`Gagal menyimpan: ${e?.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      setErrorMsg('Pilih printer terlebih dahulu.');
      return;
    }
    setDrawerLoading(true);
    setErrorMsg('');
    try {
      const builder = new EscPosBuilder();
      
      // Use standard font
      
      // Header (Left Aligned)
      builder.align('left');
      builder.bold(true).textLine(receiptHeader || 'CHIRASYS ERP').bold(false);
      if (receiptAddress) builder.textLine(receiptAddress);
      builder.feed(1);
      
      // Body
      builder.drawLine(printerCharsPerLine, '-');
      builder.leftRight('1x ITEM UJI COBA A', '15.000', printerCharsPerLine);
      builder.leftRight('2x ITEM UJI COBA B', '30.000', printerCharsPerLine);
      builder.drawLine(printerCharsPerLine, '-');
      
      // Total
      builder.bold(true);
      builder.leftRight('TOTAL:', 'Rp 45.000', printerCharsPerLine);
      builder.bold(false);
      builder.leftRight('TUNAI:', 'Rp 50.000', printerCharsPerLine);
      builder.bold(true);
      builder.leftRight('KEMBALI:', 'Rp 5.000', printerCharsPerLine);
      builder.bold(false);
      builder.drawLine(printerCharsPerLine, '-');
      
      // Footer (Left Aligned)
      if (receiptFooter) builder.textLine(receiptFooter);
      builder.textLine('PRINTER THERMAL TERHUBUNG');
      builder.textLine('ChiraSys ERP & Cashier System');
      builder.feed(5);
      
      if (autoCutPaper) builder.cut();

      await printRawReceipt(selectedPrinter, builder.build());
      setSuccessMsg('Struk uji coba berhasil dikirim ke printer!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(`Gagal mencetak: ${e?.message || String(e)}`);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleTestDrawer = async () => {
    if (!selectedPrinter) {
      setErrorMsg('Pilih printer terlebih dahulu dan simpan konfigurasi sebelum menguji laci uang.');
      return;
    }
    setDrawerLoading(true);
    setErrorMsg('');
    try {
      const msg = await kickCashDrawer(selectedPrinter);
      setSuccessMsg(`🔔 Laci Uang: ${msg}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(`Gagal membuka laci: ${e?.message || String(e)}. Pastikan laci terhubung ke printer via RJ11.`);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Convert Windows PrinterStatus number to text
  const printerStatusLabel = (status: number) => {
    if (status === 0 || status === undefined) return { label: 'SIAP', color: 'emerald' };
    if (status === 1) return { label: 'MENCETAK', color: 'blue' };
    if (status === 4) return { label: 'OFFLINE', color: 'rose' };
    if (status === 8) return { label: 'BERHENTI', color: 'amber' };
    return { label: 'SIAP', color: 'emerald' };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      
      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700"><X size={16} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Column: Printer Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                  <Printer size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Printer Thermal Kasir</h2>
                  <p className="text-xs text-slate-500">Konfigurasi printer cetak struk nota fisik</p>
                </div>
              </div>
              <button
                onClick={detectPrinters}
                disabled={printersLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-brand hover:text-white dark:hover:bg-brand rounded-xl transition-all cursor-pointer"
                title="Pindai Ulang Printer Windows"
              >
                <RefreshCw size={13} className={printersLoading ? 'animate-spin' : ''} />
                <span>{printersLoading ? 'Mendeteksi...' : 'Pindai Perangkat'}</span>
              </button>
            </div>

            {/* Printer Selection — Live from Windows OS */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Printer Utama (Spooler Windows Terdeteksi)
              </label>
              {printersError ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-600 flex items-center gap-2">
                  <AlertTriangle size={14} /> {printersError}
                </div>
              ) : detectedPrinters.length === 0 && !printersLoading ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                  <WifiOff size={14} /> Tidak ada printer terdeteksi. Klik "Pindai Perangkat".
                </div>
              ) : (
                <select
                  value={selectedPrinter}
                  onChange={e => handlePrinterChange(e.target.value)}
                  disabled={printersLoading || detectedPrinters.length === 0}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                >
                  {detectedPrinters.map((p, idx) => (
                    <option key={idx} value={p.Name}>
                      {p.Name}{p.Default ? ' ★ (Default)' : ''} — Port: {p.PortName}
                    </option>
                  ))}
                </select>
              )}

              {/* Port display */}
              {selectedPrinterPort && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 pl-1">
                  <span className="text-brand">▸</span>
                  Port: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedPrinterPort}</span>
                  <span className="text-slate-400">(digunakan untuk kick cash drawer)</span>
                </div>
              )}
            </div>

            {/* Paper Size Selector */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ukuran Kertas Thermal Roll
                </label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setPaperWidth('80mm'); setPrinterCharsPerLine(48); }}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'bg-brand/10 border-brand text-brand shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-extrabold">80 mm (Standar POS Toko)</span>
                    <span className="text-[11px] opacity-75">Tampilan lebar, muat detail promo & logo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaperWidth('58mm'); setPrinterCharsPerLine(32); }}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'bg-brand/10 border-brand text-brand shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-extrabold">58 mm (Mini / Portable)</span>
                    <span className="text-[11px] opacity-75">Tampilan ringkas untuk printer Bluetooth/Mobile</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Karakter per Baris (Lebar Cetak)
                </label>
                <p className="text-[10px] text-slate-500 mb-2">Jika teks terpotong di kanan, kurangi angka ini (Standar: 80mm = 48, 58mm = 32). Beberapa printer 58mm butuh 30 atau 32.</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="24"
                    max="64"
                    value={printerCharsPerLine}
                    onChange={(e) => setPrinterCharsPerLine(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand"
                  />
                  <span className="text-sm font-bold w-12 text-center text-brand bg-brand/10 py-1 rounded-lg">{printerCharsPerLine}</span>
                </div>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {[
                { label: 'Potong Kertas Otomatis (Auto-Cut)', desc: 'Kirim perintah cutter otomatis setelah cetak selesai', val: autoCutPaper, set: setAutoCutPaper },
                { label: 'Buka Laci Uang Otomatis (Cash Drawer)', desc: 'Kirim sinyal pulsa RJ11 ke laci saat cetak pembayaran tunai', val: autoOpenDrawer, set: setAutoOpenDrawer },
                { label: 'Suara Beep Barcode Scanner', desc: 'Bunyi konfirmasi saat pemindaian barang berhasil', val: enableBarcodeSound, set: setEnableBarcodeSound },
              ].map(({ label, desc, val, set }) => (
                <div key={label} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set(!val)}
                    className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${val ? 'bg-brand justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestPrint}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={14} className="text-brand" /> Uji Coba Cetak Struk
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-brand hover:bg-blue-600 text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check size={16} /> {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Detected Printers + Accessories (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Detected Printers from Windows Spooler */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Status Koneksi Perangkat
                  {printersLoading && <span className="ml-2 text-[10px] font-normal text-slate-400 animate-pulse">Mendeteksi...</span>}
                </h3>
                <p className="text-xs text-slate-500">
                  {detectedPrinters.length > 0
                    ? `${detectedPrinters.length} printer terdeteksi di Windows Spooler`
                    : 'Perangkat terdeteksi di Windows OS'}
                </p>
              </div>
            </div>

            {printersLoading ? (
              <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
                <RefreshCw size={22} className="animate-spin" />
                <p className="text-xs">Memindai printer Windows...</p>
              </div>
            ) : detectedPrinters.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
                <WifiOff size={22} />
                <p className="text-xs text-center">Tidak ada printer terdeteksi.<br />Pastikan printer terhubung & driver terinstall.</p>
                <button onClick={detectPrinters} className="mt-1 text-xs font-bold text-brand hover:underline">Coba Lagi</button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {detectedPrinters.map((printer, idx) => {
                  const { label, color } = printerStatusLabel(printer.PrinterStatus);
                  const isSelected = printer.Name === selectedPrinter;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePrinterChange(printer.Name)}
                      className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-brand/5 border-brand/40 dark:border-brand/30'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-brand' : 'text-slate-800 dark:text-slate-200'}`}>{printer.Name}</p>
                          {printer.Default && (
                            <span className="text-[9px] font-extrabold bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">Default</span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Dipilih</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">Port: {printer.PortName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 px-2 py-1 rounded-full ${
                        color === 'emerald' ? 'text-emerald-600 bg-emerald-500/10' :
                        color === 'blue' ? 'text-blue-600 bg-blue-500/10' :
                        color === 'rose' ? 'text-rose-600 bg-rose-500/10' :
                        'text-amber-600 bg-amber-500/10'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          color === 'emerald' ? 'bg-emerald-500 animate-pulse' :
                          color === 'blue' ? 'bg-blue-500 animate-pulse' :
                          color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Perangkat Hardware Jaringan Lokal (LAN) */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Network size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Perangkat LAN (Printer & Laci Server Induk)</h3>
                <p className="text-xs text-slate-500">Cetak struk & buka laci melalui komputer server utama di jaringan</p>
              </div>
            </div>

            {lanStatus?.paired_parent_ip ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Server size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {lanStatus.paired_parent_name || 'Server Induk Kasir'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        IP: {lanStatus.paired_parent_ip}:{lanStatus.paired_parent_port || 3699}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terhubung
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsTestingLan(true);
                      try {
                        const msg = await kickCashDrawer(`[LAN] ${lanStatus.paired_parent_ip}`);
                        setSuccessMsg(`🔔 LAN Laci: ${msg}`);
                        setTimeout(() => setSuccessMsg(''), 4000);
                      } catch (err: any) {
                        setErrorMsg(`Gagal buka laci via LAN: ${err?.message || err}`);
                      } finally {
                        setIsTestingLan(false);
                      }
                    }}
                    disabled={isTestingLan}
                    className="flex-1 py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={13} /> Uji Buka Laci via LAN
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsTestingLan(true);
                      try {
                        const builder = new EscPosBuilder();
                        builder.align('center');
                        builder.bold(true).textLine('CHIRASYS - LAN TEST').bold(false);
                        builder.textLine('Uji coba cetak struk via LAN');
                        builder.textLine('Terminal Kasir Anak -> Server Induk');
                        builder.feed(3);
                        if (autoCutPaper) builder.cut();

                        await printRawReceipt(`[LAN] ${lanStatus.paired_parent_ip}`, builder.build());
                        setSuccessMsg('Struk uji coba berhasil dikirim dan dicetak pada printer Server Induk!');
                        setTimeout(() => setSuccessMsg(''), 4000);
                      } catch (err: any) {
                        setErrorMsg(`Gagal cetak via LAN: ${err?.message || err}`);
                      } finally {
                        setIsTestingLan(false);
                      }
                    }}
                    disabled={isTestingLan}
                    className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} className="text-brand" /> Uji Cetak via LAN
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <Network size={24} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {lanStatus?.role === 'parent'
                    ? 'Komputer ini disetel sebagai Server Induk. Printer fisik di komputer ini siap menerima cetak dari komputer klien.'
                    : 'Belum terhubung ke Server Induk. Buka tab "Jaringan Lokal (LAN)" untuk menghubungkan terminal ini ke komputer induk.'}
                </p>
              </div>
            )}
          </div>

          {/* POS Hardware Accessories */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Aksesori Hardware Kasir</h3>
                <p className="text-xs text-slate-500">Scanner, Laci Uang, & Customer Display</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Barcode Scanner — always HID, no config needed */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Barcode size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Barcode Scanner</p>
                    <p className="text-[10px] text-slate-400">USB HID / Bluetooth — Auto-read keyboard stream</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  AKTIF OTOMATIS
                </span>
              </div>

              {/* Cash Drawer RJ11 */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Laci Uang (Cash Drawer)</p>
                    <p className="text-[10px] text-slate-400">ESC/POS RJ11 via printer: {selectedPrinter || '(belum diset)'} <span className="text-brand font-semibold ml-1">Shortcut: Alt+C</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestDrawer}
                  disabled={drawerLoading || !selectedPrinter}
                  className="px-2.5 py-1 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {drawerLoading ? 'Mengirim...' : 'Tes Buka (F2)'}
                </button>
              </div>

              {/* Customer Display */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Customer Display (Pole)</p>
                    <p className="text-[10px] text-slate-400">Layar kedua untuk pelanggan (in development)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerDisplay(!customerDisplay)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${customerDisplay ? 'bg-brand justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>
          {/* Receipt Template Editor */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Template Struk (ESC/POS)</h3>
                <p className="text-xs text-slate-500">Sesuaikan header dan footer struk Anda</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Toko (Header)</label>
                <input 
                  type="text" 
                  value={receiptHeader} 
                  onChange={e => setReceiptHeader(e.target.value)} 
                  placeholder="Contoh: CHIRASYS ERP"
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Toko</label>
                <input 
                  type="text" 
                  value={receiptAddress} 
                  onChange={e => setReceiptAddress(e.target.value)} 
                  placeholder="Contoh: Jl. Sudirman No. 123"
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pesan Bawah (Footer)</label>
                <input 
                  type="text" 
                  value={receiptFooter} 
                  onChange={e => setReceiptFooter(e.target.value)} 
                  placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
