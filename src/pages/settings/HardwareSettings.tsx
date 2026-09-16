import { useState, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle2, Cpu, Barcode, Zap, Sliders, Play, X, Check, Monitor, WifiOff, AlertTriangle, Network, Server, ChevronRight } from 'lucide-react';
import { getSettings, setSetting, listPrinters, kickCashDrawer, printRawReceipt, DetectedPrinterInfo, getLanStatus, LanStatus } from '../../lib/api';
import { EscPosBuilder } from '../../lib/escpos';

import Select from '../../components/ui/Select';
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
      builder.bold(true).textLine(receiptHeader || 'KIVO ERP').bold(false);
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
      builder.textLine('Kivo POS & Business Platform');
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
      setSuccessMsg(`Laci Uang: ${msg}`);
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
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-4 bg-success-soft border border-success/30 text-success rounded-xl dark:bg-success/20 dark:border-success dark:text-success flex items-center justify-between animate-fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-success hover:text-success"><X size={16} /></button>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-danger-soft border border-danger/30 text-danger rounded-xl dark:bg-danger/20 dark:border-danger dark:text-danger flex items-center justify-between animate-fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-danger hover:text-danger"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Column: Printer Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-card rounded-xl border border-line p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-soft text-primary rounded-xl">
                  <Printer size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-heading">Printer Thermal Kasir</h2>
                  <p className="text-xs text-dim">Konfigurasi printer cetak struk nota fisik</p>
                </div>
              </div>
              <button
                onClick={detectPrinters}
                disabled={printersLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-body bg-muted hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl transition-all cursor-pointer"
                title="Pindai Ulang Printer Windows"
              >
                <RefreshCw size={13} className={printersLoading ? 'animate-spin' : ''} />
                <span>{printersLoading ? 'Mendeteksi...' : 'Pindai Perangkat'}</span>
              </button>
            </div>

            {/* Printer Selection — Live from Windows OS */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-dim">
                Printer Utama (Spooler Windows Terdeteksi)
              </label>
              {printersError ? (
                <div className="p-3 bg-danger-soft dark:bg-danger/20 border border-danger/30 dark:border-danger rounded-xl text-xs text-danger flex items-center gap-2">
                  <AlertTriangle size={14} /> {printersError}
                </div>
              ) : detectedPrinters.length === 0 && !printersLoading ? (
                <div className="p-3 bg-muted/60 border border-line rounded-xl text-xs text-dim flex items-center gap-2">
                  <WifiOff size={14} /> Tidak ada printer terdeteksi. Klik "Pindai Perangkat".
                </div>
              ) : (
                <Select
                  value={selectedPrinter}
                  onChange={v => handlePrinterChange(v)}
                  disabled={printersLoading || detectedPrinters.length === 0}
                  className="w-full bg-muted border border-line rounded-xl px-4 py-3 text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                >
                  {detectedPrinters.map((p, idx) => (
                    <option key={idx} value={p.Name}>
                      {p.Name}{p.Default ? ' [Default]' : ''} — Port: {p.PortName}
                    </option>
                  ))}
                </Select>
              )}

              {/* Port display */}
              {selectedPrinterPort && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-dim pl-1">
                  <ChevronRight size={13} className="text-primary shrink-0" />
                  Port: <span className="font-bold text-heading">{selectedPrinterPort}</span>
                  <span className="text-dim">(digunakan untuk kick cash drawer)</span>
                </div>
              )}
            </div>

            {/* Paper Size Selector */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dim">
                  Ukuran Kertas Thermal Roll
                </label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setPaperWidth('80mm'); setPrinterCharsPerLine(48); }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                      paperWidth === '80mm'
                        ? 'bg-primary-soft border-primary text-primary shadow-sm'
                        : 'bg-muted/50 border-line text-body hover:border-line-strong'
                    }`}
                  >
                    <span className="text-sm font-extrabold">80 mm (Standar POS Toko)</span>
                    <span className="text-[11px] opacity-75">Tampilan lebar, muat detail promo & logo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaperWidth('58mm'); setPrinterCharsPerLine(32); }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${
                      paperWidth === '58mm'
                        ? 'bg-primary-soft border-primary text-primary shadow-sm'
                        : 'bg-muted/50 border-line text-body hover:border-line-strong'
                    }`}
                  >
                    <span className="text-sm font-extrabold">58 mm (Mini / Portable)</span>
                    <span className="text-[11px] opacity-75">Tampilan ringkas untuk printer Bluetooth/Mobile</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-dim">
                  Karakter per Baris (Lebar Cetak)
                </label>
                <p className="text-[10px] text-dim mb-2">Jika teks terpotong di kanan, kurangi angka ini (Standar: 80mm = 48, 58mm = 32). Beberapa printer 58mm butuh 30 atau 32.</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="24"
                    max="64"
                    value={printerCharsPerLine}
                    onChange={(e) => setPrinterCharsPerLine(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-line rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-sm font-bold w-12 text-center text-primary bg-primary-soft py-1 rounded-lg">{printerCharsPerLine}</span>
                </div>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-3 pt-2 border-t border-line">
              {[
                { label: 'Potong Kertas Otomatis (Auto-Cut)', desc: 'Kirim perintah cutter otomatis setelah cetak selesai', val: autoCutPaper, set: setAutoCutPaper },
                { label: 'Buka Laci Uang Otomatis (Cash Drawer)', desc: 'Kirim sinyal pulsa RJ11 ke laci saat cetak pembayaran tunai', val: autoOpenDrawer, set: setAutoOpenDrawer },
                { label: 'Suara Beep Barcode Scanner', desc: 'Bunyi konfirmasi saat pemindaian barang berhasil', val: enableBarcodeSound, set: setEnableBarcodeSound },
              ].map(({ label, desc, val, set }) => (
                <div key={label} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-bold text-heading">{label}</p>
                    <p className="text-xs text-dim">{desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set(!val)}
                    className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${val ? 'bg-primary justify-end' : 'bg-line-strong dark:bg-line-strong justify-start'}`}
                  >
                    <div className="w-5 h-5 bg-card rounded-full shadow-md" />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={handleTestPrint}
                className="flex-1 py-3 px-4 bg-muted hover:bg-line dark:hover:bg-line-strong text-heading font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={14} className="text-primary" /> Uji Coba Cetak Struk
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check size={16} /> {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Detected Printers + Accessories (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Detected Printers from Windows Spooler */}
          <div className="bg-card rounded-xl border border-line p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="p-2.5 bg-success/10 text-success rounded-xl">
                <Cpu size={18} />
              </div>
              <div>
                <h3 className="font-bold text-heading text-sm">
                  Status Koneksi Perangkat
                  {printersLoading && <span className="ml-2 text-[10px] font-normal text-dim animate-pulse">Mendeteksi...</span>}
                </h3>
                <p className="text-xs text-dim">
                  {detectedPrinters.length > 0
                    ? `${detectedPrinters.length} printer terdeteksi di Windows Spooler`
                    : 'Perangkat terdeteksi di Windows OS'}
                </p>
              </div>
            </div>

            {printersLoading ? (
              <div className="py-6 flex flex-col items-center gap-2 text-dim">
                <RefreshCw size={22} className="animate-spin" />
                <p className="text-xs">Memindai printer Windows...</p>
              </div>
            ) : detectedPrinters.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-dim">
                <WifiOff size={22} />
                <p className="text-xs text-center">Tidak ada printer terdeteksi.<br />Pastikan printer terhubung & driver terinstall.</p>
                <button onClick={detectPrinters} className="mt-1 text-xs font-bold text-primary hover:underline">Coba Lagi</button>
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
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-primary-soft border-primary/40 dark:border-primary/30'
                          : 'bg-muted/60 border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-heading'}`}>{printer.Name}</p>
                          {printer.Default && (
                            <span className="text-[9px] font-extrabold bg-primary-soft text-primary px-1.5 py-0.5 rounded uppercase">Default</span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-extrabold bg-success/10 text-success px-1.5 py-0.5 rounded uppercase">Dipilih</span>
                          )}
                        </div>
                        <p className="text-[10px] text-dim font-mono mt-0.5 truncate">Port: {printer.PortName}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 px-2 py-1 rounded-full ${
                        color === 'emerald' ? 'text-success bg-success/10' :
                        color === 'blue' ? 'text-accent bg-accent/10' :
                        color === 'rose' ? 'text-danger bg-danger/10' :
                        'text-warning bg-warning/10'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          color === 'emerald' ? 'bg-success animate-pulse' :
                          color === 'blue' ? 'bg-accent animate-pulse' :
                          color === 'rose' ? 'bg-danger' : 'bg-warning'
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
          <div className="bg-card rounded-xl border border-line p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="p-2.5 bg-primary-soft text-primary rounded-xl">
                <Network size={18} />
              </div>
              <div>
                <h3 className="font-bold text-heading text-sm">Perangkat LAN (Printer & Laci Server Induk)</h3>
                <p className="text-xs text-dim">Cetak struk & buka laci melalui komputer server utama di jaringan</p>
              </div>
            </div>

            {lanStatus?.paired_parent_ip ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-success-soft/50 dark:bg-success/20 rounded-xl border border-success/30 dark:border-success/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 text-success dark:text-success rounded-xl">
                      <Server size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-heading">
                        {lanStatus.paired_parent_name || 'Server Induk Kasir'}
                      </p>
                      <p className="text-[10px] text-dim font-mono">
                        IP: {lanStatus.paired_parent_ip}:{lanStatus.paired_parent_port || 3699}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-success dark:text-success bg-success-soft dark:bg-success/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Terhubung
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsTestingLan(true);
                      try {
                        const msg = await kickCashDrawer(`[LAN] ${lanStatus.paired_parent_ip}`);
                        setSuccessMsg(`LAN Laci: ${msg}`);
                        setTimeout(() => setSuccessMsg(''), 4000);
                      } catch (err: any) {
                        setErrorMsg(`Gagal buka laci via LAN: ${err?.message || err}`);
                      } finally {
                        setIsTestingLan(false);
                      }
                    }}
                    disabled={isTestingLan}
                    className="flex-1 py-2.5 px-3 bg-primary-soft dark:bg-primary/40 hover:bg-primary-soft text-primary-hover dark:text-primary font-bold text-xs rounded-xl border border-primary/30 dark:border-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
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
                        builder.bold(true).textLine('KIVO - LAN TEST').bold(false);
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
                    className="flex-1 py-2.5 px-3 bg-muted hover:bg-line text-heading font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} className="text-primary" /> Uji Cetak via LAN
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/40 rounded-xl border border-line text-center space-y-2">
                <Network size={24} className="mx-auto text-dim" />
                <p className="text-xs text-body font-medium">
                  {lanStatus?.role === 'parent'
                    ? 'Komputer ini disetel sebagai Server Induk. Printer fisik di komputer ini siap menerima cetak dari komputer klien.'
                    : 'Belum terhubung ke Server Induk. Buka tab "Jaringan Lokal (LAN)" untuk menghubungkan terminal ini ke komputer induk.'}
                </p>
              </div>
            )}
          </div>

          {/* POS Hardware Accessories */}
          <div className="bg-card rounded-xl border border-line p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="p-2.5 bg-primary-soft text-primary rounded-xl">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="font-bold text-heading text-sm">Aksesori Hardware Kasir</h3>
                <p className="text-xs text-dim">Scanner, Laci Uang, & Customer Display</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Barcode Scanner — always HID, no config needed */}
              <div className="p-3.5 bg-muted/60 rounded-xl border border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 text-accent rounded-xl">
                    <Barcode size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-heading">Barcode Scanner</p>
                    <p className="text-[10px] text-dim">USB HID / Bluetooth — Auto-read keyboard stream</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">
                  AKTIF OTOMATIS
                </span>
              </div>

              {/* Cash Drawer RJ11 */}
              <div className="p-3.5 bg-muted/60 rounded-xl border border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 text-success rounded-xl">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-heading">Laci Uang (Cash Drawer)</p>
                    <p className="text-[10px] text-dim">ESC/POS RJ11 via printer: {selectedPrinter || '(belum diset)'} <span className="text-primary font-semibold ml-1">Shortcut: Alt+C</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestDrawer}
                  disabled={drawerLoading || !selectedPrinter}
                  className="px-2.5 py-1 text-[10px] font-bold text-primary bg-primary-soft hover:bg-primary hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {drawerLoading ? 'Mengirim...' : 'Tes Buka (F2)'}
                </button>
              </div>

              {/* Customer Display */}
              <div className="p-3.5 bg-muted/60 rounded-xl border border-line flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-soft text-primary rounded-xl">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-heading">Customer Display (Pole)</p>
                    <p className="text-[10px] text-dim">Layar kedua untuk pelanggan (in development)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerDisplay(!customerDisplay)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${customerDisplay ? 'bg-primary justify-end' : 'bg-line-strong dark:bg-line-strong justify-start'}`}
                >
                  <div className="w-4 h-4 bg-card rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>
          {/* Receipt Template Editor */}
          <div className="bg-card rounded-xl border border-line p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="font-bold text-heading text-sm">Template Struk (ESC/POS)</h3>
                <p className="text-xs text-dim">Sesuaikan header dan footer struk Anda</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-heading">Nama Toko (Header)</label>
                <input 
                  type="text" 
                  value={receiptHeader} 
                  onChange={e => setReceiptHeader(e.target.value)} 
                  placeholder="Contoh: KIVO MART"
                  className="w-full mt-1 bg-muted border border-line rounded-xl px-3 py-2 text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-heading">Alamat Toko</label>
                <input 
                  type="text" 
                  value={receiptAddress} 
                  onChange={e => setReceiptAddress(e.target.value)} 
                  placeholder="Contoh: Jl. Sudirman No. 123"
                  className="w-full mt-1 bg-muted border border-line rounded-xl px-3 py-2 text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-heading">Pesan Bawah (Footer)</label>
                <input 
                  type="text" 
                  value={receiptFooter} 
                  onChange={e => setReceiptFooter(e.target.value)} 
                  placeholder="Contoh: Terima kasih atas kunjungan Anda!"
                  className="w-full mt-1 bg-muted border border-line rounded-xl px-3 py-2 text-sm font-semibold text-heading outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
