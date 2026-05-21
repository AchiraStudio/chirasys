import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Banknote, PauseCircle, PlayCircle, Loader2 } from 'lucide-react';
import { usePosStore, PosLine, PosHold } from './POSStore';
import { getItemsFiltered, Item } from '../../lib/api';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

export default function POS() {
  const DEFAULT_BRANCH = 'branch_001';
  
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<PosLine[]>([]);
  const [search, setSearch] = useState('');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const holds = usePosStore(state => state.holds);
  const addHold = usePosStore(state => state.addHold);
  const removeHold = usePosStore(state => state.removeHold);

  useEffect(() => {
    // Keep barcode input focused
    const handleGlobalClick = (e: MouseEvent) => {
      // If they clicked on a form element, don't steal focus
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement) return;
      barcodeInputRef.current?.focus();
    };
    window.addEventListener('click', handleGlobalClick);
    
    // F2 shortcut
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'F2') {
            e.preventDefault();
            if (cart.length > 0) setShowPayment(true);
        }
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
        window.removeEventListener('click', handleGlobalClick);
        window.removeEventListener('keydown', handleKeydown);
    };
  }, [cart]);

  useEffect(() => {
    const fetchSearch = async () => {
        if (search.length < 2) { setItems([]); return; }
        setLoading(true);
        try {
            const result = await getItemsFiltered(search, '', '', true, 1, 20);
            setItems(result.items);
        } finally {
            setLoading(false);
        }
    };
    const timer = setTimeout(fetchSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleBarcodeEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && search) {
          // If we have an exact match
          if (items.length === 1) {
              addToCart(items[0]);
              setSearch('');
          } else {
              // Try to find exact SKU
              const exact = items.find(i => i.sku === search);
              if (exact) {
                  addToCart(exact);
                  setSearch('');
              }
          }
      }
  };

  const addToCart = (item: Item) => {
      setCart(prev => {
          const exists = prev.find(l => l.item_id === item.id);
          if (exists) {
              return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
          }
          // Note: wholesale_price will require the item struct to have it, but for now we fallback to standard prices.
          // Since we didn't update Item struct in TS, we'll cast or just use standard price for now
          // Assume standard price is retrieved via api.
          return [...prev, {
              item_id: item.id,
              item_name: item.name,
              unit_id: item.base_unit_id || 'unknown',
              unit_name: item.base_unit_name || 'Unit',
              qty: 1,
              price_type: priceType,
              price: item.price || 0,
              discount_amount: 0,
              hpp_value: item.avg_hpp || 0
          }];
      });
  };

  const updateQty = (itemId: string, delta: number) => {
      setCart(prev => prev.map(l => {
          if (l.item_id === itemId) {
              const newQty = l.qty + delta;
              return newQty > 0 ? { ...l, qty: newQty } : l;
          }
          return l;
      }));
  };

  const removeItem = (itemId: string) => {
      setCart(prev => prev.filter(l => l.item_id !== itemId));
  };

  const total = cart.reduce((sum, l) => sum + (l.qty * l.price) - l.discount_amount, 0);

  const handleHold = () => {
      if (cart.length === 0) return;
      addHold({
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          lines: cart,
          price_type: priceType,
          total
      });
      setCart([]);
  };

  const handleResume = (hold: PosHold) => {
      setCart(hold.lines);
      setPriceType(hold.price_type);
      removeHold(hold.id);
  };

  const handlePaymentSuccess = async (saleId: string) => {
      setCart([]);
      setShowPayment(false);
      setReceiptSaleId(saleId);
  };

  return (
    <div className="flex h-full bg-slate-100 dark:bg-[#0B0F19] p-4 gap-4 animate-in fade-in">
        
        {/* Left Side: Items & Search */}
        <div className="flex-[2] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        ref={barcodeInputRef}
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleBarcodeEnter}
                        placeholder="Scan barcode or type to search..." 
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                        autoFocus
                    />
                </div>
                
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setPriceType('retail')} className={`px-4 py-2 rounded-lg text-sm font-bold ${priceType === 'retail' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Retail</button>
                    <button onClick={() => setPriceType('wholesale')} className={`px-4 py-2 rounded-lg text-sm font-bold ${priceType === 'wholesale' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Wholesale</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {search.length < 2 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <ShoppingCart size={48} className="mb-4 opacity-20" />
                        <p>Search for an item to add it to the cart.</p>
                    </div>
                ) : loading ? (
                    <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-brand" size={32} /></div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {items.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => addToCart(item)}
                                className="flex flex-col text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-brand hover:ring-1 hover:ring-brand transition-all"
                            >
                                <span className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">{item.name}</span>
                                <span className="text-xs text-slate-500 font-mono mb-3">{item.sku}</span>
                                <span className="mt-auto font-bold text-brand">Rp {item.price?.toLocaleString('id-ID')}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Right Side: Cart */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden w-96 min-w-[380px] max-w-[420px]">
            {/* Customer Info */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-brand/5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-brand">
                    <User size={18} />
                    <span className="font-bold text-sm">Walk-in Customer</span>
                </div>
                <button className="text-xs font-bold text-brand hover:underline">Select</button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cart.map(l => (
                            <div key={l.item_id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{l.item_name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Rp {l.price.toLocaleString('id-ID')} / {l.unit_name}</p>
                                </div>
                                <div className="flex flex-col items-end justify-between gap-2">
                                    <span className="font-bold text-sm text-brand">Rp {(l.qty * l.price).toLocaleString('id-ID')}</span>
                                    <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <button onClick={() => updateQty(l.item_id, -1)} className="p-1 hover:text-brand"><Minus size={14}/></button>
                                        <span className="w-8 text-center text-sm font-bold">{l.qty}</span>
                                        <button onClick={() => updateQty(l.item_id, 1)} className="p-1 hover:text-brand"><Plus size={14}/></button>
                                    </div>
                                </div>
                                <button onClick={() => removeItem(l.item_id)} className="text-slate-400 hover:text-rose-500 p-1 self-start"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Holds Area */}
            {holds.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/10 flex gap-2 overflow-x-auto custom-scrollbar">
                    {holds.map(h => (
                        <button key={h.id} onClick={() => handleResume(h)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-lg whitespace-nowrap text-xs font-bold text-amber-700 dark:text-amber-500 hover:bg-amber-50 transition-colors shadow-sm">
                            <PlayCircle size={14} /> Resume {h.timestamp}
                        </button>
                    ))}
                </div>
            )}

            {/* Cart Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 font-medium">Grand Total</span>
                    <span className="text-3xl font-bold text-brand">Rp {total.toLocaleString('id-ID')}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleHold} disabled={cart.length === 0} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">
                        <PauseCircle size={18} /> Hold
                    </button>
                    <button onClick={() => setShowPayment(true)} disabled={cart.length === 0} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-brand text-white hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm">
                        <Banknote size={18} /> Pay (F2)
                    </button>
                </div>
            </div>
        </div>

        {showPayment && (
            <PaymentModal 
                branchId={DEFAULT_BRANCH}
                cart={cart}
                total={total}
                priceType={priceType}
                onClose={() => setShowPayment(false)}
                onSuccess={handlePaymentSuccess}
            />
        )}

        {receiptSaleId && (
            <ReceiptModal 
                saleId={receiptSaleId}
                onClose={() => setReceiptSaleId(null)}
            />
        )}
    </div>
  );
}
