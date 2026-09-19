import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  LayoutGrid,
  List,
  ArrowRight,
} from 'lucide-react';

interface PosProduct {
  id: string;
  name: string;
  category: string;
  retailPrice: number;
  stock: number;
  unit: string;
  sku: string;
  imageColor: string;
}

const POS_PRODUCTS: PosProduct[] = [
  { id: '1', name: 'Signature Iced Latte 250ml', category: 'Beverages', retailPrice: 4.5, stock: 48, unit: 'Btl', sku: 'KV-COF-01', imageColor: '#8A4B20' },
  { id: '2', name: 'Artisan Jasmine Green Tea', category: 'Beverages', retailPrice: 2.5, stock: 65, unit: 'Cup', sku: 'KV-TEA-02', imageColor: '#2B8A3E' },
  { id: '3', name: 'Mountain Spring Water 600ml', category: 'Beverages', retailPrice: 1.5, stock: 120, unit: 'Btl', sku: 'KV-WTR-03', imageColor: '#1E88E5' },
  { id: '4', name: 'Toasted Chocolate Brioche', category: 'Bakery', retailPrice: 3.5, stock: 24, unit: 'Bks', sku: 'KV-BAK-04', imageColor: '#E65100' },
  { id: '5', name: 'Truffle Potato Crisps 75g', category: 'Snacks', retailPrice: 5.5, stock: 35, unit: 'Bks', sku: 'KV-SNK-05', imageColor: '#F57C00' },
  { id: '6', name: 'Premium Jasmine Rice 5kg', category: 'Groceries', retailPrice: 18.0, stock: 18, unit: 'Bag', sku: 'KV-RIC-06', imageColor: '#5D4037' },
  { id: '7', name: 'Organic Pure Olive Oil 1L', category: 'Groceries', retailPrice: 12.5, stock: 42, unit: 'Btl', sku: 'KV-OIL-07', imageColor: '#FBC02D' },
  { id: '8', name: 'Paracetamol 500mg Strip 10s', category: 'Pharmacy', retailPrice: 3.0, stock: 80, unit: 'Str', sku: 'KV-MED-08', imageColor: '#00897B' },
  { id: '9', name: 'Botanical Herbal Bar Soap 85g', category: 'Personal Care', retailPrice: 4.0, stock: 28, unit: 'Pcs', sku: 'KV-SOAP-09', imageColor: '#7B1FA2' },
];

const CATEGORIES = ['All', 'Beverages', 'Bakery', 'Snacks', 'Groceries', 'Pharmacy', 'Personal Care'];

interface CartItem {
  product: PosProduct;
  qty: number;
  discPercent: number;
}

