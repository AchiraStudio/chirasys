import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Lightbulb,
} from 'lucide-react';

interface RealAiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  time: string;
  text: string;
  tableData?: Array<{ item: string; stock: string; hpp: string; recommendation: string }>;
}

export const RealAiChatModal: React.FC<RealAiChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      time: '14:30',
      text: 'Hello! I am Kivo AI Copilot, connected directly to your store\'s local SQLite database. All queries execute on your local device without leaking proprietary business data to third-party clouds. How can I assist your analysis today?',
    },
    {
      id: '2',
      sender: 'user',
      time: '14:31',
      text: 'Which products are top sellers today, and are any inventory items due for urgent reordering?',
    },
    {
      id: '3',
      sender: 'assistant',
      time: '14:31',
      text: 'Based on 184 POS transactions recorded today (last sync at 14:28), here is the product velocity breakdown and purchase order (PO) recommendations:',
      tableData: [
        { item: 'Bottled Cold Brew Coffee 250ml', stock: '6 Boxes left (144 pcs)', hpp: '$0.80 / btl', recommendation: 'Healthy stock for next 4 days' },
        { item: 'Artisan Chocolate Croissant', stock: '6 Packs left (Critical!)', hpp: '$1.25 / pack', recommendation: 'Immediately issue PO to Metro Bakehouse' },
        { item: 'Pure Mineral Water 600ml', stock: '240 Bottles left', hpp: '$0.35 / btl', recommendation: 'Stock level optimal' },
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSend = (text?: string) => {
    const q = text || inputText;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      time: '14:33',
      text: q,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        time: '14:33',
        text: `Analysis complete for "${q}": Estimated gross profit is $3,820.00 (30.7% margin). Digital / Card payments account for 55% of turnover, while Cash represents 45%. Recommendation: maintain snack impulse displays near checkout counter.`,
      };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const SUGGESTIONS = [
    'What is today\'s estimated gross profit margin?',
    'Check items approaching expiration this month',
    'Who are the top 5 loyalty customers by lifetime spend?',
  ];

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-modal-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-head">
          <div className="flex items-center gap-2">
            <div className="ai-head-icon">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="ai-head-title">Kivo AI Assistant (BYOK)</div>
              <div className="ai-head-sub">Connected to local SQLite · OpenAI GPT-4o / Claude 3.5 Sonnet</div>
            </div>
          </div>

          <button type="button" className="ai-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="ai-modal-body">
          {messages.map(msg => (
            <div key={msg.id} className={`ai-chat-bubble ${msg.sender}`}>
              <div className="ai-bubble-avatar">
                {msg.sender === 'assistant' ? <Bot size={14} /> : <User size={14} />}
              </div>

              <div className="ai-bubble-content">
                <div className="ai-bubble-meta">
                  <span>{msg.sender === 'assistant' ? 'Kivo Copilot' : 'Store Owner'}</span>
                  <span>{msg.time}</span>
                </div>
                <div className="ai-bubble-text">{msg.text}</div>

                {msg.tableData && (
                  <div className="ai-data-card mt-2">
                    <table className="ai-mini-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Stock Status</th>
                          <th>Cost (COGS)</th>
                          <th>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.tableData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-heading">{row.item}</td>
                            <td>{row.stock}</td>
                            <td className="tnum">{row.hpp}</td>
                            <td className="text-primary font-semibold">{row.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="ai-suggestions-row">
          {SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="ai-chip-btn"
              onClick={() => handleSend(chip)}
            >
              <Lightbulb size={12} className="text-accent" />
              <span>{chip}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="ai-modal-foot">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="ai-input-form"
          >
            <input
              type="text"
              placeholder="Ask about sales velocity, inventory depletion, or margin analysis..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="ai-input-field"
            />
            <button type="submit" className="ai-send-btn" disabled={!inputText.trim()}>
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RealAiChatModal;
