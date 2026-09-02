import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, UserCheck, 
  PauseCircle, PlayCircle, Loader2, HelpCircle, Edit3, Check, 
  X as XIcon, Crown, LayoutGrid, List, ArrowRight, RotateCcw
} from 'lucide-react';
import { usePosStore, PosLine, PosHold } from './POSStore';
import { 
  getItemsFiltered, Item, Customer, getSettings, kickCashDrawer, 
  resolveTierPrice, getCategories, Category 
} from '../../lib/api';
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

  // Item catalog states
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [loading, setLoading] = useState(false);

  // Cart & Pricing states
  const [cart, setCart] = useState<PosLine[]>([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Grand Total Override states
  const [customGrandTotal, setCustomGrandTotal] = useState<number | null>(null);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [customTotalInput, setCustomTotalInput] = useState('');

  // Tax & Member Discount settings
  const [taxMode, setTaxMode] = useState<string>('none');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [tierMemberDiscount, setTierMemberDiscount] = useState<number>(0);
  const [tierVipDiscount, setTierVipDiscount] = useState<number>(0);

  // Cart item selection & inline price / subtotal editing
  const [selectedCartIdx, setSelectedCartIdx] = useState<number>(-1);
  const [editingPriceIdx, setEditingPriceIdx] = useState<number>(-1);
  const [editingPriceVal, setEditingPriceVal] = useState<string>('');
  const [editingSubtotalIdx, setEditingSubtotalIdx] = useState<number>(-1);
  const [editingSubtotalVal, setEditingSubtotalVal] = useState<string>('');

  // DOM Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const totalEditInputRef = useRef<HTMLInputElement>(null);
  const priceEditInputRef = useRef<HTMLInputElement>(null);
  const subtotalEditInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cartItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  
  // Tour Guide
  const [runTour, setRunTour] = useState(false);
  const posTourSteps = [
    {
      target: '.tour-pos-search',
      content: 'Ketik nama barang, scan barcode, atau pilih kategori obat. Tekan Enter untuk langsung memasukkan barang.',
      disableBeacon: true,
    },
    {
      target: '.tour-pos-catalog',
      content: 'Klik kartu produk untuk menambahkannya ke keranjang secara instan.',
    },
    {
      target: '.tour-pos-cart',
      content: 'Daftar belanjaan. Anda bisa klik harga untuk mengubahnya (Alt+H) atau gunakan tombol jumlah yang besar.',
    },
    {
      target: '.tour-pos-total',
      content: 'Klik total bayar untuk mengubah / negosiasi total harga secara manual (F8). Harga lama akan tetap terlihat sebagai perbandingan!',
    },
    {
      target: '.tour-pos-payment',
      content: 'Klik Bayar (Space / Enter / End) untuk memproses pembayaran dan mencetak struk.',
    }
  ];

  const holds = usePosStore(state => state.holds);
  const addHold = usePosStore(state => state.addHold);
  const removeHold = usePosStore(state => state.removeHold);

  // Load Settings & Categories on Mount
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

    getCategories().then(setCategories).catch(console.error);
  }, []);

  // Fetch Items based on Search query or Selected Category
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const catFilter = selectedCategory === 'all' ? '' : selectedCategory;
      const res = await getItemsFiltered(search, catFilter, '', true, 1, 40);
      setItems(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(fetchItems, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Hardware Barcode Scanner Hook
  useBarcodeScanner(async (barcode) => {
    if (showPayment || showCustomerPicker || receiptSaleId || showHistory) return;
    
    // Check locally first
    const exact = items.find(i => i.sku === barcode || i.barcode === barcode);
    if (exact) {
      addToCart(exact);
      setSearch('');
    } else {
      setLoading(true);
      try {
        const res = await getItemsFiltered(barcode, '', '', true, 1, 5);
        const match = res.items.find(i => i.sku === barcode || i.barcode === barcode);
        if (match) {
          addToCart(match);
          setSearch('');
        } else {
          setSearch(barcode);
        }
      } finally {
        setLoading(false);
      }
    }
  });

  // Start Line Price Edit
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
      // Reset manual total override when item prices change
      setCustomGrandTotal(null);
    }
    setEditingPriceIdx(-1);
    setEditingPriceVal('');
  }, [editingPriceVal, editingPriceIdx]);

  const cancelPriceEdit = useCallback(() => {
    setEditingPriceIdx(-1);
    setEditingPriceVal('');
  }, []);

  // Start Line Subtotal Edit
  const startEditSubtotal = useCallback((idx: number) => {
    if (idx < 0 || idx >= cart.length) return;
    const line = cart[idx];
    if (line.is_bogo_free) return;
    const currentSubtotal = Math.max(0, (line.qty * line.price) - line.discount_amount);
    setEditingSubtotalIdx(idx);
    setEditingSubtotalVal(currentSubtotal.toString());
    setSelectedCartIdx(idx);
    setTimeout(() => subtotalEditInputRef.current?.focus(), 50);
  }, [cart]);

  const commitSubtotalEdit = useCallback(() => {
    const newSubtotal = parseFloat(editingSubtotalVal);
    if (!isNaN(newSubtotal) && newSubtotal >= 0 && editingSubtotalIdx >= 0 && editingSubtotalIdx < cart.length) {
      const line = cart[editingSubtotalIdx];
      const targetQty = line.qty > 0 ? line.qty : 1;
      const newUnitPrice = newSubtotal / targetQty;
      setCart(prev => prev.map((l, i) => i === editingSubtotalIdx ? { ...l, price: newUnitPrice, discount_amount: 0 } : l));
      setCustomGrandTotal(null);
    }
    setEditingSubtotalIdx(-1);
    setEditingSubtotalVal('');
  }, [editingSubtotalVal, editingSubtotalIdx, cart]);

  const cancelSubtotalEdit = useCallback(() => {
    setEditingSubtotalIdx(-1);
    setEditingSubtotalVal('');
  }, []);

  // Start Grand Total Price Override
  const startEditGrandTotal = useCallback(() => {
    setIsEditingTotal(true);
    setCustomTotalInput(customGrandTotal !== null ? customGrandTotal.toString() : '');
    setTimeout(() => totalEditInputRef.current?.focus(), 50);
  }, [customGrandTotal]);

  const commitGrandTotalEdit = useCallback(() => {
    const val = parseFloat(customTotalInput);
    if (!isNaN(val) && val >= 0) {
      setCustomGrandTotal(val);
    }
    setIsEditingTotal(false);
  }, [customTotalInput]);

  const cancelGrandTotalEdit = useCallback(() => {
    setIsEditingTotal(false);
  }, []);

  const resetGrandTotalOverride = useCallback(() => {
    setCustomGrandTotal(null);
    setIsEditingTotal(false);
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const isInModal = showPayment || showCustomerPicker || receiptSaleId || showHistory;

      // Handle Grand Total Edit Mode
      if (isEditingTotal) {
        if (e.key === 'Enter') { e.preventDefault(); commitGrandTotalEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelGrandTotalEdit(); }
        return;
      }

      // Handle Line Item Price Edit Mode
      if (editingPriceIdx >= 0) {
        if (e.key === 'Enter') { e.preventDefault(); commitPriceEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelPriceEdit(); }
        return;
      }

      // Handle Line Item Subtotal Edit Mode
      if (editingSubtotalIdx >= 0) {
        if (e.key === 'Enter') { e.preventDefault(); commitSubtotalEdit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelSubtotalEdit(); }
        return;
      }

      // F8 or Alt+T: Toggle Grand Total Override
      if (e.key === 'F8' || (e.altKey && (e.key === 't' || e.key === 'T'))) {
        e.preventDefault();
        if (!isInModal && cart.length > 0) {
          startEditGrandTotal();
        }
        return;
      }

      // Alt+H: Edit unit price of selected cart line
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        if (!isInModal && selectedCartIdx >= 0) {
          startEditPrice(selectedCartIdx);
        } else if (!isInModal && cart.length > 0) {
          startEditPrice(cart.length - 1);
          setSelectedCartIdx(cart.length - 1);
        }
        return;
      }

      // Alt+S: Edit subtotal of selected cart line
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (!isInModal && selectedCartIdx >= 0) {
          startEditSubtotal(selectedCartIdx);
        } else if (!isInModal && cart.length > 0) {
          startEditSubtotal(cart.length - 1);
          setSelectedCartIdx(cart.length - 1);
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          break;
        case 'F2':
          e.preventDefault();
          kickCashDrawer('').catch(err => console.error('Cash drawer kick failed:', err));
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
        case 'F7':
          e.preventDefault();
          if (!isInModal) setShowHistory(true);
          break;
        case 'F9':
          e.preventDefault();
          if (!showPayment && cart.length > 0 && confirm('Kosongkan keranjang transaksi ini?')) {
            setCart([]);
            setCartDiscount(0);
            setCustomGrandTotal(null);
            setSelectedCartIdx(-1);
          }
          break;
        case 'End':
          e.preventDefault();
          if (cart.length > 0 && !showPayment && !isInModal) setShowPayment(true);
          break;
        case 'Escape':
          if (showPayment) setShowPayment(false);
          if (showCustomerPicker) setShowCustomerPicker(false);
          if (showHistory) setShowHistory(false);
          if (receiptSaleId) setReceiptSaleId(null);
          break;
        case 'ArrowDown':
          if (search.length < 2 && cart.length > 0 && !isInModal) {
            e.preventDefault();
            const next = Math.min(selectedCartIdx + 1, cart.length - 1);
            setSelectedCartIdx(next);
            cartItemRefs.current[next]?.focus();
          }
          break;
        case 'ArrowUp':
          if (search.length < 2 && cart.length > 0 && !isInModal) {
            e.preventDefault();
            const prev = Math.max(selectedCartIdx - 1, 0);
            setSelectedCartIdx(prev);
            cartItemRefs.current[prev]?.focus();
          }
          break;
        case '+':
        case '=':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModal) {
            e.preventDefault();
            const line = cart[selectedCartIdx];
            if (line && !line.is_bogo_free) updateQty(line.item_id, 1);
          }
          break;
        case '-':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModal) {
            e.preventDefault();
            const line = cart[selectedCartIdx];
            if (line && !line.is_bogo_free) updateQty(line.item_id, -1);
          }
          break;
        case 'Delete':
          if (search.length < 2 && selectedCartIdx >= 0 && !isInModal) {
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
  }, [
    cart, holds, showPayment, showCustomerPicker, receiptSaleId, showHistory, 
    search, selectedCartIdx, editingPriceIdx, editingPriceVal, editingSubtotalIdx, 
    editingSubtotalVal, isEditingTotal, customTotalInput, startEditPrice, commitPriceEdit, 
    cancelPriceEdit, startEditSubtotal, commitSubtotalEdit, cancelSubtotalEdit, 
    startEditGrandTotal, commitGrandTotalEdit, cancelGrandTotalEdit
  ]);

  // Apply automatic discounts from promotion engine
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

  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search) {
      if (items.length === 1) { 
        addToCart(items[0]); 
        setSearch(''); 
      } else {
        const exact = items.find(i => i.sku === search || i.barcode === search);
        if (exact) { 
          addToCart(exact); 
          setSearch(''); 
        }
      }
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    }
  };

  const addToCart = (item: Item) => {
    setCart(prev => {
      const exists = prev.find(l => l.item_id === item.id && !l.is_bogo_free);
      const newQty = exists ? exists.qty + 1 : 1;
      const baseDefault = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
      const resolved = resolveTierPrice(item, newQty, baseDefault);

      if (exists) {
        return prev.map(l => (l.item_id === item.id && !l.is_bogo_free) ? { ...l, qty: newQty, price: resolved.price } : l);
      }
      return [...prev, {
        item_id: item.id, 
        item_name: item.name,
        unit_id: item.base_unit_id || 'unknown', 
        unit_name: item.base_unit_name || 'Unit',
        qty: 1, 
        price_type: priceType, 
        price: resolved.price, 
        discount_amount: 0, 
        hpp_value: item.avg_hpp || 0
      }];
    });
    setCustomGrandTotal(null); // Reset manual total override on cart change
    setSelectedCartIdx(cart.length);
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(l => {
      if (l.item_id === itemId && !l.is_bogo_free) {
        const newQty = l.qty + delta;
        if (newQty <= 0) return l;
        const matchedItem = items.find(i => i.id === itemId);
        let newPrice = l.price;
        if (matchedItem) {
          const baseDefault = l.price_type === 'wholesale' && matchedItem.wholesale_price ? matchedItem.wholesale_price : (matchedItem.price || 0);
          const resolved = resolveTierPrice(matchedItem, newQty, baseDefault);
          newPrice = resolved.price;
        }
        return { ...l, qty: newQty, price: newPrice };
      }
      return l;
    }));
    setCustomGrandTotal(null);
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(l => !(l.item_id === itemId && !l.is_bogo_free)));
    setCustomGrandTotal(null);
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, l) => sum + (l.qty * l.price) - l.discount_amount, 0) - cartDiscount;
  
  let currentTierDiscountPercent = 0;
  if (selectedCustomer?.customer_tier === 'member') currentTierDiscountPercent = tierMemberDiscount;
  if (selectedCustomer?.customer_tier === 'vip') currentTierDiscountPercent = tierVipDiscount;
  
  const tierDiscountAmount = rawSubtotal * (currentTierDiscountPercent / 100);
  const subtotalAfterDiscounts = rawSubtotal - tierDiscountAmount;
  
  const taxAmount = taxMode === 'exclude' 
    ? subtotalAfterDiscounts * (taxRate / 100) 
    : (taxMode === 'include' ? subtotalAfterDiscounts * (1 - 1 / (1 + taxRate / 100)) : 0);
    
  const calculatedGrandTotal = Math.max(0, taxMode === 'exclude' ? subtotalAfterDiscounts + taxAmount : subtotalAfterDiscounts);
  
  // Final Total taking Custom Total Override into account
  const finalPayableTotal = customGrandTotal !== null ? customGrandTotal : calculatedGrandTotal;
  const manualTotalAdjustment = customGrandTotal !== null ? (calculatedGrandTotal - customGrandTotal) : 0;

  const handleHold = () => {
    if (cart.length === 0) return;
    addHold({ 
      id: Date.now().toString(), 
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), 
      lines: cart, 
      price_type: priceType, 
      total: finalPayableTotal 
    });
    setCart([]); 
    setCartDiscount(0); 
    setCustomGrandTotal(null);
    setSelectedCartIdx(-1);
  };

  const handleResume = (hold: PosHold) => {
    setCart(hold.lines); 
    setPriceType(hold.price_type); 
    removeHold(hold.id);
    setCustomGrandTotal(null);
    setSelectedCartIdx(-1);
  };

  const handlePaymentSuccess = (saleId: string, print: boolean) => {
    setCart([]); 
    setCartDiscount(0); 
    setCustomGrandTotal(null);
    setSearch(''); 
    setShowPayment(false);
    setSelectedCartIdx(-1);
    
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
  };

  const TIER_LABEL: Record<string, string> = { regular: 'Regular', member: 'Member', vip: 'VIP' };

  return (
    <div className="flex h-full w-full bg-slate-100 dark:bg-[#070A11] p-2.5 sm:p-3 gap-3 animate-in fade-in select-none">
      
      {/* ─── LEFT: CATALOG & OMNICHANNEL SEARCH SECTION ─── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0B0F19] rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 overflow-hidden min-w-0">
        
        {/* Top Control Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
          
          {/* Main Search Box */}
          <div className="flex-1 relative tour-pos-search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode obat atau ketik nama produk... (F1 / F2)"
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-semibold focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-xs"
              autoFocus
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Pricing Switcher (Retail vs Wholesale) */}
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setPriceType('retail')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                priceType === 'retail' 
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-brand dark:text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Eceran
            </button>
            <button
              onClick={() => setPriceType('wholesale')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                priceType === 'wholesale' 
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-brand dark:text-white' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Grosir
            </button>
          </div>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="hidden md:flex items-center bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Tampilan Grid Card"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-700 text-brand dark:text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Tampilan Daftar List"
            >
              <List size={15} />
            </button>
          </div>

          {/* Help Tour */}
          <button
            onClick={() => setRunTour(true)}
            className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-2xl transition-colors shrink-0"
            title="Panduan Kasir"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Category Quick Pills */}
        <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 bg-white dark:bg-[#0B0F19]">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua Produk
          </button>
          {Array.from(new Map(categories.map(c => [c.name.trim().toUpperCase(), c])).values()).map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
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
              <Loader2 className="animate-spin text-brand" size={32} />
              <span className="text-xs text-slate-400 font-bold">Memuat data produk...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/80 dark:border-slate-700/80">
                <Search size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba pilih kategori lain atau ubah kata kunci pencarian.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {items.map((item, idx) => {
                const activePrice = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
                return (
                  <button
                    key={item.id}
                    ref={el => { itemRefs.current[idx] = el; }}
                    onClick={() => addToCart(item)}
                    className="flex flex-col text-left bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 hover:border-brand hover:shadow-md hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-brand shadow-xs transition-all group cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg truncate max-w-[120px]">
                        {item.sku}
                      </span>
                      {item.min_stock > 0 && (
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full shrink-0">
                          Tersedia
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-brand transition-colors mb-1.5">
                      {item.name}
                    </h4>

                    {item.category_name && (
                      <span className="text-[10px] text-slate-400 mb-2 truncate">
                        {item.category_name}
                      </span>
                    )}

                    <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="font-black text-brand text-xs sm:text-sm font-mono">
                        Rp {activePrice.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        /{item.base_unit_name || 'Unit'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Nama Produk</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-4 text-right">Harga</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => {
                    const activePrice = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-500 text-[11px]">{item.sku}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{item.category_name || '-'}</td>
                        <td className="py-2.5 px-4 text-right font-black text-brand font-mono">Rp {activePrice.toLocaleString('id-ID')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button className="px-2 py-1 bg-brand text-white rounded-lg font-bold text-[10px] shadow-xs">
                            + Tambah
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accessible Keyboard Hint Bar */}
        <div className="py-2.5 px-4 bg-slate-50/90 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 font-medium shrink-0">
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
              <kbd className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── RIGHT: ERGONOMIC CART & CHECKOUT PANEL ─── */}
      <div className="flex flex-col bg-white dark:bg-[#0B0F19] rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 overflow-hidden w-84 lg:w-96 2xl:w-[410px] shrink-0">
        
        {/* Customer Header Button */}
        <button
          onClick={() => setShowCustomerPicker(true)}
          className="w-full px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-slate-50 to-indigo-50/30 dark:from-slate-900/60 dark:via-slate-900/60 dark:to-indigo-950/20 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all tour-pos-customer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-black shrink-0 border border-brand/20 group-hover:scale-105 transition-transform">
              <UserCheck size={18} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-brand transition-colors">
                {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-slate-400">
                  {selectedCustomer ? (TIER_LABEL[selectedCustomer.customer_tier] || 'Regular') : 'Non-Member'}
                </span>
                {selectedCustomer?.loyalty_points ? (
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.2 rounded-full">
                    {selectedCustomer.loyalty_points} Poin
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold shadow-xs group-hover:border-brand transition-all">
            <span className="text-[10px] text-brand">F3</span>
            <span>Ubah</span>
          </div>
        </button>

        {/* Cart Item Header & Held Transactions Pill */}
        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-brand" />
            <span>Keranjang ({cart.length})</span>
          </div>
          
          <div className="flex items-center gap-2">
            {holds.length > 0 && (
              <button
                onClick={() => handleResume(holds[0])}
                className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-extrabold animate-pulse"
                title="Lanjutkan Transaksi Tertahan (F5)"
              >
                <PlayCircle size={11} /> {holds.length} Tertahan
              </button>
            )}
            <span className="text-[11px] font-extrabold text-slate-400">
              {cart.reduce((s, l) => s + l.qty, 0)} Pcs
            </span>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 tour-pos-cart">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/80 dark:border-slate-700/80">
                <ShoppingCart size={28} className="opacity-40" />
              </div>
              <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Keranjang Masih Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Scan barcode atau klik produk dari katalog untuk memulai transaksi
              </p>
            </div>
          ) : (
            cart.map((l, idx) => {
              const isSelected = selectedCartIdx === idx;
              const isEditingPrice = editingPriceIdx === idx;
              const isEditingSubtotal = editingSubtotalIdx === idx;
              return (
                <div
                  key={`${l.item_id}-${idx}`}
                  ref={el => { cartItemRefs.current[idx] = el; }}
                  tabIndex={0}
                  onFocus={() => setSelectedCartIdx(idx)}
                  onClick={() => setSelectedCartIdx(idx)}
                  className={`p-3.5 rounded-2xl border transition-all relative ${
                    isSelected
                      ? 'border-brand ring-2 ring-brand/20 bg-brand/5 dark:bg-brand/10 shadow-xs'
                      : l.is_bogo_free
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {l.is_bogo_free && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500 text-white shrink-0">
                            GRATIS
                          </span>
                        )}
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1 leading-snug">
                          {l.item_name}
                        </h4>
                      </div>

                      {/* Click-to-Edit Price Row */}
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[11px] font-bold text-slate-400">Rp</span>
                          <input
                            ref={priceEditInputRef}
                            type="number"
                            value={editingPriceVal}
                            onChange={e => setEditingPriceVal(e.target.value)}
                            className="w-24 text-xs font-bold px-2 py-1 border-2 border-brand rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            onClick={e => { e.stopPropagation(); commitPriceEdit(); }}
                            className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); cancelPriceEdit(); }}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white rounded-lg"
                          >
                            <XIcon size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={e => {
                            if (!l.is_bogo_free) {
                              e.stopPropagation();
                              startEditPrice(idx);
                            }
                          }}
                          className={`flex items-center gap-1.5 mt-1 group/price ${!l.is_bogo_free ? 'cursor-pointer' : ''}`}
                          title="Klik untuk ubah harga satuan (Alt+H)"
                        >
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover/price:text-brand group-hover/price:underline">
                            Rp {l.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400">/ {l.unit_name}</span>
                          {!l.is_bogo_free && (
                            <Edit3 size={11} className="text-slate-400 opacity-60 group-hover/price:opacity-100 group-hover/price:text-brand" />
                          )}
                        </div>
                      )}

                      {l.discount_amount > 0 && (
                        <div className="mt-1">
                          <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                            Diskon -Rp {l.discount_amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); removeItem(l.item_id); }}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 rounded-xl transition-all"
                      title="Hapus Item (Delete)"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Subtotal & Accessible Quantity Steppers */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    {isEditingSubtotal ? (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] font-bold text-slate-400">Rp</span>
                        <input
                          ref={subtotalEditInputRef}
                          type="number"
                          value={editingSubtotalVal}
                          onChange={e => setEditingSubtotalVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitSubtotalEdit(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelSubtotalEdit(); }
                          }}
                          className="w-24 text-xs font-bold px-2 py-1 border-2 border-brand rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                          autoFocus
                        />
                        <button
                          onClick={e => { e.stopPropagation(); commitSubtotalEdit(); }}
                          className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer"
                          title="Simpan Subtotal"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); cancelSubtotalEdit(); }}
                          className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white rounded-lg cursor-pointer"
                          title="Batal"
                        >
                          <XIcon size={13} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={e => {
                          if (!l.is_bogo_free) {
                            e.stopPropagation();
                            startEditSubtotal(idx);
                          }
                        }}
                        className={`group/subtotal flex flex-col ${!l.is_bogo_free ? 'cursor-pointer' : ''}`}
                        title="Klik untuk ubah subtotal item ini"
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-400 block group-hover/subtotal:text-brand transition-colors">
                          Subtotal {!l.is_bogo_free && <Edit3 size={9} className="inline ml-0.5 opacity-60 group-hover/subtotal:opacity-100 text-brand" />}
                        </span>
                        <span className="font-black text-xs sm:text-sm text-brand font-mono group-hover/subtotal:underline">
                          Rp {((l.qty * l.price) - l.discount_amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    {!l.is_bogo_free && (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                        <button
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, -1); }}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all font-bold shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-slate-900 dark:text-white font-mono">
                          {l.qty}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, 1); }}
                          className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand hover:text-white rounded-xl transition-all font-bold shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── CART FOOTER & TOTAL PRICE OVERRIDE HERO SECTION ─── */}
        <div className="p-3.5 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 shrink-0 space-y-3">
          
          {/* Detailed Breakdown */}
          {(cartDiscount > 0 || currentTierDiscountPercent > 0 || taxRate > 0) && (
            <div className="space-y-1.5 py-1 text-xs border-b border-slate-200/60 dark:border-slate-800/60">
              {cartDiscount > 0 && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Diskon Promo</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">-Rp {cartDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {currentTierDiscountPercent > 0 && (
                <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span className="flex items-center gap-1"><Crown size={12} /> Diskon Member ({currentTierDiscountPercent}%)</span>
                  <span>-Rp {tierDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Pajak ({taxRate}% - {taxMode})</span>
                  <span>{taxMode === 'exclude' ? '+' : ''}Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}

          {/* 🌟 HERO TOTAL BOX (WITH DIRECT CLICK-TO-EDIT & OLD PRICE VISIBLE) 🌟 */}
          <div 
            onClick={cart.length > 0 ? startEditGrandTotal : undefined}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer tour-pos-total relative overflow-hidden group ${
              customGrandTotal !== null
                ? 'bg-amber-500/10 border-amber-400/60 dark:bg-amber-950/20 dark:border-amber-700/60'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-brand hover:shadow-md'
            }`}
            title="Klik untuk ubah / negosiasi total harga (F8 / Alt+T)"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    TOTAL AKHIR
                  </span>
                  <span className="text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.2 rounded-md group-hover:bg-brand group-hover:text-white transition-all">
                    F8 / Klik Edit
                  </span>
                </div>

                {/* Show Old Price when Custom Override is Active */}
                {customGrandTotal !== null && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 line-through font-mono font-bold">
                      Rp {Math.round(calculatedGrandTotal).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md">
                      Harga Disesuaikan
                    </span>
                  </div>
                )}
              </div>

              {/* Reset Override Button if active */}
              {customGrandTotal !== null && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    resetGrandTotalOverride();
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-bold rounded-lg transition-all"
                  title="Kembalikan ke Total Hitungan Normal"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {/* Total Price Display / Inline Edit Mode */}
            {isEditingTotal ? (
              <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <span className="text-base font-black text-brand">Rp</span>
                <input
                  ref={totalEditInputRef}
                  type="number"
                  value={customTotalInput}
                  onChange={e => setCustomTotalInput(e.target.value)}
                  placeholder={calculatedGrandTotal.toString()}
                  className="w-full text-xl font-black px-3 py-1.5 border-2 border-brand rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none font-mono"
                />
                <button
                  onClick={commitGrandTotalEdit}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                >
                  <Check size={14} /> OK
                </button>
                <button
                  onClick={cancelGrandTotalEdit}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight group-hover:text-brand transition-colors">
                  Rp {Math.round(finalPayableTotal).toLocaleString('id-ID')}
                </span>
                <Edit3 size={16} className="text-slate-300 group-hover:text-brand transition-colors ml-2" />
              </div>
            )}
          </div>

          {/* Action Button Grid */}
          <div className="grid grid-cols-5 gap-2.5">
            <button
              onClick={handleHold}
              disabled={cart.length === 0}
              className="col-span-2 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              <PauseCircle size={15} /> Tahan (F4)
            </button>

            <button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="col-span-3 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-brand via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-brand/20 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all tour-pos-payment cursor-pointer"
            >
              <span>BAYAR SEKARANG</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {showPayment && (
        <PaymentModal
          branchId="branch_001"
          cart={cart}
          total={finalPayableTotal}
          priceType={priceType}
          customerId={selectedCustomer?.id}
          taxAmount={taxAmount}
          discountAmount={
            cart.reduce((s, l) => s + (l.discount_amount || 0), 0) + 
            cartDiscount + 
            tierDiscountAmount + 
            Math.max(0, manualTotalAdjustment)
          }
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
          onClose={() => { 
            setReceiptSaleId(null); 
            searchInputRef.current?.focus(); 
          }}
        />
      )}

      {showHistory && (
        <SalesHistoryModal
          isOpen={showHistory}
          onClose={() => { 
            setShowHistory(false); 
            searchInputRef.current?.focus(); 
          }}
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
