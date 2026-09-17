import React from 'react';
import { BookOpen, Database, TrendingUp, Coins, ShoppingCart, Package } from 'lucide-react';

export const AccountingDeepDive: React.FC = () => {
  return (
    <section className="section tint" id="accounting">
      <div className="wrap split">
        <div data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot"></span>ACCOUNTING
          </div>
          <h2 className="h2">Books that write themselves.</h2>
          <p className="lead">
            Every business event becomes a balanced double-entry journal. You review; Kivo records.
          </p>
          <ul className="blist">
            <li>
              <BookOpen size={16} />
              <span>
                <b>Automatic journals</b> from sales, receiving, adjustments, and returns.
              </span>
            </li>
            <li>
              <Database size={16} />
              <span>
                <b>Full Chart of Accounts</b> — assets, liabilities, equity, revenue, COGS, expenses.
              </span>
            </li>
            <li>
              <TrendingUp size={16} />
              <span>
                <b>Reports</b> — Laba Rugi (P&amp;L), Neraca (Balance Sheet), Trial Balance.
              </span>
            </li>
            <li>
              <Coins size={16} />
              <span>
                <b>Inventory valuation</b> by Average, FIFO, or LIFO.
              </span>
            </li>
          </ul>
        </div>

        <div className="card" data-reveal style={{ '--d': '100ms' } as React.CSSProperties}>
          <div className="hiw">
            <div className="hiw-step">
              <span className="hs-ic">
                <ShoppingCart size={16} />
              </span>
              <div>
                <b>POS sale #001284</b>
                <p>Rp 86.000 paid via QRIS · 3 items</p>
              </div>
            </div>

            <div className="hiw-step">
              <span className="hs-ic">
                <Package size={16} />
              </span>
              <div>
                <b>Inventory changes</b>
                <p>3 items reserved · COGS computed at Rp 51.500</p>
              </div>
            </div>

            <div className="hiw-step">
              <span className="hs-ic">
                <BookOpen size={16} />
              </span>
              <div>
                <b>Journal JE-4412 posted</b>
                <p>Dr Cash 86.000 / Cr Revenue 86.000 · Dr COGS 51.500 / Cr Inventory 51.500</p>
              </div>
            </div>

            <div className="hiw-step">
              <span className="hs-ic">
                <TrendingUp size={16} />
              </span>
              <div>
                <b>Statements updated</b>
                <p>Laba Rugi and Neraca reflect the sale instantly — no export, no re-entry.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountingDeepDive;

