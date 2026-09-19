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
  const [mobilePosTab, setMobilePosTab] = useState<'catalog' | 'cart'>('catalog');

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

  // Real-time synchronization listener (updates items without page reload)
  useEffect(() => {
    const handleSync = () => {
      fetchItems();
      getCategories().then(setCategories).catch(console.error);
    };
    window.addEventListener('chirasys:sync', handleSync);
    return () => window.removeEventListener('chirasys:sync', handleSync);
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
    <div className="flex flex-col lg:flex-row h-full w-full bg-muted p-2 sm:p-3 gap-2.5 sm:gap-3 animate-fade-in select-none relative">
      {/* Mobile Top Segmented Control (Only on screens < 1024px) */}
      <div className="lg:hidden flex items-center bg-card dark:bg-card/60 border border-line rounded-xl p-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePosTab('catalog')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobilePosTab === 'catalog'
              ? 'bg-primary text-white shadow-xs'
              : 'text-dim hover:text-heading'
          }`}
        >
          <Search size={14} />
          <span>Katalog Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab('cart')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
            mobilePosTab === 'cart'
              ? 'bg-primary text-white shadow-xs'
              : 'text-dim hover:text-heading'
          }`}
        >
          <ShoppingCart size={14} />
          <span>Keranjang ({cart.length}) · Rp {finalPayableTotal.toLocaleString('id-ID')}</span>
          {cart.length > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-warning text-white text-[9px] font-black flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── LEFT: CATALOG & OMNICHANNEL SEARCH SECTION ─── */}
      <div className={`flex-1 flex-col bg-card rounded-xl shadow-sm border border-line overflow-hidden min-w-0 ${
        mobilePosTab === 'catalog' ? 'flex' : 'hidden lg:flex'
      }`}>
        
        {/* Top Control Bar */}
        <div className="p-3.5 border-b border-line flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-muted/50 dark:bg-card/30 shrink-0">
          
          {/* Main Search Box */}
          <div className="flex-1 relative tour-pos-search">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" size={17} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Scan barcode obat atau ketik nama produk... (F1 / F2)"
              className="w-full pl-10 pr-9 py-2.5 bg-card border border-line/80 rounded-xl text-xs font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-heading placeholder:text-dim transition-all shadow-xs"
              autoFocus
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-body p-0.5 rounded-full"
              >
                <XIcon size={14} />
              </button>
            )}
          </div>

          {/* Pricing Switcher (Retail vs Wholesale) */}
          <div className="flex items-center bg-line/60 dark:bg-muted/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setPriceType('retail')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                priceType === 'retail' 
                  ? 'bg-card dark:bg-line-strong shadow-xs text-primary dark:text-white' 
                  : 'text-body hover:text-heading'
              }`}
            >
              Eceran
            </button>
            <button
              onClick={() => setPriceType('wholesale')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                priceType === 'wholesale' 
                  ? 'bg-card dark:bg-line-strong shadow-xs text-primary dark:text-white' 
                  : 'text-body hover:text-heading'
              }`}
            >
              Grosir
            </button>
          </div>

          {/* View Mode Toggle (Grid vs List) */}
          <div className="hidden md:flex items-center bg-line/60 dark:bg-muted/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'grid' 
                  ? 'bg-card dark:bg-line-strong text-primary dark:text-white shadow-xs' 
                  : 'text-dim hover:text-body'
              }`}
              title="Tampilan Grid Card"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'table' 
                  ? 'bg-card dark:bg-line-strong text-primary dark:text-white shadow-xs' 
                  : 'text-dim hover:text-body'
              }`}
              title="Tampilan Daftar List"
            >
              <List size={15} />
            </button>
          </div>

          {/* Help Tour */}
          <button
            onClick={() => setRunTour(true)}
            className="p-2 text-dim hover:text-primary hover:bg-primary-soft rounded-xl transition-colors shrink-0"
            title="Panduan Kasir"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* Category Quick Pills */}
        <div className="px-3.5 py-2 border-b border-line/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 bg-card">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-muted/80 text-body hover:bg-line'
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
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-muted/80 text-body hover:bg-line'
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
            </div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dim p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center text-dim mb-3 border border-line/80 dark:border-line-strong/80">
                <Search size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-bold text-heading">Tidak ada produk ditemukan</p>
              <p className="text-xs text-dim mt-1">Coba pilih kategori lain atau ubah kata kunci pencarian.</p>
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
            </div>
          ) : (
            /* Table View */
            <div className="border border-line rounded-xl overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted dark:bg-muted/60 border-b border-line text-[11px] font-bold uppercase text-dim">
                  <tr>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4">Nama Produk</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Stok</th>
                    <th className="py-2.5 px-4 text-right">Harga</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {items.map((item) => {
                    const activePrice = priceType === 'wholesale' && item.wholesale_price ? item.wholesale_price : (item.price || 0);
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => addToCart(item)}
                        className="hover:bg-primary-soft dark:hover:bg-primary-soft transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-dim text-[11px]">{item.sku}</td>
                        <td className="py-2.5 px-4 font-bold text-heading">{item.name}</td>
                        <td className="py-2.5 px-3 text-dim text-[11px]">{item.category_name || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {item.current_stock !== undefined ? (
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              item.current_stock > 0
                                ? 'text-success bg-success-soft dark:bg-success/40 dark:text-success'
                                : item.current_stock === 0
                                ? 'text-body bg-muted dark:text-body'
                                : 'text-danger bg-danger-soft dark:bg-danger/40 dark:text-danger font-black'
                            }`}>
                              {item.current_stock}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-primary font-mono">Rp {activePrice.toLocaleString('id-ID')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button className="px-2 py-1 bg-primary text-white rounded-lg font-bold text-[10px] shadow-xs cursor-pointer">
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
        <div className="py-2.5 px-4 bg-muted/90 dark:bg-input/80 border-t border-line flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-dim font-medium shrink-0">
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
          ))}
        </div>
      </div>

      {/* ─── RIGHT: ERGONOMIC CART & CHECKOUT PANEL ─── */}
      <div className={`flex-col bg-card rounded-xl shadow-sm border border-line overflow-hidden w-full lg:w-96 2xl:w-[410px] shrink-0 ${
        mobilePosTab === 'cart' ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Mobile Back Button to Catalog */}
        <div className="lg:hidden px-3.5 py-2.5 border-b border-line bg-muted/40 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobilePosTab('catalog')}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Kembali ke Katalog Produk</span>
          </button>
          <span className="text-xs font-black text-heading font-mono">
            Total: Rp {finalPayableTotal.toLocaleString('id-ID')}
          </span>
        </div>
        
        {/* Customer Header Button */}
        <button
          onClick={() => setShowCustomerPicker(true)}
          className="w-full px-4 py-3 border-b border-line bg-card flex items-center justify-between cursor-pointer hover:bg-muted transition-all tour-pos-customer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-black shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
              <UserCheck size={18} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-black text-heading truncate group-hover:text-primary transition-colors">
                {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                <span className="text-[10px] font-bold text-dim">
                  {selectedCustomer ? (TIER_LABEL[selectedCustomer.customer_tier] || 'Regular') : 'Non-Member'}
                </span>
                {selectedCustomer?.loyalty_points ? (
                  <span className="text-[9px] font-extrabold bg-warning-soft text-warning dark:bg-amber-950/40 dark:text-warning px-1.5 py-0.2 rounded-full">
                    {selectedCustomer.loyalty_points} Poin
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-card dark:bg-muted border border-line text-body dark:text-heading rounded-xl text-[11px] font-bold shadow-xs group-hover:border-primary transition-all">
            <span className="text-[10px] text-primary">F3</span>
            <span>Ubah</span>
          </div>
        </button>

        {/* Cart Item Header & Held Transactions Pill */}
        <div className="px-4 py-2 bg-muted/80 dark:bg-card/40 border-b border-line flex items-center justify-between text-xs font-bold text-dim shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={14} className="text-primary" />
            <span>Keranjang ({cart.length})</span>
          </div>
          
          <div className="flex items-center gap-2">
            {holds.length > 0 && (
              <button
                onClick={() => handleResume(holds[0])}
                className="flex items-center gap-1 px-2 py-0.5 bg-warning-soft dark:bg-amber-950/40 text-warning dark:text-warning border border-warning/30 dark:border-warning rounded-lg text-[10px] font-extrabold animate-pulse"
                title="Lanjutkan Transaksi Tertahan (F5)"
              >
                <PlayCircle size={11} /> {holds.length} Tertahan
              </button>
            )}
            <span className="text-[11px] font-extrabold text-dim">
              {cart.reduce((s, l) => s + l.qty, 0)} Pcs
            </span>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 tour-pos-cart">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dim p-6 text-center select-none">
              <div className="w-16 h-16 rounded-xl bg-muted/80 flex items-center justify-center text-dim mb-3 border border-line/80 dark:border-line-strong/80">
                <ShoppingCart size={28} className="opacity-40" />
              </div>
              <p className="text-sm font-extrabold text-heading">Keranjang Masih Kosong</p>
              <p className="text-xs text-dim mt-1 max-w-[200px] leading-relaxed">
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
                  className={`p-3.5 rounded-xl border transition-all relative ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary-soft dark:bg-primary-soft shadow-xs'
                      : l.is_bogo_free
                        ? 'bg-success-soft/60 dark:bg-success/20 border-success/30 dark:border-success/50'
                        : 'bg-card border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {l.is_bogo_free && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-success text-white shrink-0">
                            GRATIS
                          </span>
                        )}
                        <h4 className="font-extrabold text-xs text-heading line-clamp-1 leading-snug">
                          {l.item_name}
                        </h4>
                      </div>

                      {/* Click-to-Edit Price Row */}
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[11px] font-bold text-dim">Rp</span>
                          <input
                            ref={priceEditInputRef}
                            type="number"
                            value={editingPriceVal}
                            onChange={e => setEditingPriceVal(e.target.value)}
                            className="w-24 text-xs font-bold px-2 py-1 border-2 border-primary rounded-xl bg-card dark:bg-input text-heading outline-none"
                          />
                          <button
                            onClick={e => { e.stopPropagation(); commitPriceEdit(); }}
                            className="p-1 bg-success hover:bg-success text-white rounded-lg"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); cancelPriceEdit(); }}
                            className="p-1 bg-line text-body hover:bg-danger hover:text-white rounded-lg"
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
                          <span className="text-xs font-semibold text-dim group-hover/price:text-primary group-hover/price:underline">
                            Rp {l.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-dim">/ {l.unit_name}</span>
                          {!l.is_bogo_free && (
                            <Edit3 size={11} className="text-dim opacity-60 group-hover/price:opacity-100 group-hover/price:text-primary" />
                          )}
                        </div>
                      )}

                      {l.discount_amount > 0 && (
                        <div className="mt-1">
                          <span className="text-[10px] font-bold bg-success-soft dark:bg-success/40 text-success dark:text-success px-1.5 py-0.5 rounded-md border border-success/30 dark:border-success/40">
                            Diskon -Rp {l.discount_amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={e => { e.stopPropagation(); removeItem(l.item_id); }}
                      className="text-dim hover:text-danger hover:bg-danger-soft dark:hover:bg-danger/30 p-1.5 rounded-xl transition-all"
                      title="Hapus Item (Delete)"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Subtotal & Accessible Quantity Steppers */}
                  <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between">
                    {isEditingSubtotal ? (
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] font-bold text-dim">Rp</span>
                        <input
                          ref={subtotalEditInputRef}
                          type="number"
                          value={editingSubtotalVal}
                          onChange={e => setEditingSubtotalVal(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitSubtotalEdit(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelSubtotalEdit(); }
                          }}
                          className="w-24 text-xs font-bold px-2 py-1 border-2 border-primary rounded-xl bg-card dark:bg-input text-heading outline-none"
                          autoFocus
                        />
                        <button
                          onClick={e => { e.stopPropagation(); commitSubtotalEdit(); }}
                          className="p-1 bg-success hover:bg-success text-white rounded-lg cursor-pointer"
                          title="Simpan Subtotal"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); cancelSubtotalEdit(); }}
                          className="p-1 bg-line text-body hover:bg-danger hover:text-white rounded-lg cursor-pointer"
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
                        <span className="text-[10px] uppercase font-bold text-dim block group-hover/subtotal:text-primary transition-colors">
                          Subtotal {!l.is_bogo_free && <Edit3 size={9} className="inline ml-0.5 opacity-60 group-hover/subtotal:opacity-100 text-primary" />}
                        </span>
                        <span className="font-black text-xs sm:text-sm text-primary font-mono group-hover/subtotal:underline">
                          Rp {((l.qty * l.price) - l.discount_amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    {!l.is_bogo_free && (
                      <div className="flex items-center bg-muted/80 rounded-xl p-1 border border-line/80 dark:border-line-strong/80 shadow-xs">
                        <button
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, -1); }}
                          className="w-7 h-7 flex items-center justify-center bg-card dark:bg-line-strong text-body dark:text-heading hover:bg-danger-soft hover:text-danger rounded-xl transition-all font-bold shadow-xs active:scale-95 cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-heading font-mono">
                          {l.qty}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); updateQty(l.item_id, 1); }}
                          className="w-7 h-7 flex items-center justify-center bg-card dark:bg-line-strong text-body dark:text-heading hover:bg-primary hover:text-white rounded-xl transition-all font-bold shadow-xs active:scale-95 cursor-pointer"
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
        <div className="p-3.5 bg-muted/90 dark:bg-card/60 border-t border-line shrink-0 space-y-3">
          
          {/* Detailed Breakdown */}
          {(cartDiscount > 0 || currentTierDiscountPercent > 0 || taxRate > 0) && (
            <div className="space-y-1.5 py-1 text-xs border-b border-line">
              {cartDiscount > 0 && (
                <div className="flex justify-between items-center text-body">
                  <span>Diskon Promo</span>
                  <span className="font-bold text-success dark:text-success">-Rp {cartDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {currentTierDiscountPercent > 0 && (
                <div className="flex justify-between items-center text-primary dark:text-primary font-semibold">
                  <span className="flex items-center gap-1"><Crown size={12} /> Diskon Member ({currentTierDiscountPercent}%)</span>
                  <span>-Rp {tierDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between items-center text-dim">
                  <span>Pajak ({taxRate}% - {taxMode})</span>
                  <span>{taxMode === 'exclude' ? '+' : ''}Rp {taxAmount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          )}

          {/* 🌟 HERO TOTAL BOX (WITH DIRECT CLICK-TO-EDIT & OLD PRICE VISIBLE) 🌟 */}
          <div 
            onClick={cart.length > 0 ? startEditGrandTotal : undefined}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer tour-pos-total relative overflow-hidden group ${
              customGrandTotal !== null
                ? 'bg-warning/10 border-warning/60 dark:bg-amber-950/20 dark:border-warning/60'
                : 'bg-card border-line hover:border-primary hover:shadow-md'
            }`}
            title="Klik untuk ubah / negosiasi total harga (F8 / Alt+T)"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-dim">
                    TOTAL AKHIR
                  </span>
                  <span className="text-[9px] font-bold bg-primary-soft text-primary px-1.5 py-0.2 rounded-md group-hover:bg-primary group-hover:text-white transition-all">
                    F8 / Klik Edit
                  </span>
                </div>

                {/* Show Old Price when Custom Override is Active */}
                {customGrandTotal !== null && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span className="text-dim line-through font-mono font-bold">
                      Rp {Math.round(calculatedGrandTotal).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] font-bold text-warning dark:text-warning bg-warning-soft dark:bg-amber-950/60 px-1.5 py-0.2 rounded-md">
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
                  className="flex items-center gap-1 px-2 py-1 bg-warning/30/80 hover:bg-warning dark:bg-warning/60 dark:hover:bg-warning text-warning dark:text-warning-soft text-[10px] font-bold rounded-lg transition-all"
                  title="Kembalikan ke Total Hitungan Normal"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            {/* Total Price Display / Inline Edit Mode */}
            {isEditingTotal ? (
              <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <span className="text-base font-black text-primary">Rp</span>
                <input
                  ref={totalEditInputRef}
                  type="number"
                  value={customTotalInput}
                  onChange={e => setCustomTotalInput(e.target.value)}
                  placeholder={calculatedGrandTotal.toString()}
                  className="w-full text-xl font-black px-3 py-1.5 border-2 border-primary rounded-xl bg-card dark:bg-input text-heading outline-none font-mono"
                />
                <button
                  onClick={commitGrandTotalEdit}
                  className="px-3 py-2 bg-success hover:bg-success text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs"
                >
                  <Check size={14} /> OK
                </button>
                <button
                  onClick={cancelGrandTotalEdit}
                  className="px-3 py-2 bg-line hover:bg-line-strong text-body dark:text-heading font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-black text-heading font-mono tracking-tight group-hover:text-primary transition-colors">
                  Rp {Math.round(finalPayableTotal).toLocaleString('id-ID')}
                </span>
                <Edit3 size={16} className="text-dim group-hover:text-primary transition-colors ml-2" />
              </div>
            )}
          </div>

          {/* Action Button Grid */}
          <div className="grid grid-cols-5 gap-2.5">
            <button
              onClick={handleHold}
              disabled={cart.length === 0}
              className="col-span-2 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold bg-card dark:bg-muted border border-line text-heading hover:bg-muted dark:hover:bg-line-strong disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              <PauseCircle size={15} /> Tahan (F4)
            </button>

            <button
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="col-span-3 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black bg-primary hover:bg-primary-hover text-white shadow-sm shadow-primary/25 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all tour-pos-payment cursor-pointer"
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

      {/* Floating Bottom Cart Pill (When mobile cashier is browsing catalog with items in cart) */}
      {cart.length > 0 && mobilePosTab === 'catalog' && (
        <div
          onClick={() => setMobilePosTab('cart')}
          className="lg:hidden fixed bottom-18 left-3 right-3 z-30 bg-primary text-white p-3.5 rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
            <span className="text-xs font-black">
              Rp {finalPayableTotal.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold">
            <span>Lihat Keranjang &amp; Bayar</span>
            <ArrowRight size={14} />
          </div>
        </div>
      )}
    </div>
  );
}
