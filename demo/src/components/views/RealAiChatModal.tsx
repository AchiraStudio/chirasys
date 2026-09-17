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
      text: 'Halo! Saya Kivo AI Copilot yang terhubung langsung ke database lokal SQLite toko Anda. Semua query dijalankan di perangkat lokal Anda tanpa mengirim rahasia bisnis ke cloud pihak ketiga. Ada yang bisa saya bantu analisa hari ini?',
    },
    {
      id: '2',
      sender: 'user',
      time: '14:31',
      text: 'Produk apa yang paling laris hari ini dan apakah ada yang stoknya perlu segera di-reorder?',
    },
    {
      id: '3',
      sender: 'assistant',
      time: '14:31',
      text: 'Berdasarkan 184 transaksi kasir hari ini (terakhir jam 14:28), berikut analisa performa produk dan rekomendasi pengadaan (PO):',
      tableData: [
        { item: 'Kopi Susu Botol 250ml', stock: 'Sisa 6 Box (144 pcs)', hpp: 'Rp 8.000 / btl', recommendation: 'Aman untuk 4 hari ke depan' },
        { item: 'Roti Coklat Keju Panggang', stock: 'Sisa 6 Bks (Kritis!)', hpp: 'Rp 7.500 / bks', recommendation: 'Segera terbitkan PO ke CV Sumber Rejeki' },
        { item: 'Air Mineral 600ml', stock: 'Sisa 240 Btl', hpp: 'Rp 2.800 / btl', recommendation: 'Stok sangat aman' },
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
        text: `Analisa selesai untuk "${q}": Laba kotor tercatat Rp 3.820.000 (margin 30.7%). Transaksi QRIS menyumbang 30% dari total omzet, sedangkan Tunai masih mendominasi sebesar 45%. Rekomendasi: pertahankan ketersediaan produk snack di dekat meja kasir.`,
      };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const SUGGESTIONS = [
    'Berapa estimasi laba kotor hari ini?',
    'Cek barang yang mendekati kadaluarsa bulan ini',
    'Siapa 5 pelanggan paling loyal dengan total belanja tertinggi?',
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
              <div className="ai-head-sub">Terhubung ke SQLite lokal · Model OpenAI GPT-4o / Claude</div>
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
                  <span>{msg.sender === 'assistant' ? 'Kivo Copilot' : 'Owner'}</span>
                  <span>{msg.time}</span>
                </div>
                <div className="ai-bubble-text">{msg.text}</div>

                {msg.tableData && (
                  <div className="ai-data-card mt-2">
                    <table className="ai-mini-table">
                      <thead>
                        <tr>
                          <th>Nama Produk</th>
                          <th>Status Stok</th>
                          <th>HPP</th>
                          <th>Rekomendasi</th>
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
              placeholder="Tanyakan analisis penjualan, stok, atau margin keuntungan..."
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
