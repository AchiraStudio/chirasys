import React from 'react';
import { Sparkles, Bot, ArrowUpRight } from 'lucide-react';

export const AiView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel-head">
        <div>
          <span className="panel-title">Kivo AI Assistant (Achira AI)</span>
          <p className="panel-sub">Asisten bisnis pribadi dengan OpenAI Function Calling langsung ke database lokal.</p>
        </div>
        <span className="pill" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          <Sparkles size={12} />
          BYOK Ready
        </span>
      </div>

      <div className="panel" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
            <Bot size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 13 }}>Kivo Business Copilot</span>
              <span className="pill" style={{ height: 18, fontSize: 9 }}>gpt-4o-mini</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--body)', lineHeight: 1.5 }}>
              "Halo! Omset 3 cabang hari ini mencapai <strong>Rp 12.450.000</strong> dari 184 transaksi. Toko Utama memimpin dengan kontribusi 58%. Terdapat 5 produk yang stoknya mendekati batas minimum dan perlu di-reorder."
            </p>
          </div>
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--dim)' }}>Ingin eksplorasi analisis lebih mendalam?</span>
          <a href="#ai" className="pill" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Buka Simulator AI Chat <ArrowUpRight size={11} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default AiView;