export const RealPosView: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isVipMember, setIsVipMember] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(50);
  const [receiptSuccess, setReceiptSuccess] = useState(false);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Cart state initialized with realistic starter items
  const [cart, setCart] = useState<CartItem[]>([
    { product: POS_PRODUCTS[0], qty: 2, discPercent: 0 },
    { product: POS_PRODUCTS[4], qty: 1, discPercent: 0 },
    { product: POS_PRODUCTS[1], qty: 1, discPercent: 0 },
  ]);

  const fmtPrice = (n: number) => '$' + n.toFixed(2);

  const addToCart = (prod: PosProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === prod.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product: prod, qty: 1, discPercent: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.retailPrice * item.qty, 0);
  const vipDiscount = isVipMember ? Number((subtotal * 0.05).toFixed(2)) : 0;
  const tax = Number(((subtotal - vipDiscount) * 0.08).toFixed(2));
  const grandTotal = Number((subtotal - vipDiscount + tax).toFixed(2));
  const change = Math.max(0, Number((cashGiven - grandTotal).toFixed(2)));

  const filteredProducts = POS_PRODUCTS.filter(p => {
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setReceiptSuccess(true);
  };

  const handleResetSale = () => {
    setReceiptSuccess(false);
    setCart([
      { product: POS_PRODUCTS[0], qty: 1, discPercent: 0 },
      { product: POS_PRODUCTS[2], qty: 2, discPercent: 0 },
    ]);
  };

  return (
    <div className="real-pos-layout">
      {/* Mobile Segmented Toggle (Only on mobile <= 1024px) */}
      <div className="pos-mobile-segmented-bar">
        <button
          type="button"
          className={`pos-mobile-tab-btn ${mobileTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setMobileTab('catalog')}
        >
          <LayoutGrid size={14} />
          <span>Catalog ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          className={`pos-mobile-tab-btn ${mobileTab === 'cart' ? 'active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          <ShoppingCart size={14} />
          <span>Cart ({cart.reduce((sum, item) => sum + item.qty, 0)}) · {fmtPrice(grandTotal)}</span>
          {cart.length > 0 && <span className="pos-mobile-cart-badge">{cart.reduce((sum, item) => sum + item.qty, 0)}</span>}
        </button>
      </div>

      {/* Left Column: Product Catalog & Category Tabs */}
      <div className={`pos-catalog-side ${mobileTab === 'catalog' ? 'mobile-visible' : 'mobile-hidden'}`}>
        {/* Search & Layout Bar */}
        <div className="pos-top-toolbar">
          <div className="pos-search-input-box">
            <Search size={15} className="text-dim" />
            <input
              type="text"
              placeholder="Search product name, SKU, or scan barcode (F4)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pos-search-field"
            />
          </div>

          <div className="pos-view-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="pos-cat-scroll">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`pos-cat-pill ${selectedCat === cat ? 'active' : ''}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid / List */}
        <div className={`pos-items-${viewMode}`}>
          {filteredProducts.map(prod => {
            const inCart = cart.find(c => c.product.id === prod.id);
            return (
              <div
                key={prod.id}
                className={`pos-prod-card ${inCart ? 'in-cart' : ''}`}
                onClick={() => addToCart(prod)}
              >
                <div className="prod-card-thumb" style={{ background: prod.imageColor }}>
                  <span className="thumb-initial">{prod.name.charAt(0)}</span>
                  {inCart && <span className="in-cart-badge">{inCart.qty}x</span>}
                </div>
                <div className="prod-card-info">
                  <span className="prod-sku">{prod.sku}</span>
                  <div className="prod-name">{prod.name}</div>
                  <div className="prod-bottom-row">
                    <span className="prod-price tnum">{fmtPrice(prod.retailPrice)}</span>
                    <span className="prod-stock">Stock {prod.stock}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Cart & Cashier Checkout */}
      <div className={`pos-cart-side ${mobileTab === 'cart' ? 'mobile-visible' : 'mobile-hidden'}`}>
        {/* Mobile back to catalog button */}
        <div className="pos-mobile-cart-back-row">
          <button
            type="button"
            className="pos-mobile-back-btn"
            onClick={() => setMobileTab('catalog')}
          >
            ← Back to Products Catalog
          </button>
        </div>
        {/* Cart Header */}
        <div className="pos-cart-header">
          <div className="cart-header-left">
            <ShoppingCart size={16} className="text-primary" />
            <span className="cart-header-title">Sales Order</span>
            <span className="cart-count-pill">{cart.length}</span>
          </div>

          <button
            type="button"
            className={`member-vip-pill ${isVipMember ? 'vip-active' : ''}`}
            onClick={() => setIsVipMember(!isVipMember)}
            title="Click to toggle VIP customer"
          >
            <UserCheck size={13} />
            <span>{isVipMember ? 'Sarah · VIP (5%)' : 'Guest Customer'}</span>
          </button>
        </div>

        {/* Cart Items List */}
        <div className="pos-cart-list">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <ShoppingCart size={32} className="text-dim opacity-40 mb-2" />
              <span>Shopping cart is empty</span>
              <small className="text-dim">Select items from the catalog on the left</small>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-line-item">
                <div className="cart-line-top">
                  <span className="cart-line-name">{item.product.name}</span>
                  <button
                    type="button"
                    className="cart-del-btn"
                    onClick={() => removeItem(item.product.id)}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="cart-line-bottom">
                  <div className="cart-line-price tnum">{fmtPrice(item.product.retailPrice)}</div>

                  <div className="cart-qty-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => updateQty(item.product.id, -1)}
                    >
                      <Minus size={11} />
                    </button>
                    <span className="qty-val tnum">{item.qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => updateQty(item.product.id, 1)}
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="cart-line-subtotal tnum font-bold text-heading">
                    {fmtPrice(item.product.retailPrice * item.qty)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculations Summary */}
        <div className="pos-cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span className="tnum text-heading">{fmtPrice(subtotal)}</span>
          </div>

          {isVipMember && (
            <div className="summary-row discount-row">
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Sparkles size={12} /> VIP Discount (5%)
              </span>
              <span className="tnum text-primary font-semibold">-{fmtPrice(vipDiscount)}</span>
            </div>
          )}

          <div className="summary-row">
            <span>Sales Tax (8%)</span>
            <span className="tnum text-dim">{fmtPrice(tax)}</span>
          </div>

          <div className="summary-grand-total">
            <span className="grand-label">Grand Total</span>
            <span className="grand-val tnum text-primary">{fmtPrice(grandTotal)}</span>
          </div>

          {/* Payment Method Selector */}
          <div className="pay-methods-tabs">
            <button
              type="button"
              className={`pay-tab-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote size={14} />
              <span>Cash</span>
            </button>
            <button
              type="button"
              className={`pay-tab-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('qris')}
            >
              <Smartphone size={14} />
              <span>QR Pay</span>
            </button>
            <button
              type="button"
              className={`pay-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard size={14} />
              <span>Debit / Card</span>
            </button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="cash-tendered-row">
              <span className="text-xs text-dim">Tendered:</span>
              <div className="cash-preset-pills">
                {[20, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    className={`preset-pill ${cashGiven === val ? 'on' : ''}`}
                    onClick={() => setCashGiven(val)}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <span className="text-xs text-dim ml-auto">Change: <b className="text-success font-mono">{fmtPrice(change)}</b></span>
            </div>
          )}

          {/* Action Checkout Buttons */}
          <div className="cart-checkout-actions">
            <button
              type="button"
              className="btn-outline-clear"
              onClick={clearCart}
              disabled={cart.length === 0}
              title="Clear cart"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              className="btn-primary-charge"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              <span>Charge &amp; Print Receipt (F9)</span>
              <span className="charge-val tnum">{fmtPrice(grandTotal)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Receipt Modal */}
      {receiptSuccess && (
        <div className="receipt-modal-backdrop" onClick={() => setReceiptSuccess(false)}>
          <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <div className="success-check-circle">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="receipt-title">Transaction Successful!</h4>
              <p className="receipt-sub">Invoice #KV-001285 committed to local SQLite &amp; cloud queue</p>
            </div>

            <div className="receipt-print-preview">
              <div className="receipt-paper">
                <div className="paper-head">
                  <div className="paper-store-name">KIVO STORE · FLAGSHIP STORE</div>
                  <div className="paper-store-sub">452 Innovation Blvd, Suite 100</div>
                  <div className="paper-divider">--------------------------------</div>
                </div>

                <div className="paper-items">
                  {cart.map(item => (
                    <div key={item.product.id} className="paper-line">
                      <span>{item.qty}x {item.product.name}</span>
                      <span className="tnum">{fmtPrice(item.product.retailPrice * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="paper-divider">--------------------------------</div>
                <div className="paper-totals">
                  <div className="paper-line">
                    <span>Subtotal</span>
                    <span className="tnum">{fmtPrice(subtotal)}</span>
                  </div>
                  {isVipMember && (
                    <div className="paper-line">
                      <span>VIP Discount (5%)</span>
                      <span className="tnum">-{fmtPrice(vipDiscount)}</span>
                    </div>
                  )}
                  <div className="paper-line font-bold">
                    <span>TOTAL</span>
                    <span className="tnum">{fmtPrice(grandTotal)}</span>
                  </div>
                  <div className="paper-line">
                    <span>Paid ({paymentMethod.toUpperCase()})</span>
                    <span className="tnum">{fmtPrice(paymentMethod === 'cash' ? cashGiven : grandTotal)}</span>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="paper-line">
                      <span>Change</span>
                      <span className="tnum">{fmtPrice(change)}</span>
                    </div>
                  )}
                </div>

                <div className="paper-footer">
                  <div>Thank You For Shopping With Us</div>
                  <div className="paper-escpos">Thermal ESC/POS 58mm · Offline 0ms</div>
                </div>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                type="button"
                className="btn-print-receipt"
                onClick={() => {
                  alert('Printing thermal receipt to ESC/POS USB/LAN printer...');
                  handleResetSale();
                }}
              >
                <Printer size={15} />
                <span>Reprint Receipt</span>
              </button>
              <button
                type="button"
                className="btn-next-sale"
                onClick={handleResetSale}
              >
                <span>New Sale (Esc)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Bar (When on mobile catalog tab) */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="pos-floating-mobile-bar" onClick={() => setMobileTab('cart')}>
          <div className="pfm-left">
            <span className="pfm-count">{cart.reduce((s, i) => s + i.qty, 0)} Items</span>
            <span className="pfm-sep">·</span>
            <span className="pfm-total">{fmtPrice(grandTotal)}</span>
          </div>
          <div className="pfm-right">
            <span>Checkout</span>
            <ArrowRight size={14} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RealPosView;
