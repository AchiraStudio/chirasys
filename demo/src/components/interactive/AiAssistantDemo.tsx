import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

interface QuestionAnswer {
  q: string;
  a: string;
  cols?: string[];
  rows?: (string | number)[][];
}

const KNOWLEDGE_BASE: { [key: string]: QuestionAnswer } = {
  q1: {
    q: 'What is today\'s revenue breakdown across all store branches?',
    a: 'Across all 3 active branches today, total revenue reached $12,450.00 from 184 transactions. Flagship Store contributed the largest share (58.1%), up 8.2% compared to yesterday at the same hour.',
    cols: ['Store Branch', 'Transactions', 'Total Revenue', 'Contribution'],
    rows: [
      ['Flagship Store (Downtown)', '107', '$7,240.00', '58.1%'],
      ['Westside Branch', '44', '$3,180.00', '25.5%'],
      ['Uptown Kiosk', '33', '$2,030.00', '16.4%'],
    ],
  },
  q2: {
    q: 'Which items are running low and need reordering?',
    a: 'Based on sales velocity over the past 30 days, 5 products have fallen below safe safety stock thresholds. Here are the suggested supplier purchase orders (PO):',
    cols: ['Product Name', 'Current Stock', 'Min Threshold', 'Suggested PO Qty'],
    rows: [
      ['Bottled Cold Brew 250ml', '4 PCS', '10 PCS', '+36 PCS (1.5 Box)'],
      ['Organic Cane Sugar 1kg', '6 PACK', '20 PACK', '+28 PACK'],
      ['Jasmine Green Tea 25s', '8 BOX', '24 BOX', '+32 BOX'],
      ['BBQ Potato Crisps 85g', '5 PCS', '15 PCS', '+20 PCS'],
      ['Whole Milk 1L Tetra', '12 PCS', '36 PCS', '+24 PCS (2 Box)'],
    ],
  },
  q3: {
    q: 'Who are our top loyalty members by total spend this month?',
    a: 'The top 3 VIP members contributed $5,415.50 this month. Sarah Jenkins leads with 214 visits and the highest accrued reward points.',
    cols: ['Customer Name', 'Tier', 'Orders', 'Reward Points', 'Lifetime Spend'],
    rows: [
      ['Sarah Jenkins', 'VIP Gold', '214', '1,240 Pts', '$2,140.00'],
      ['Michael Chen', 'Member Regular', '96', '610 Pts', '$1,820.50'],
      ['Emily Davis', 'Member Regular', '74', '430 Pts', '$1,455.00'],
    ],
  },
  q4: {
    q: 'Check inventory batches expiring within 30 days!',
    a: 'Detected 3 batch lots expiring within the next 30 days. Batch B-2408 on Jasmine Green Tea is most urgent — recommended action: activate register promotional bundling/discount.',
    cols: ['Product', 'Batch Lot', 'Expiry Date', 'Remaining Stock', 'Urgency'],
    rows: [
      ['Jasmine Green Tea', 'B-2408', 'Oct 30, 2026', '18 PCS', 'Urgent (14 days)'],
      ['Artisan Croissant', 'B-2412', 'Nov 08, 2026', '24 PCS', 'Caution (22 days)'],
      ['Strawberry Greek Yogurt', 'B-2410', 'Nov 15, 2026', '36 PCS', 'Attention (29 days)'],
    ],
  },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cols?: string[];
  rows?: (string | number)[][];
}

export const AiAssistantDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'user',
      content: 'Which items are running low and need reordering?',
    },
    {
      role: 'assistant',
      content: KNOWLEDGE_BASE.q2.a,
      cols: KNOWLEDGE_BASE.q2.cols,
      rows: KNOWLEDGE_BASE.q2.rows,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const handleAsk = (key: string) => {
    if (isTyping) return;
    const qa = KNOWLEDGE_BASE[key];
    if (!qa) return;

    setMessages(prev => [...prev, { role: 'user', content: qa.q }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: qa.a, cols: qa.cols, rows: qa.rows },
      ]);
      setIsTyping(false);
    }, 900);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isTyping) return;
    const text = inputVal.trim();
    setInputVal('');

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            `Analysis for: "${text}" — Based on your local SQLite dataset, all store transactions are running normally with an average gross margin of 32.4%, and zero register cash variance detected.`,
        },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <section className="section" id="ai">
      <div className="wrap">
        <div className="sec-head center" data-reveal>
          <div className="eyebrow ep">
            <span className="eb-dot" />
            <span>KIVO AI COPILOT</span>
          </div>
          <h2 className="h2">Ask Anything. Answers Backed by Your Real Ledger.</h2>
          <p className="lead">
            Natural language business intelligence querying your local SQLite database directly — zero external data scraping.
          </p>
        </div>

        <div className="ai-wrap">
          <div className="ai-box">
            {/* Messages Scroll Area */}
            <div className="ai-chat" id="aiChat">
              {messages.map((m, idx) => (
                <div key={idx} className={`msg ${m.role === 'user' ? 'user' : ''}`}>
                  <span
                    className="m-av"
                    style={{
                      background:
                        m.role === 'user'
                          ? 'var(--muted)'
                          : 'var(--primary-soft)',
                      color:
                        m.role === 'user' ? 'var(--body)' : 'var(--primary)',
                    }}
                  >
                    {m.role === 'user' ? 'A' : <Sparkles size={14} />}
                  </span>

                  <div className="m-body">
                    <p style={{ lineHeight: 1.6 }}>{m.content}</p>

                    {m.cols && m.rows && (
                      <div className="tbl-in" style={{ marginTop: 10 }}>
                        <table className="ai-table">
                          <thead>
                            <tr>
                              {m.cols.map((col, cIdx) => (
                                <th key={cIdx}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((val, vIdx) => (
                                  <td key={vIdx}>
                                    {vIdx === 0 ? <b>{val}</b> : val}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="msg">
                  <span className="m-av" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    <Sparkles size={14} />
                  </span>
                  <div className="m-body">
                    <span className="typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="ai-chips" id="aiChips">
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q1')}
                disabled={isTyping}
              >
                💰 Today's revenue breakdown?
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q2')}
                disabled={isTyping}
              >
                📦 Check depleted stock
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q3')}
                disabled={isTyping}
              >
                ⭐ Top 3 VIP loyalty members
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q4')}
                disabled={isTyping}
              >
                ⏳ Expiring batch lots
              </button>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Ask Kivo AI anything (e.g. analyze gross margin trends this month)..."
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 'var(--r-btn)',
                  border: '1px solid var(--line)',
                  background: 'var(--card)',
                  color: 'var(--heading)',
                  padding: '0 16px',
                  fontSize: 13.5,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: 42, padding: '0 16px' }}
                disabled={!inputVal.trim() || isTyping}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantDemo;

