// src/pages/pos/POS.tsx — Full keyboard-driven POS with Indonesian UI
import { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, Search, Plus, Minus, Trash2, Clock, UserCheck, PauseCircle, PlayCircle, Loader2, HelpCircle, Edit2, Check, X as XIcon, Crown } from 'lucide-react';
import { usePosStore, PosLine, PosHold } from './POSStore';
import { getItemsFiltered, Item, Customer, getSettings } from '../../lib/api';
import { applyDiscountsToCart } from '../../lib/discountEngine';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';
import CustomerPickerModal from './CustomerPickerModal';
import SalesHistoryModal from './SalesHistoryModal';
import TourGuide from '../../components/ui/TourGuide';
import { useGlobalArrowNav } from '../../hooks/useGlobalArrowNav';

export default function POS() {
  useGlobalArrowNav();

  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<PosLine[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [search, setSearch] = useState('');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
<<<<<<< Updated upstream
=======
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Grand Total Override states
  const [customGrandTotal, setCustomGrandTotal] = useState<number | null>(null);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [customTotalInput, setCustomTotalInput] = useState('');

  // Tax & Member Discount settings
>>>>>>> Stashed changes
  const [taxMode, setTaxMode] = useState<string>('none');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [tierMemberDiscount, setTierMemberDiscount] = useState<number>(0);
  const [tierVipDiscount, setTierVipDiscount] = useState<number>(0);

  // Selected cart item index for keyboard navigation & price editing
  const [selectedCartIdx, setSelectedCartIdx] = useState<number>(-1);
  const [editingPriceIdx, setEditingPriceIdx] = useState<number>(-1);
  const [editingPriceVal, setEditingPriceVal] = useState<string>('');

  // Arrow Key Navigation Refs
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cartItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const priceEditInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  
  // Tour State
  const [runTour, setRunTour] = useState(false);
  const posTourSteps = [
    {
      target: '.tour-pos-search',
      content: 'Ketik nama barang atau scan barcode di sini. Tekan Enter untuk langsung memasukkan barang ke keranjang.',
      disableBeacon: true,
    },
    {
      target: '.tour-pos-cart',
      content: 'Daftar barang belanjaan akan muncul di sini. Anda bisa mengubah jumlah atau harga per item. Tekan Alt+H untuk edit harga item yang dipilih.',
    },
    {
      target: '.tour-pos-customer',
      content: 'Pilih pelanggan jika ini adalah pelanggan terdaftar. Ini akan mengaktifkan harga khusus member jika ada.',
    },
    {
      target: '.tour-pos-payment',
      content: 'Klik Bayar (F10 / End) untuk memproses pembayaran dan mencetak struk.',
    }
  ];

  const searchInputRef = useRef<HTMLInputElement>(null);
  const holds = usePosStore(state => state.holds);
  const addHold = usePosStore(state => state.addHold);
  const removeHold = usePosStore(state => state.removeHold);

  useEffect(() => {
    getSettings().then(settings => {
      const mode = settings.find(s => s.key === 'tax_mode')?.value || 'none';
      const rate = parseFloat(settings.find(s => s.key === 'tax_rate')?.value || '0');
      const memberDisc = parseFloat(settings.find(s => s.key === 'tier_member_discount')?.value || '0');
      const vipDisc = parseFloat(settings.find(s => s.key === 'tier_vip_discount')?.value || '0');
      setTaxMode(mode);
      setTaxRate(rate);
      setTierMemberDiscount(memberDisc);
      setTierVipDiscount(vipDisc);
    }).catch(console.error);
  }, []);

  // Hardware Barcode Scanner Hook
  useBarcodeScanner(async (barcode) => {
    if (showPayment || showCustomerPicker || receiptSaleId) return;
    
    // Check locally first
    const exact = items.find(i => i.sku === barcode || i.barcode === barcode);
    if (exact) {
      addToCart(exact);
      setSearch('');
    } else {
      // Fetch from DB if not in current view
      setLoading(true);
      try {
        const res = await getItemsFiltered(barcode, '', '', true, 1, 5);
        const match = res.items.find(i => i.sku === barcode || i.barcode === barcode);
        if (match) {
          addToCart(match);
          setSearch('');
        } else {
          setSearch(barcode); // Just show it in the search bar if not found
        }
      } finally {
        setLoading(false);
      }
    }
  });

  // Start price editing for current selected cart item
  const startEditPrice = useCallback((idx: number) => {
    if (idx < 0 || idx >= cart.length) return;
    const line = cart[idx];
    if (line.is_bogo_free) return;
    setEditingPriceIdx(idx);
    setEditingPriceVal(line.price.toString());
    setSelectedCartIdx(idx);
    setTimeout(() => priceEditInputRef.current?.focus(), 50);
  }, [cart]);

  const commitPriceEdit = useCallback(() => {
    const newPrice = parseFloat(editingPriceVal);
    if (!isNaN(newPrice) && newPrice >= 0 && editingPriceIdx >= 0) {
      setCart(prev => prev.map((l, i) => i === editingPriceIdx ? { ...l, price: newPrice } : l));
    }
    setEditingPriceIdx(-1);
    setEditingPriceVal('');
  }, [editingPriceVal, editingPriceIdx]);

  const cancelPriceEdit = useCallback(() => {
    setEditingPriceIdx(-1);
    setEditingPriceVal('');
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isInModalInput = showPayment || showCustomerPicker || receiptSaleId || showHistory;
      
      // Price edit commits
      if (editingPriceIdx >= 0) {
        if (e.key === 'Enter') { e.preventDefault(); commitPriceEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelPriceEdit(); }
        return;
      }

      // Alt+H → edit price of selected cart item
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        if (!isInModalInput && selectedCartIdx >= 0) {
          startEditPrice(selectedCartIdx);
        } else if (!isInModalInput && cart.length > 0) {
          startEditPrice(cart.length - 1);
          setSelectedCartIdx(cart.length - 1);
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          break;
        case 'F3':
          e.preventDefault();
          if (!showPayment) setShowCustomerPicker(true);
          break;
        case 'F4':
          e.preventDefault();
          if (cart.length > 0 && !showPayment) handleHold();
          break;
        case 'F5':
          e.preventDefault();
          if (holds.length > 0 && !showPayment) handleResume(holds[0]);
          break;
        case 'F9':
          e.preventDefault();
          if (!showPayment && cart.length > 0 && confirm('Batalkan transaksi ini?')) {
            setCart([]);
            setCartDiscount(0);
            setSelectedCartIdx(-1);
          }
          break;
        case 'F10':
          e.preventDefault();
          if (cart.length > 0 && !showPayment) setShowPayment(true);
          break;
        case 'End':
          e.preventDefault();
          if (cart.length > 0 && !showPayment && !isInModalInput) setShowPayment(true);
          break;
        case 'F11':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          break;
        case 'F12':
          e.preventDefault();
          if (cart.length > 0 && !showPayment) {
            setCart(prev => prev.slice(0, -1));
            setSelectedCartIdx(prev => Math.max(-1, prev - 1));
          }
          break;
        case 'Escape':
          if (showPayment) setShowPayment(false);
          if (showCustomerPicker) setShowCustomerPicker(false);
          if (receiptSaleId) setReceiptSaleId(null);
          break;
        // Arrow navigation in cart when search is empty
        case 'ArrowDown':
          if (search.length < 2 && cart.length > 0 && !isInModalInput) {
            e.preventDefault();
            const next = Math.min(selectedCartIdx + 1, cart.length - 1);
            setSelectedCartIdx(next);
            cartItemRefs.current[next]?.focus();
          }
          break;
        case 'ArrowUp':
          if (search.length < 2 && cart.length > 0 && !isInModalInput) {
            e.preventDefault();
            const prev = Math.max(selectedCartIdx - 1, 0);
            setSelectedCartIdx(prev);
            cartItemRefs.current[prev]?.focus();
          }
          break;
        case '+':
        case '=':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModalInput) {
            e.preventDefault();
            const line = cart[selectedCartIdx];
            if (line && !line.is_bogo_free) updateQty(line.item_id, 1);
          }
          break;
        case '-':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModalInput) {
            e.preventDefault();
            const line = cart[selectedCartIdx];
            if (line && !line.is_bogo_free) updateQty(line.item_id, -1);
          }
          break;
        case 'Delete':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModalInput) {
            e.preventDefault();
            const line = cart[selectedCartIdx];
            if (line && !line.is_bogo_free) {
              removeItem(line.item_id);
              setSelectedCartIdx(prev => Math.max(0, prev - 1));
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [cart, holds, showPayment, showCustomerPicker, receiptSaleId, showHistory, search, selectedCartIdx, editingPriceIdx, editingPriceVal, startEditPrice, commitPriceEdit, cancelPriceEdit]);

  // Auto-focus search on non-input clicks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
      searchInputRef.current?.focus();
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Search items
  useEffect(() => {
    const fetchSearch = async () => {
      if (search.length < 2) { setItems([]); return; }
      setLoading(true);
      try {
        const result = await getItemsFiltered(search, '', '', true, 1, 20);
        setItems(result.items);
      } finally { setLoading(false); }
    };
    const timer = setTimeout(fetchSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Apply discounts
  useEffect(() => {
    if (cart.length === 0) { setCartDiscount(0); return; }
    const linesForEngine = cart.map((l, i) => ({
      item_id: l.item_id, unit_id: l.unit_id, category_id: undefined,
      qty: l.qty, price: l.price, line_index: i
    }));
    applyDiscountsToCart(linesForEngine, selectedCustomer?.customer_tier, async (result) => {
      setCartDiscount(result.cart_discount);
      let needsUpdate = false;
      let newCart = [...cart];
      const itemsToAdd: PosLine[] = [];

      for (const lineDisc of result.line_discounts) {
        if (!lineDisc.is_bogo_free_item) {
          if (newCart[lineDisc.line_index] && newCart[lineDisc.line_index].discount_amount !== lineDisc.discount_amount) {
            newCart[lineDisc.line_index].discount_amount = lineDisc.discount_amount;
            needsUpdate = true;
          }
        } else {
          const existingFreeIdx = newCart.findIndex(l => l.is_bogo_free && l.item_id === (lineDisc.free_item_id || newCart[lineDisc.line_index]?.item_id));
          if (existingFreeIdx >= 0) {
            if (newCart[existingFreeIdx].qty !== lineDisc.free_item_qty) {
              newCart[existingFreeIdx].qty = lineDisc.free_item_qty;
              needsUpdate = true;
            }
          } else {
            const parentLine = newCart[lineDisc.line_index];
            if (parentLine) {
              itemsToAdd.push({
                item_id: lineDisc.free_item_id || parentLine.item_id,
                item_name: parentLine.item_name,
                unit_id: lineDisc.free_item_unit_id || parentLine.unit_id,
                unit_name: parentLine.unit_name,
                qty: lineDisc.free_item_qty,
                price_type: parentLine.price_type,
                price: parentLine.price,
                discount_amount: parentLine.price * lineDisc.free_item_qty,
                hpp_value: parentLine.hpp_value,
                is_bogo_free: true,
              });
              needsUpdate = true;
            }
          }
        }
      }

      const freeItemCount = newCart.filter(l => l.is_bogo_free).length;
      if (freeItemCount > result.line_discounts.filter(d => d.is_bogo_free_item).length) {
        newCart = newCart.filter(l => !l.is_bogo_free);
        needsUpdate = true;
      }
      if (itemsToAdd.length > 0) { newCart = [...newCart, ...itemsToAdd]; }

      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].price > 0 && !result.line_discounts.find(d => d.line_index === i && !d.is_bogo_free_item)) {
          if (newCart[i].discount_amount !== 0) { newCart[i].discount_amount = 0; needsUpdate = true; }
        }
      }
      if (needsUpdate) setCart(newCart);
    });
  }, [cart.map(l => `${l.item_id}-${l.qty}-${l.price}`).join('|'), selectedCustomer?.customer_tier]);

  const handleBarcodeEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search) {
      if (items.length === 1) { addToCart(items[0]); setSearch(''); }
      else {
        const exact = items.find(i => i.sku === search || i.barcode === search);
        if (exact) { addToCart(exact); setSearch(''); }
      }
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    }
  };

  const addToCart = (item: Item) => {
    setCart(prev => {
      const exists = prev.find(l => l.item_id === item.id && !l.is_bogo_free);
      if (exists) return prev.map(l => (l.item_id === item.id && !l.is_bogo_free) ? { ...l, qty: l.qty + 1 } : l);
      const price = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
      return [...prev, {
        item_id: item.id, item_name: item.name,
        unit_id: item.base_unit_id || 'unknown', unit_name: item.base_unit_name || 'Unit',
        qty: 1, price_type: priceType, price, discount_amount: 0, hpp_value: item.avg_hpp || 0
      }];
    });
    // Select the last item added
    setSelectedCartIdx(cart.length); // will be updated after state settles
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(l => {
      if (l.item_id === itemId && !l.is_bogo_free) {
        const newQty = l.qty + delta;
        return newQty > 0 ? { ...l, qty: newQty } : l;
      }
      return l;
    }));
  };

  const removeItem = (itemId: string) => setCart(prev => prev.filter(l => !(l.item_id === itemId && !l.is_bogo_free)));

  const rawSubtotal = cart.reduce((sum, l) => sum + (l.qty * l.price) - l.discount_amount, 0) - cartDiscount;
  
  // Calculate tier discount
  let currentTierDiscountPercent = 0;
  if (selectedCustomer?.customer_tier === 'member') currentTierDiscountPercent = tierMemberDiscount;
  if (selectedCustomer?.customer_tier === 'vip') currentTierDiscountPercent = tierVipDiscount;
  
  const tierDiscountAmount = rawSubtotal * (currentTierDiscountPercent / 100);
  const subtotal = rawSubtotal - tierDiscountAmount;
  
  const taxAmount = taxMode === 'exclude' ? subtotal * (taxRate / 100) : (taxMode === 'include' ? subtotal * (1 - 1 / (1 + taxRate / 100)) : 0);
  const total = taxMode === 'exclude' ? subtotal + taxAmount : subtotal;

  const handleHold = () => {
    if (cart.length === 0) return;
    addHold({ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString('id-ID'), lines: cart, price_type: priceType, total });
    setCart([]); setCartDiscount(0); setSelectedCartIdx(-1);
  };

  const handleResume = (hold: PosHold) => {
    setCart(hold.lines); setPriceType(hold.price_type); removeHold(hold.id);
    setSelectedCartIdx(-1);
  };

  const handlePaymentSuccess = (saleId: string, print: boolean) => {
    setCart([]); setCartDiscount(0); setSearch(''); setShowPayment(false);
    setSelectedCartIdx(-1);
<<<<<<< Updated upstream
    if (print) setReceiptSaleId(saleId);
=======
    
    // Immediately refresh POS catalog stock and trigger real-time sync for all components
    fetchItems();
    window.dispatchEvent(new CustomEvent('chirasys:sync', { detail: { source: 'local_sale', table: 'sales' } }));

    if (print) {
      setReceiptSaleId(saleId);
    } else {
      getSettings().then(settings => {
        const pName = settings.find(s => s.key === 'printer_name')?.value;
        if (pName) {
          kickCashDrawer(pName).catch((err: unknown) => console.error("Drawer kick failed", err));
        }
      }).catch(console.error);
    }
>>>>>>> Stashed changes
  };

  const TIER_LABEL: Record<string, string> = { regular: 'Regular', member: 'Member', vip: 'VIP' };

  return (
<<<<<<< Updated upstream
    <div className="flex h-full w-full bg-slate-100 dark:bg-[#0B0F19] p-3 gap-3 animate-in fade-in">
      {/* LEFT: Item Search */}
      <div className="flex-[2] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-w-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 shrink-0">
=======
    <div className="flex flex-col md:flex-row h-full w-full bg-muted p-1 sm:p-3 gap-2 sm:gap-3 animate-fade-in select-none relative overflow-hidden">
      
      {/* ─── LEFT: CATALOG & OMNICHANNEL SEARCH SECTION ─── */}
      <div className="flex-1 flex flex-col bg-card rounded-xl shadow-sm border border-line overflow-hidden min-w-0">
        
        {/* Top Control Bar */}
        <div className="p-3.5 border-b border-line flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-muted/50 dark:bg-card/30 shrink-0">
          
          {/* Main Search Box */}
>>>>>>> Stashed changes
          <div className="flex-1 relative tour-pos-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode atau ketik nama obat... (F1/F2)"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-900 dark:text-white placeholder-slate-400"
              autoFocus
            />
          </div>
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setPriceType('retail')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand ${priceType === 'retail' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Eceran</button>
            <button onClick={() => setPriceType('wholesale')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-brand ${priceType === 'wholesale' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Grosir</button>
          </div>
          <button onClick={() => setRunTour(true)} className="p-2.5 text-slate-500 hover:text-brand hover:bg-brand/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand" title="Bantuan & Panduan">
            <HelpCircle size={20} />
          </button>
        </div>

<<<<<<< Updated upstream
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {search.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none">
              <ShoppingCart size={48} className="mb-3 opacity-20" />
              <p className="text-sm">Scan barcode atau ketik nama obat</p>
              <p className="text-xs mt-1 text-slate-400">Tekan F1/F2 untuk fokus pencarian</p>
              {cart.length > 0 && (
                <p className="text-xs mt-3 text-brand/70 bg-brand/5 px-3 py-1.5 rounded-lg border border-brand/10">
                  ↑↓ Navigasi keranjang · ±/- Ubah qty · Alt+H Edit harga · Del Hapus
                </p>
              )}
=======
        {/* Category Quick Pills */}
        <div className="px-3 py-2 border-b border-line/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-card select-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-muted/70 hover:bg-muted text-body hover:text-heading border border-line/40'
            }`}
          >
            Semua Produk
          </button>
          {Array.from(new Map(categories.map(c => [c.name.trim().toUpperCase(), c])).values()).map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-muted/70 hover:bg-muted text-body hover:text-heading border border-line/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Catalog Items Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar tour-pos-catalog">
          {loading ? (
            <div className="h-full flex flex-col justify-center items-center gap-2.5">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="text-xs text-dim font-bold">Memuat data produk...</span>
>>>>>>> Stashed changes
            </div>
          ) : loading ? (
            <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-brand" size={28} /></div>
          ) : items.length === 0 ? (
<<<<<<< Updated upstream
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={36} className="mb-2 opacity-30" />
              <p className="text-sm">Tidak ada produk ditemukan</p>
=======
            <div className="h-full flex flex-col items-center justify-center text-dim p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center text-dim mb-3 border border-line/80 dark:border-line-strong/80">
                <Search size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-bold text-heading">Tidak ada produk ditemukan</p>
              <p className="text-xs text-dim mt-1">Coba pilih kategori lain atau ubah kata kunci pencarian.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
              {items.map((item, idx) => {
                const activePrice = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
                return (
                  <button
                    key={item.id}
                    ref={el => { itemRefs.current[idx] = el; }}
                    onClick={() => addToCart(item)}
                    className="flex flex-col text-left bg-card border border-line/90 dark:border-line rounded-xl p-3.5 hover:border-primary hover:shadow-md hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition-all group cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-[10px] font-mono font-bold text-dim bg-muted px-1.5 py-0.5 rounded-lg truncate max-w-[120px]">
                        {item.sku}
                      </span>
                      {item.current_stock !== undefined && (
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 font-mono ${
                          item.current_stock > 0
                            ? 'text-success bg-success-soft dark:bg-success/40 dark:text-success border border-success/30 dark:border-success/40'
                            : item.current_stock === 0
                            ? 'text-body bg-muted dark:text-body border border-line'
                            : 'text-danger bg-danger-soft dark:bg-danger/40 dark:text-danger border border-danger/30 dark:border-danger/40 font-black'
                        }`}>
                          Stok: {item.current_stock}
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-xs text-heading line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1.5">
                      {item.name}
                    </h4>

                    {item.category_name && (
                      <span className="text-[10px] text-dim mb-2 truncate">
                        {item.category_name}
                      </span>
                    )}

                    <div className="mt-auto pt-2 border-t border-line flex items-center justify-between">
                      <span className="font-black text-primary text-xs sm:text-sm font-mono">
                        Rp {activePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-dim font-semibold">
                        /{item.base_unit_name || 'Unit'}
                      </span>
                    </div>
                  </button>
                );
              })}
