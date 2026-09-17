import React, { useState } from 'react';
import { Plus, Minus, X, Check, UserCheck, CreditCard, ShoppingBag } from 'lucide-react';

interface Product {
  name: string;
  price: number;
  stock: number;
  category: string;
}

const PRODUCTS: Product[] = [
  { name: 'Kopi Susu Botol 250ml', price: 8500, stock: 24, category: 'Coffee' },
  { name: 'Teh Melati Wangi', price: 6000, stock: 30, category: 'Coffee' },
  { name: 'Air Mineral 600ml', price: 4000, stock: 48, category: 'Drinks' },
  { name: 'Roti Coklat Klasik', price: 12500, stock: 15, category: 'Snacks' },
  { name: 'Snack Kentang Barbeque', price: 9000, stock: 22, category: 'Snacks' },
  { name: 'Paracetamol 500mg Strip', price: 3500, stock: 60, category: 'Pharmacy' },
  { name: 'Sabun Mandi Herbal 75g', price: 17000, stock: 9, category: 'Snacks' },
  { name: 'Kopi Sachet Premium', price: 2000, stock: 120, category: 'Coffee' },
];

const CATEGORIES = ['All', 'Coffee', 'Drinks', 'Snacks', 'Pharmacy'];

export const PosView: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState('All');
  const [cart, setCart] = useState<{ [index: number]: number }>({ 0: 2, 2: 1 });
  const [isMember, setIsMember] = useState(false);
  const [isCharged, setIsCharged] = useState(false);

  const fmtRp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

  const addToCart = (index: number) => {
    setCart(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[index] > 1) {
        next[index] -= 1;
      } else {
        delete next[index];
      }
      return next;
    });
  };

  const deleteFromCart = (index: number) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const filteredProducts = PRODUCTS.filter(
    p => selectedCat === 'All' || p.category === selectedCat
  );

  let subtotal = 0;
  Object.entries(cart).forEach(([iStr, qty]) => {
    const idx = parseInt(iStr, 10);
    subtotal += PRODUCTS[idx].price * qty;
  });

  const discount = isMember ? Math.round(subtotal * 0.05) : 0;
  const grandTotal = subtotal - discount;

  const handleCharge = () => {
    if (Object.keys(cart).length === 0 || isCharged) return;
    setIsCharged(true);
    setTimeout(() => {
      setCart({});
      setIsCharged(false);
    }, 1400);
  };

  return (
    <div className="pos-sim">
      {/* Product Catalog Column */}
      <div className="pos-cat-col">
        <div className="cat-tabs" id="catTabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`cat-tab ${selectedCat === cat ? 'on' : ''}`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="prod-grid" id="prodGrid">
          {filteredProducts.map(p => {
            const realIdx = PRODUCTS.findIndex(orig => orig.name === p.name);
            return (
              <button
                key={p.name}
                type="button"
                className="prod"
                onClick={() => addToCart(realIdx)}
              >
                <div className="p-n">{p.name}</div>
                <div className="p-p">{fmtRp(p.price)}</div>
                <div className="p-s">{p.stock} in stock</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart & Billing Column */}
      <div className="pos-cart-col">
        <div className="cart-head">
          <span style={{ fontWeight: 800, color: 'var(--heading)' }}>Current Sale</span>
          <button
            type="button"
            className="pill"
            id="custPill"
            onClick={() => setIsMember(!isMember)}
            title="Toggle customer loyalty tier"
          >
            <UserCheck size={12} className={isMember ? 'text-primary' : 'text-dim'} />
            <span id="custName">{isMember ? 'Siti · Member VIP' : 'Pelanggan Umum'}</span>
          </button>
        </div>

        <div className="cart-lines" id="cartLines">
          {Object.keys(cart).length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={24} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              Keranjang kosong — klik produk untuk menambahkan.
            </div>
          ) : (
            Object.entries(cart).map(([iStr, qty]) => {
              const idx = parseInt(iStr, 10);
              const p = PRODUCTS[idx];
              return (
                <div key={p.name} className="cline">
                  <span className="cn">{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      style={{ padding: 2, color: 'var(--dim)' }}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="cq">×{qty}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(idx)}
                      style={{ padding: 2, color: 'var(--dim)' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="cp">{fmtRp(p.price * qty)}</span>
                  <button
                    type="button"
                    onClick={() => deleteFromCart(idx)}
                    aria-label="Remove item"
                    style={{ color: 'var(--dim)', marginLeft: 4 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-foot">
          <div className="c-row">
            <span>Subtotal</span>
            <span id="cartSub" className="mono">
              {fmtRp(subtotal)}
            </span>
          </div>
          <div className="c-row" style={{ color: isMember ? 'var(--success)' : 'inherit' }}>
            <span id="discLabel">{isMember ? 'Diskon Member (5%)' : 'Diskon'}</span>
            <span id="cartDisc" className="mono">
              {discount > 0 ? `−${fmtRp(discount)}` : 'Rp 0'}
            </span>
          </div>
          <div className="c-tot">
            <span>Total Bayar</span>
            <span id="cartTotal">{fmtRp(grandTotal)}</span>
          </div>
          <button
            type="button"
            className={`btn btn-primary ${isCharged ? 'ok' : ''}`}
            id="chargeBtn"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleCharge}
            disabled={Object.keys(cart).length === 0}
          >
            {isCharged ? (
              <>
                <Check size={16} />
                <span>Pembayaran Sukses · Struk Dicetak</span>
              </>
            ) : (
              <>
                <CreditCard size={16} />
                <span>Bayar {grandTotal > 0 ? fmtRp(grandTotal) : ''} (F9)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosView;

