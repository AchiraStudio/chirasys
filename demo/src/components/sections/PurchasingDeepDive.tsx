import React, { useState } from 'react';
import { Truck, Receipt, Package, Boxes, Coins, Calculator } from 'lucide-react';

interface PurchaseStage {
  id: number;
  icon: React.ElementType;
  name: string;
  description: string;
  meta: string;
}

const STAGES: PurchaseStage[] = [
  {
    id: 0,
    icon: Truck,
    name: 'Supplier',
    description: 'Suppliers, price lists, and terms kept in one registry.',
    meta: '34 suppliers',
  },
  {
    id: 1,
    icon: Receipt,
    name: 'Purchase Order',
    description: 'Create a PO with expected quantities and agreed costs.',
    meta: 'PO #0841 · 12 lines · Rp 8.240.000',
  },
  {
    id: 2,
    icon: Package,
    name: 'Goods Received',
    description: 'Receive fully or partially — batches and expiry captured at the door.',
    meta: 'GRN #0512 · received 10 of 12',
  },
  {
    id: 3,
    icon: Boxes,
    name: 'Inventory',
    description: 'Stock levels, batches, and valuation update automatically.',
    meta: '+240 PCS Kopi Susu Botol',
  },
  {
    id: 4,
    icon: Coins,
    name: 'HPP / COGS',
    description: 'Cost of goods recalculated with every receipt.',
    meta: 'HPP Kopi Susu: Rp 5.940 / unit',
  },
  {
    id: 5,
    icon: Calculator,
    name: 'Accounting',
    description: 'Supplier bills, accounts payable, and journals post themselves.',
    meta: 'AP recognized · JE #4412',
  },
];

export const PurchasingDeepDive: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0);
  const cur = STAGES[activeStage];
  const StageIcon = cur.icon;

  return (
    <section className="section" id="purchasing">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="eyebrow">
            <span className="eb-dot"></span>PURCHASING
          </div>
          <h2 className="h2">From supplier to statement, one chain.</h2>
          <p className="lead">
            Purchase orders, receiving, supplier bills, and accounts payable — with costs flowing into HPP and the ledger automatically. Click a stage.
          </p>
        </div>
        <div data-reveal>
          <div className="prail" id="pRail">
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.name}
                  className={`pstage ${idx === activeStage ? 'on' : ''}`}
                  onClick={() => setActiveStage(idx)}
                >
                  <span className="pn">
                    <Icon size={16} />
                  </span>
                  <span className="pt">{s.name}</span>
                </button>
              );
            })}
          </div>

          <div className="card p-detail" id="pDetail">
            <span className="f-ic">
              <StageIcon size={22} />
            </span>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h3>
                {cur.id + 1}. {cur.name}
              </h3>
              <p>{cur.description}</p>
            </div>
            <span className="chip p-meta">{cur.meta}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchasingDeepDive;