>>>>>>> Stashed changes
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  ref={el => { itemRefs.current[idx] = el; }}
                  onClick={() => addToCart(item)}
                  className="flex flex-col text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-brand hover:ring-1 hover:ring-brand/50 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand transition-all active:scale-[0.97]"
                >
                  <span className="font-bold text-sm text-slate-900 dark:text-white mb-1 line-clamp-2 leading-tight">{item.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono mb-2">{item.sku}</span>
                  <span className="mt-auto font-bold text-brand text-sm">Rp {(item.price || 0).toLocaleString('id-ID')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

<<<<<<< Updated upstream
        {/* Keyboard Shortcut Hint Bar */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium shrink-0">
          {[['F1/F2','Cari'],['F3','Pelanggan'],['F4','Tahan'],['F5','Lanjut'],['F9','Baru'],['F10/End','Bayar'],['Alt+H','Edit Harga'],['F11','Layar Penuh'],['F12','Hapus Baris']].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5"><kbd className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300">{k}</kbd> {v}</span>
=======
        {/* Accessible Keyboard Hint Bar (Desktop only) */}
        <div className="hidden md:flex py-2.5 px-4 bg-muted/90 dark:bg-input/80 border-t border-line flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-dim font-medium shrink-0">
          {[
            ['F1', 'Cari Barang'],
            ['F2', 'Buka Laci'],
            ['F3', 'Pilih Pelanggan'],
            ['F4', 'Tahan Nota'],
            ['F8 / Alt+T', 'Ubah Total'],
            ['Alt+H', 'Edit Harga'],
            ['Alt+S', 'Edit Subtotal'],
            ['F7', 'Riwayat Nota'],
            ['End', 'Bayar'],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <kbd className="bg-card dark:bg-muted border border-line shadow-xs px-2 py-0.5 rounded-lg text-[10px] font-black text-body dark:text-heading">
                {key}
              </kbd>
              <span>{label}</span>
            </span>
>>>>>>> Stashed changes
          ))}
        </div>
      </div>

<<<<<<< Updated upstream
      {/* RIGHT: Cart */}
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden w-80 xl:w-96 shrink-0">
        {/* Customer Header */}
=======
      {/* ─── MOBILE FLOATING STICKY CART BAR (< 768px) ─── */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+74px)] left-3 right-3 max-w-md mx-auto z-30 bg-card/95 dark:bg-[#0d121f]/95 backdrop-blur-2xl border border-primary/30 dark:border-primary/40 p-2.5 rounded-2xl shadow-2xl shadow-primary/10 flex items-center justify-between animate-slide-in-up">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center gap-3 text-left min-w-0 flex-1 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 text-white flex items-center justify-center font-black shrink-0 relative shadow-sm">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-black px-1.5 rounded-full min-w-4 h-4 flex items-center justify-center shadow-xs">
                {cart.reduce((sum, line) => sum + line.qty, 0)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-heading font-mono tracking-tight truncate">
                Rp {Math.round(finalPayableTotal).toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-dim truncate flex items-center gap-1 mt-0.5">
                <span>{selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}</span>
                <span>•</span>
                <span className="text-primary font-bold">Rincian Nota</span>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs shadow-md shadow-primary/25 flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            <span>Bayar</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ─── RIGHT: ERGONOMIC CART & CHECKOUT PANEL ─── */}
      <div className={`
        ${isMobileCartOpen 
          ? 'fixed inset-0 z-50 flex flex-col bg-card/98 dark:bg-[#0b0f19]/98 backdrop-blur-2xl animate-slide-in-up pb-[env(safe-area-inset-bottom)]' 
          : 'hidden md:flex flex-col bg-card rounded-xl shadow-sm border border-line overflow-hidden w-80 lg:w-96 2xl:w-[410px] shrink-0'
        }
      `}>
        {/* Mobile Header with Pull Grabber Handle & Close Button */}
        {isMobileCartOpen && (
          <div className="md:hidden flex flex-col border-b border-line/80 bg-muted/40 shrink-0">
            {/* Grabber Notch */}
            <div className="w-10 h-1 rounded-full bg-line-strong/60 mx-auto mt-2 mb-0.5" />
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                  <ShoppingCart size={15} />
                </div>
                <div>
                  <span className="text-xs font-black text-heading">
                    Keranjang Pesanan ({cart.reduce((sum, line) => sum + line.qty, 0)} item)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-heading hover:bg-muted active:scale-90 transition-all cursor-pointer border border-line/40"
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Customer Header Button */}
>>>>>>> Stashed changes
        <button
          className="w-full px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40 focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800 focus:ring-inset focus:ring-2 focus:ring-brand transition-colors tour-pos-customer"
          onClick={() => setShowCustomerPicker(true)}
        >
          <div className="flex items-center gap-2">
            <UserCheck size={15} className="text-brand" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
              </p>
              {selectedCustomer && (
                <p className="text-[10px] text-slate-500 mt-0.5">{TIER_LABEL[selectedCustomer.customer_tier] || 'Regular'}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-lg">F3 Ubah</span>
        </button>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 tour-pos-cart">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 select-none">
              <ShoppingCart size={36} className="mb-2 opacity-20" />
              <p className="text-xs">Keranjang kosong</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((l, idx) => {
                const isSelected = selectedCartIdx === idx;
                const isEditingPrice = editingPriceIdx === idx;
                return (
                  <div
                    key={`${l.item_id}-${idx}`}
                    ref={el => { cartItemRefs.current[idx] = el; }}
                    tabIndex={0}
                    onFocus={() => setSelectedCartIdx(idx)}
                    onClick={() => setSelectedCartIdx(idx)}
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown') { e.preventDefault(); const next = Math.min(idx + 1, cart.length - 1); setSelectedCartIdx(next); cartItemRefs.current[next]?.focus(); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); const prev = Math.max(idx - 1, 0); setSelectedCartIdx(prev); cartItemRefs.current[prev]?.focus(); }
                      if ((e.key === '+' || e.key === '=') && !l.is_bogo_free) updateQty(l.item_id, 1);
                      if (e.key === '-' && !l.is_bogo_free) updateQty(l.item_id, -1);
                      if (e.key === 'Delete' && !l.is_bogo_free) { removeItem(l.item_id); setSelectedCartIdx(Math.max(0, idx - 1)); }
                      if ((e.altKey && e.key === 'h') && !l.is_bogo_free) startEditPrice(idx);
                    }}
                    className={`p-3 rounded-xl border flex gap-2 transition-all outline-none cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-brand border-brand bg-brand/5 dark:bg-brand/10'
                        : l.is_bogo_free
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {l.is_bogo_free && <span className="text-emerald-600 mr-1">FREE</span>}
                        {l.item_name}
                      </h4>
                      {/* Price display / edit */}
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-slate-500">Rp</span>
                          <input
                            ref={priceEditInputRef}
                            type="number"
                            value={editingPriceVal}
                            onChange={e => setEditingPriceVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); commitPriceEdit(); }
                              if (e.key === 'Escape') { e.preventDefault(); cancelPriceEdit(); }
                            }}
                            className="w-24 text-[11px] font-bold px-1.5 py-0.5 border border-brand rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand"
                          />
                          <button onClick={e => { e.stopPropagation(); commitPriceEdit(); }} className="text-emerald-500 hover:text-emerald-600"><Check size={12}/></button>
                          <button onClick={e => { e.stopPropagation(); cancelPriceEdit(); }} className="text-slate-400 hover:text-rose-500"><XIcon size={12}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-[11px] text-slate-500">Rp {l.price.toLocaleString('id-ID')} / {l.unit_name}</p>
                          {!l.is_bogo_free && isSelected && (
                            <button
                              onClick={e => { e.stopPropagation(); startEditPrice(idx); }}
                              className="text-slate-400 hover:text-brand transition-colors"
                              title="Edit harga (Alt+H)"
                            >
                              <Edit2 size={10}/>
                            </button>
                          )}
                        </div>
                      )}
                      {l.discount_amount > 0 && (
                        <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                          -Rp {l.discount_amount.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between gap-1">
                      <span className="font-bold text-xs text-brand">Rp {((l.qty * l.price) - l.discount_amount).toLocaleString('id-ID')}</span>
                      {!l.is_bogo_free && (
                        <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button onClick={e => { e.stopPropagation(); updateQty(l.item_id, -1); }} className="p-1 hover:text-brand text-slate-600 dark:text-slate-400 focus:outline-none focus:text-brand focus:bg-brand/10 rounded"><Minus size={12}/></button>
                          <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-white">{l.qty}</span>
                          <button onClick={e => { e.stopPropagation(); updateQty(l.item_id, 1); }} className="p-1 hover:text-brand text-slate-600 dark:text-slate-400 focus:outline-none focus:text-brand focus:bg-brand/10 rounded"><Plus size={12}/></button>
                        </div>
                      )}
                    </div>
                    {!l.is_bogo_free && (
<<<<<<< Updated upstream
                      <button onClick={e => { e.stopPropagation(); removeItem(l.item_id); }} className="text-slate-400 hover:text-rose-500 focus:outline-none focus:text-rose-500 focus:bg-rose-50 dark:focus:bg-rose-500/10 rounded p-0.5 self-start"><Trash2 size={14}/></button>
=======
                      <div className="flex items-center bg-muted/80 rounded-xl p-0.5 sm:p-1 border border-line/80 dark:border-line-strong/80 shadow-xs">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, -1); }}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center bg-card dark:bg-line-strong text-body dark:text-heading hover:bg-danger-soft hover:text-danger rounded-lg transition-all font-bold shadow-xs active:scale-90 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-heading font-mono select-none">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, 1); }}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center bg-card dark:bg-line-strong text-body dark:text-heading hover:bg-primary hover:text-white rounded-lg transition-all font-bold shadow-xs active:scale-90 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
>>>>>>> Stashed changes
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Held Transactions */}
        {holds.length > 0 && (
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 flex gap-1.5 overflow-x-auto custom-scrollbar">
            {holds.map(h => (
              <button key={h.id} onClick={() => handleResume(h)} className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-lg whitespace-nowrap text-[11px] font-bold text-amber-700 dark:text-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors">
                <PlayCircle size={12} /> {h.timestamp}
              </button>
            ))}
          </div>
        )}

        {/* Cart Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setShowHistory(true)} className="flex items-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand transition-colors">
              <Clock size={14} className="mr-1.5" />
              <span className="text-xs font-semibold">Riwayat</span>
            </button>
            <div className="text-right">
              {cartDiscount > 0 && (
                <div className="flex justify-end gap-2 text-xs">
                  <span className="text-slate-500">Diskon:</span>
                  <span className="font-bold text-green-600">-Rp {cartDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {currentTierDiscountPercent > 0 && (
                <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400 font-medium pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
                  <span className="flex items-center gap-1.5"><Crown size={14} /> Tier Discount ({currentTierDiscountPercent}%)</span>
                  <span>-Rp {tierDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {taxMode === 'exclude' && taxRate > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Pajak ({taxRate}%)</span>
                  <span>+Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              {taxMode === 'include' && taxRate > 0 && (
                <div className="flex justify-between items-center text-slate-500 font-medium">
                  <span>Termasuk Pajak ({taxRate}%)</span>
                  <span>Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-black text-2xl text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total</span>
                <span>Rp {Math.round(total).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleHold}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-40 transition-colors"
            >
              <PauseCircle size={15}/> Tahan (F4)
            </button>
            <button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold bg-brand text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand dark:focus:ring-offset-slate-900 disabled:opacity-40 transition-colors shadow-sm tour-pos-payment"
            >
              Bayar (F10)
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          branchId="branch_001"
          cart={cart}
          total={total}
          priceType={priceType}
          customerId={selectedCustomer?.id}
          taxAmount={taxAmount}
          discountAmount={cart.reduce((s, l) => s + (l.discount_amount || 0), 0) + cartDiscount + tierDiscountAmount}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
      {showCustomerPicker && (
        <CustomerPickerModal
          isOpen={showCustomerPicker}
          onClose={() => setShowCustomerPicker(false)}
          onSelect={setSelectedCustomer}
          selectedId={selectedCustomer?.id}
        />
      )}
      {receiptSaleId && (
        <ReceiptModal
          saleId={receiptSaleId}
          onClose={() => { setReceiptSaleId(null); searchInputRef.current?.focus(); }}
        />
      )}
      {showHistory && (
        <SalesHistoryModal
          isOpen={showHistory}
          onClose={() => { setShowHistory(false); searchInputRef.current?.focus(); }}
        />
      )}
      <TourGuide
        steps={posTourSteps}
        run={runTour}
        onFinish={() => setRunTour(false)}
      />
    </div>
  );
}
