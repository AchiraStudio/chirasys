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
    q: 'Berapa omset toko hari ini dan cabang mana yang tertinggi?',
    a: 'Hari ini dari 3 cabang aktif tercatat total omset Rp 12.450.000 dari 184 transaksi. Toko Utama memberikan kontribusi terbesar (58%) dan penjualan meningkat 8.2% dibandingkan kemarin pada jam yang sama.',
    cols: ['Cabang Toko', 'Jumlah Transaksi', 'Total Omset', 'Kontribusi'],
    rows: [
      ['Toko Utama (Main Store)', '107', 'Rp 7.240.000', '58.1%'],
      ['Cabang Bandung', '44', 'Rp 3.180.000', '25.5%'],
      ['Cabang Surabaya', '33', 'Rp 2.030.000', '16.4%'],
    ],
  },
  q2: {
    q: 'Barang apa saja yang stoknya menipis dan perlu di-reorder?',
    a: 'Berdasarkan kecepatan penjualan 30 hari terakhir, ditemukan 5 produk yang berada di bawah batas minimum stok. Berikut rekomendasi reorder PO supplier:',
    cols: ['Nama Produk', 'Stok Saat Ini', 'Batas Min', 'Saran Order PO'],
    rows: [
      ['Kopi Susu Botol 250ml', '4 PCS', '10 PCS', '+36 PCS (1.5 Dus)'],
      ['Gula Pasir Kristal 1kg', '6 PACK', '20 PACK', '+28 PACK'],
      ['Teh Celup Melati 25s', '8 BOX', '24 BOX', '+32 BOX'],
      ['Snack Kentang Barbeque', '5 PCS', '15 PCS', '+20 PCS'],
      ['Susu UHT Full Cream 1L', '12 PCS', '36 PCS', '+24 PCS (2 Dus)'],
    ],
  },
  q3: {
    q: 'Siapa pelanggan setia dengan belanja terbanyak bulan ini?',
    a: 'Tiga pelanggan member teratas menyumbang total Rp 5.415.500 bulan ini. Ibu Siti Rahma memimpin dengan 214 transaksi dan poin reward tertinggi.',
    cols: ['Nama Pelanggan', 'Tier', 'Transaksi', 'Poin Reward', 'Total Belanja'],
    rows: [
      ['Siti Rahma', 'VIP Member', '214', '1.240 Poin', 'Rp 2.140.000'],
      ['Budi Santoso', 'Member Reguler', '96', '610 Poin', 'Rp 1.820.500'],
      ['Dewi Lestari', 'Member Reguler', '74', '430 Poin', 'Rp 1.455.000'],
    ],
  },
  q4: {
    q: 'Cek batch produk yang akan kadaluarsa dalam 30 hari!',
    a: 'Ditemukan 3 nomor batch yang akan jatuh tempo dalam 30 hari ke depan. Batch B-2408 pada Teh Celup paling mendesak — disarankan membuat promo bundling/diskon kasir.',
    cols: ['Produk', 'Nomor Batch', 'Tanggal Expired', 'Sisa Stok', 'Urgensi'],
    rows: [
      ['Teh Celup Melati', 'B-2408', '30 Okt 2026', '18 PCS', 'Mendesak (14 hari)'],
      ['Roti Coklat Klasik', 'B-2412', '08 Nov 2026', '24 PCS', 'Waspada (22 hari)'],
      ['Yoghurt Strawberry', 'B-2410', '15 Nov 2026', '36 PCS', 'Perhatian (29 hari)'],
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
      content: 'Barang apa saja yang stoknya menipis dan perlu di-reorder?',
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
            `Analisis untuk: "${text}" — Berdasarkan data SQLite lokal Anda, seluruh transaksi berjalan normal, margin kotor rata-rata 32.4%, dan tidak ada anomali selisih kas kasir yang terdeteksi.`,
        },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <section className="section" id="ai">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow ep">
            <span className="eb-dot" />
            <span>Kivo AI Assistant (Achira AI Engine)</span>
          </div>
          <h2 className="h2">Tanyakan Apapun Tentang Toko Anda dalam Bahasa Manusia</h2>
          <p className="lead">
            Bukan sekadar chatbot teks umum. Kivo AI membaca langsung data penjualan, mutasi stok,
            dan laporan laba rugi SQLite lokal Anda menggunakan OpenAI Function Calling secara aman (BYOK).
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
                💰 Berapa omset hari ini?
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q2')}
                disabled={isTyping}
              >
                📦 Cek stok yang menipis
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q3')}
                disabled={isTyping}
              >
                ⭐ Top 3 pelanggan terloyal
              </button>
              <button
                type="button"
                className="qchip-btn"
                onClick={() => handleAsk('q4')}
                disabled={isTyping}
              >
                ⏳ Produk mau kadaluarsa
              </button>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Tanyakan sesuatu ke Kivo AI (misal: analisis laba bulan ini)..."
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

