import React, { useState } from 'react';
import {
  BookOpen,
  Scale,
  CheckCircle2,
  Download,
} from 'lucide-react';

export const RealAccountingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pl' | 'journal'>('journal');

  const JOURNAL_ENTRIES = [
    {
      date: '15/09 14:28',
      ref: 'POS #KV-1284',
      memo: 'Cash Register Sale (3 items)',
      debitAcc: '1-110 Till Cash',
      creditAcc: '4-100 Retail Sales Revenue',
      debitVal: '$86.00',
      creditVal: '$86.00',
    },
    {
      date: '15/09 14:28',
      ref: 'COGS #KV-1284',
      memo: 'COGS Recognition (FIFO)',
      debitAcc: '5-100 Cost of Goods Sold (COGS)',
      creditAcc: '1-130 Merchandise Inventory',
      debitVal: '$59.50',
      creditVal: '$59.50',
    },
    {
      date: '15/09 14:15',
      ref: 'POS #KV-1283',
      memo: 'Dynamic QR Sale (VIP Member)',
      debitAcc: '1-112 QR Clearing Account',
      creditAcc: '4-100 Retail Sales Revenue',
      debitVal: '$12.50',
      creditVal: '$12.50',
    },
    {
      date: '15/09 11:20',
      ref: 'PO #KV-0841',
      memo: 'Supplier Receiving Settlement (Mayora)',
      debitAcc: '1-130 Merchandise Inventory',
      creditAcc: '1-111 Operating Checking Account',
      debitVal: '$4,250.00',
      creditVal: '$4,250.00',
    },
    {
      date: '14/09 18:30',
      ref: 'SHIFT #46',
      memo: 'Shift Reconciliation & Till Cash Out',
      debitAcc: '1-111 Bank Deposit Transit',
      creditAcc: '1-110 Till Cash',
      debitVal: '$11,450.00',
      creditVal: '$11,450.00',
    },
  ];

  return (
    <div className="real-view-container">
      {/* Top Segmented TabBar */}
      <div className="real-tab-bar-wrapper">
        <div className="segmented-tab-bar">
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => setActiveTab('journal')}
          >
            <BookOpen size={15} />
            <span>Automated Journal &amp; General Ledger</span>
          </button>
          <button
            type="button"
            className={`tab-item-btn ${activeTab === 'pl' ? 'active' : ''}`}
            onClick={() => setActiveTab('pl')}
          >
            <Scale size={15} />
            <span>Profit &amp; Loss &amp; Balance Sheet (P&amp;L)</span>
          </button>
        </div>

        <div className="tab-bar-right-actions">
          <button type="button" className="action-btn-secondary">
            <Download size={14} />
            <span>Export PDF / Excel</span>
          </button>
        </div>
      </div>

      {activeTab === 'journal' && (
        <div className="real-panel mt-3">
          <div className="real-panel-head">
            <div>
              <span className="real-panel-title">Double-Entry General Ledger</span>
              <span className="real-panel-sub">Automatically posted every time a cashier charges an order</span>
            </div>
            <span className="status-pill success">
              <CheckCircle2 size={11} /> 100% Balanced Ledger
            </span>
          </div>

          <div className="real-table-wrapper mt-2">
            <table className="real-data-table">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Reference #</th>
                  <th>Debit &amp; Credit Accounts</th>
                  <th>Transaction Memo</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {JOURNAL_ENTRIES.map((entry, idx) => (
                  <tr key={idx}>
                    <td className="text-dim text-xs font-mono">{entry.date}</td>
                    <td>
                      <span className="mono font-bold text-heading">{entry.ref}</span>
                    </td>
                    <td>
                      <div className="text-xs">
                        <div className="font-semibold text-primary">Dr. {entry.debitAcc}</div>
                        <div className="text-dim pl-3">Cr. {entry.creditAcc}</div>
                      </div>
                    </td>
                    <td className="text-xs text-body">{entry.memo}</td>
                    <td className="text-right font-bold text-heading tnum">{entry.debitVal}</td>
                    <td className="text-right font-bold text-heading tnum">{entry.creditVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pl' && (
        <div className="real-panel mt-3">
          <div className="real-panel-head">
            <div>
              <span className="real-panel-title">Real-Time Profit &amp; Loss Statement</span>
              <span className="real-panel-sub">Period: September 01, 2026 – Present</span>
            </div>
            <span className="badge-tag">POS &amp; Receiving Auto-Integrated</span>
          </div>

          <div className="pl-financial-cards mt-3">
            <div className="pl-stat-box">
              <span className="pl-stat-label">Gross Sales Revenue</span>
              <div className="pl-stat-val tnum text-heading">$42,850.00</div>
              <span className="text-xs text-dim">From 612 customer receipts</span>
            </div>

            <div className="pl-stat-box">
              <span className="pl-stat-label">Cost of Goods Sold (COGS)</span>
              <div className="pl-stat-val tnum text-warning">$29,600.00</div>
              <span className="text-xs text-dim">FIFO inventory valuation</span>
            </div>

            <div className="pl-stat-box highlight">
              <span className="pl-stat-label">Gross Profit</span>
              <div className="pl-stat-val tnum text-primary font-bold">$13,250.00</div>
              <span className="text-xs text-success font-semibold">Profit Margin: 30.9%</span>
            </div>

            <div className="pl-stat-box">
              <span className="pl-stat-label">Operating Expenses (OPEX)</span>
              <div className="pl-stat-val tnum text-dim">$3,400.00</div>
              <span className="text-xs text-dim">Utilities, network, packaging</span>
            </div>

            <div className="pl-stat-box net-box">
              <span className="pl-stat-label font-bold">Net Operating Profit</span>
              <div className="pl-stat-val tnum text-success font-extrabold text-lg">$9,850.00</div>
              <span className="text-xs text-dim">Retained earnings &amp; owner draws</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealAccountingView;
