import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Minimize2, Maximize2, Trash2, Copy, Check, X, BarChart3, Package, Gift, ArrowRight, Key } from 'lucide-react';
import { ChatMessage, sendChatRequest, getOpenAIApiKey, getSelectedAIModel } from '../../lib/aiClient';
import * as api from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';

import { toast } from '../ui/Toast';
import Select from '../ui/Select';
const CHAT_HISTORY_KEY = 'kivo_chat_history';
const LEGACY_CHAT_HISTORY_KEY = 'achira_chat_history';

// ─── MARKDOWN FORMATTER ──────────────────────────────────────────────────────
const formatMessageContent = (text: string) => {
  if (!text) return { __html: '' };

  // First process inline styling: inline code, bold, italic
  let formatted = text
    .replace(/`([^`]+)`/g, '<code class="bg-muted text-primary px-1.5 py-0.5 rounded text-xs font-mono border border-line">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-heading">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-heading">$1</em>');

  // Process line by line to preserve exact numbered & bullet list structures without browser <ol> reset bugs
  const lines = formatted.split('\n');
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      resultLines.push('<div class="h-1.5"></div>');
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      resultLines.push(`<h3 class="text-xs font-bold uppercase tracking-wider text-heading mt-2.5 mb-1">${trimmed.slice(4)}</h3>`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      resultLines.push(`<h2 class="text-sm font-bold text-heading mt-3 mb-1.5">${trimmed.slice(3)}</h2>`);
      continue;
    }

    // Numbered List: e.g. "1. Pengelolaan Produk:" or "2. Manajemen Pelanggan:"
    const numMatch = rawLine.match(/^(\s*)([0-9]+)\.\s+(.*$)/);
    if (numMatch) {
      const num = numMatch[2];
      const content = numMatch[3];
      resultLines.push(
        `<div class="flex items-start gap-1.5 my-1 text-heading"><span class="font-bold text-primary shrink-0 tabular-nums">${num}.</span><div class="flex-1 font-medium">${content}</div></div>`
      );
      continue;
    }

    // Bullet List: e.g. "- Menambah item..." or "* Menambah item..." or "• Menambah item..."
    const bulletMatch = rawLine.match(/^(\s*)[\-\*•]\s+(.*$)/);
    if (bulletMatch) {
      const content = bulletMatch[2];
      resultLines.push(
        `<div class="flex items-start gap-2 ml-3 my-0.5 text-heading"><span class="text-primary/80 shrink-0 select-none font-bold">•</span><div class="flex-1 text-heading font-medium leading-relaxed">${content}</div></div>`
      );
      continue;
    }

    // Regular paragraph line
    resultLines.push(`<div class="text-heading leading-relaxed">${rawLine}</div>`);
  }

  return { __html: resultLines.join('') };
};

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────
function TypewriterMessage({ text, animate }: { text: string; animate: boolean }) {
  const [displayedText, setDisplayedText] = useState(() => (animate ? '' : text));
  const hasFinishedRef = useRef(!animate);

  useEffect(() => {
    // If this message was already finished or shouldn't animate, stay static
    if (hasFinishedRef.current) {
      setDisplayedText(text);
      return;
    }

    let i = 0;
    const step = Math.max(3, Math.ceil(text.length / 50));
    const intervalId = setInterval(() => {
      i += step;
      if (i >= text.length) {
        clearInterval(intervalId);
        hasFinishedRef.current = true;
        setDisplayedText(text);
      } else {
        setDisplayedText(text.slice(0, i));
      }
    }, 12);

    return () => clearInterval(intervalId);
  }, [text]);

  return (
    <div
      className="whitespace-pre-wrap leading-relaxed space-y-0.5"
      dangerouslySetInnerHTML={formatMessageContent(displayedText)}
    />
  );
}

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AIChat({ isOpen, onClose, branchId }: AIChatProps) {
  const { user } = useAuthStore();
  const storageKey = `${CHAT_HISTORY_KEY}_${user?.id || 'guest'}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem(`${LEGACY_CHAT_HISTORY_KEY}_${user?.id || 'guest'}`);
      if (saved) return JSON.parse(saved) as ChatMessage[];
    } catch {}
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [pendingPreview, setPendingPreview] = useState<{items: any[]}|null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animatedIndices = useRef<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mark all restored historical messages as already animated so history never replays
  useEffect(() => {
    messages.forEach((_, i) => animatedIndices.current.add(i));
  }, []);

  useEffect(() => {
    if (isOpen) {
      getOpenAIApiKey().then(k => setApiKeyInput(k));
      getSelectedAIModel().then(m => setSelectedModel(m));
    }
  }, [isOpen]);

  const handleSaveAISettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const cleanKey = apiKeyInput.trim();
      localStorage.setItem('chirasys_openai_api_key', cleanKey);
      localStorage.setItem('chirasys_ai_model', selectedModel);
      try {
        await api.setSetting('openai_api_key', cleanKey);
        await api.setSetting('openai_model', selectedModel);
      } catch {}
      setSettingsSaved(true);
      setTimeout(() => {
        setSettingsSaved(false);
        setShowSettings(false);
      }, 1200);
    } catch (err: any) {
      toast.error(`Gagal menyimpan pengaturan AI: ${err.message || err}`);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    try {
      const toSave = messages.filter(m => m.role === 'user' || m.role === 'assistant');
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {}
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSendPrompt = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (_e?: React.MouseEvent | React.KeyboardEvent | null, overrideInput?: string) => {
    const textToSubmit = overrideInput !== undefined ? overrideInput : input;
    if (!textToSubmit.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSubmit.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const finalConversation = await sendChatRequest(newMessages, branchId);

      // Look for pending approvals in tool messages
      let foundPreview = null;
      for (const m of finalConversation) {
        if (m.role === 'tool' && m.content) {
          try {
            const data = JSON.parse(m.content);
            if (data.requires_user_approval && data.action === 'preview_bulk_opname') {
              foundPreview = { items: data.items };
            }
          } catch {}
        }
      }
      if (foundPreview) {
        setPendingPreview(foundPreview);
      }
      const filteredMessages = finalConversation.filter(m => {
        if (m.role === 'system') return false;
        if (m.role === 'tool') return false;
        if (m.role === 'assistant' && !m.content) return false;
        return true;
      });

      const combinedMessages: ChatMessage[] = [];
      for (const msg of filteredMessages) {
        if (msg.role === 'assistant' && combinedMessages.length > 0 && combinedMessages[combinedMessages.length - 1].role === 'assistant') {
          combinedMessages[combinedMessages.length - 1].content += '\n\n' + msg.content;
        } else {
          const cleanMsg = { ...msg };
          delete cleanMsg.tool_calls;
          combinedMessages.push(cleanMsg);
        }
      }

      setMessages(combinedMessages);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${error.message || 'Terjadi kesalahan sistem.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => {
      setCopiedIdx(prev => prev === idx ? null : prev);
    }, 2000);
  };

  const clearHistory = () => {
    if (confirm('Hapus seluruh riwayat percakapan?')) {
      setMessages([]);
      animatedIndices.current.clear();
      try { localStorage.removeItem(storageKey); } catch {}
    }
  };

  const handleApprovePreview = async () => {
    if (!pendingPreview || !pendingPreview.items) return;
    setLoading(true);
    try {
      const sessionId = await api.createOpnameSession(branchId, user?.id || 'guest', 'AI Bulk Adjustment');
      await api.submitOpnameLines(sessionId, pendingPreview.items);
      await api.finalizeOpname(sessionId);
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content: 'Saya telah menyetujui preview penyesuaian stok. Lanjutkan!' }
      ]);
      setPendingPreview(null);
      // Let AI know it succeeded (mocking the submit)
      handleSubmit(null, 'Saya telah menyetujui dan menerapkan perubahan stok. Selesai.');
    } catch (e: any) {
      toast.error(`Gagal menerapkan penyesuaian stok: ${e.message || e}`);
      setLoading(false);
    }
  };

  const handleRejectPreview = () => {
    setPendingPreview(null);
    setMessages(prev => [
      ...prev,
      { role: 'user', content: 'Saya telah menolak preview penyesuaian stok. Batalkan aksi.' }
    ]);
  };
  const visibleMessages = messages.filter(m =>
    (m.role === 'user' || m.role === 'assistant') && m.content
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-[100] bg-card/50 backdrop-blur-sm sm:hidden animate-fade-in"
        onClick={onClose}
      />

      {/* Main Container */}
      <div
        className={`fixed z-[110] bottom-0 right-0 sm:bottom-5 sm:right-5 bg-card sm:rounded-2xl rounded-t-2xl shadow-2xl border border-line flex flex-col overflow-hidden transition-all duration-200 ${
          isExpanded
            ? 'w-full sm:w-[620px] h-[92vh] sm:h-[700px] sm:max-h-[calc(100vh-2.5rem)]'
            : 'w-full sm:w-[410px] h-[85vh] sm:h-[600px] sm:max-h-[calc(100vh-2.5rem)]'
        } animate-fade-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-card z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-card"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-heading text-sm leading-none">Kivo AI</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-soft text-primary border border-primary/20 leading-none">
                  Smart Assistant
                </span>
              </div>
              <p className="text-[11px] text-dim mt-0.5">Asisten Cerdas Bisnis & Kasir</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 text-dim hover:text-heading bg-muted hover:bg-line rounded-lg transition-colors cursor-pointer"
              title="Pengaturan OpenAI API Key & Model"
            >
              <Key size={14} />
            </button>
            {visibleMessages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-1.5 text-dim hover:text-danger bg-muted hover:bg-danger-soft rounded-lg transition-colors cursor-pointer"
                title="Hapus riwayat chat"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex p-1.5 text-dim hover:text-heading bg-muted hover:bg-line rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? "Kecilkan tampilan" : "Perbesar tampilan"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-dim hover:text-heading bg-muted hover:bg-line rounded-lg transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Settings Modal Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs p-4 flex flex-col justify-center animate-fade-in">
            <div className="bg-card rounded-xl p-4 border border-line shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-soft text-primary rounded-lg">
                    <Key size={15} />
                  </div>
                  <div>
                    <h3 className="font-bold text-heading text-xs">Pengaturan OpenAI API</h3>
                    <p className="text-[10px] text-dim">Konfigurasi API Key & Model AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-dim hover:text-heading hover:bg-muted rounded-lg transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveAISettings} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-heading uppercase tracking-wide">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full bg-muted/50 border border-line rounded-lg px-3 py-2 text-xs font-mono text-heading outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-dim">
                    Dapatkan API Key dari platform.openai.com
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-heading uppercase tracking-wide">
                    Model AI
                  </label>
                  <Select
                    value={selectedModel}
                    onChange={(v) => setSelectedModel(v)}
                    className="w-full bg-muted/50 border border-line rounded-lg px-3 py-2 text-xs font-medium text-heading outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Direkomendasikan - Cepat & Hemat)</option>
                    <option value="gpt-4o">GPT-4o (Paling Cerdas & Akurat)</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </Select>
                </div>

                <div className="pt-1.5 flex items-center justify-between">
                  {settingsSaved ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success">
                      <Check size={13} /> Tersimpan!
                    </span>
                  ) : <span />}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-dim hover:text-heading hover:bg-muted transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      {savingSettings ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Simpan
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20 custom-scrollbar scroll-smooth">
          
          {/* Welcome / Empty State */}
          {visibleMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3 shadow-xs">
                <Sparkles size={22} />
              </div>

              <h3 className="font-bold text-base text-heading tracking-tight">
                Halo, <span className="text-primary">{user?.name || 'Administrator'}</span>!
              </h3>
              <p className="text-xs text-dim max-w-[280px] leading-relaxed mt-1 mb-5">
                Saya <strong className="text-heading">Kivo AI</strong>, asisten cerdas toko Anda. Siap membantu analisis omset, stok kritis, dan rekomendasi promo.
              </p>

              {/* Quick Prompt Cards */}
              <div className="w-full max-w-sm space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-dim px-0.5">Saran Pertanyaan:</p>
                
                <button
                  onClick={() => handleSendPrompt('Tampilkan ringkasan penjualan & performa toko hari ini')}
                  className="w-full p-2.5 bg-card hover:bg-muted/40 border border-line hover:border-primary/40 rounded-xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <BarChart3 size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-heading group-hover:text-primary transition-colors">Ringkasan Penjualan</p>
                      <p className="text-[11px] text-dim">Cek total omset & statistik hari ini</p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-dim group-hover:translate-x-0.5 transition-transform group-hover:text-primary" />
                </button>

                <button
                  onClick={() => handleSendPrompt('Cek produk yang stoknya sudah di bawah batas minimum')}
                  className="w-full p-2.5 bg-card hover:bg-muted/40 border border-line hover:border-primary/40 rounded-xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Package size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-heading group-hover:text-primary transition-colors">Cek Stok Kritis</p>
                      <p className="text-[11px] text-dim">Daftar produk butuh reorder segera</p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-dim group-hover:translate-x-0.5 transition-transform group-hover:text-primary" />
                </button>

                <button
                  onClick={() => handleSendPrompt('Rekomendasikan promo bundle menarik dari produk paling laris')}
                  className="w-full p-2.5 bg-card hover:bg-muted/40 border border-line hover:border-primary/40 rounded-xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Gift size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-heading group-hover:text-primary transition-colors">Buat Promo Bundle</p>
                      <p className="text-[11px] text-dim">Ide paket bundling item terlaris</p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-dim group-hover:translate-x-0.5 transition-transform group-hover:text-primary" />
                </button>
              </div>
            </div>
          )}

          {/* Visible Chat Bubbles */}
          {visibleMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                  isUser
                    ? 'bg-muted text-heading border border-line'
                    : 'bg-primary-soft text-primary'
                }`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble Container */}
                <div className={`relative group ${
                  isUser
                    ? 'bg-primary text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs font-medium leading-relaxed max-w-[82%] shadow-xs'
                    : 'bg-card border border-line text-heading rounded-2xl rounded-tl-xs px-4 py-3 text-xs leading-relaxed shadow-xs max-w-[85%]'
                }`}>
                  {isUser ? (
                    <>
                      <div
                        className="whitespace-pre-wrap leading-relaxed space-y-1"
                        dangerouslySetInnerHTML={formatMessageContent(msg.content || '')}
                      />
                      <button
                        onClick={() => handleCopy(msg.content || '', idx)}
                        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/30 text-white rounded transition-all cursor-pointer"
                        title="Salin pesan"
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-white" /> : <Copy size={12} />}
                      </button>
                    </>
                  ) : (
                    <>
                      <TypewriterMessage
                        text={msg.content || ''}
                        animate={!animatedIndices.current.has(idx)}
                      />
                      
                      {/* Copy Action Button */}
                      <button
                        onClick={() => handleCopy(msg.content || '', idx)}
                        className="absolute top-2.5 right-2.5 p-1 opacity-0 group-hover:opacity-100 bg-muted hover:bg-line text-dim hover:text-heading rounded transition-all cursor-pointer"
                        title="Salin jawaban"
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                      </button>

                      {/* Direct action button if API Key error */}
                      {(msg.content?.includes('API Key') || msg.content?.includes('Error') || msg.content?.includes('401') || msg.content?.includes('Unauthorized')) && (
                        <div className="mt-2.5 pt-2 border-t border-line flex items-center">
                          <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-soft hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-all cursor-pointer"
                          >
                            <Key size={12} /> Atur API Key OpenAI
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading Animation */}
          {loading && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-primary-soft text-primary flex items-center justify-center mt-0.5">
                <Sparkles size={14} className="animate-spin" />
              </div>
              <div className="bg-card border border-line rounded-2xl rounded-tl-xs px-4 py-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-medium text-dim">Menganalisis data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingPreview && (
          <div className="p-3 bg-card border-t border-line z-10 shrink-0">
            <h4 className="font-bold text-xs text-heading mb-1.5">Persetujuan Penyesuaian Stok (AI)</h4>
            <div className="max-h-32 overflow-y-auto custom-scrollbar mb-2.5 bg-muted/40 rounded-lg p-2 border border-line">
              <table className="w-full text-xs text-left">
                <thead><tr className="border-b border-line text-dim"><th className="pb-1">Item ID</th><th className="pb-1">Qty</th><th className="pb-1">Batch</th></tr></thead>
                <tbody>
                  {pendingPreview.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-line/50">
                      <td className="py-1 font-mono">{it.item_id.substring(0,8)}...</td>
                      <td className="py-1 font-semibold text-heading">{it.actual_qty}</td>
                      <td className="py-1 text-dim">{it.batch_no || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleRejectPreview} className="px-2.5 py-1.5 bg-muted hover:bg-line text-body text-xs font-semibold rounded-lg transition-colors cursor-pointer">Tolak & Batal</button>
              <button onClick={handleApprovePreview} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer">Setujui & Terapkan</button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-card border-t border-line z-10 shrink-0">
          <div className="relative flex items-end gap-1.5 bg-muted/50 border border-line rounded-xl p-1.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Tanya Kivo AI... (Tekan Enter untuk kirim)"
              disabled={loading}
              autoFocus
              rows={1}
              className="flex-1 resize-none bg-transparent border-none px-2.5 py-1 text-xs text-heading outline-none placeholder:text-dim disabled:opacity-50 overflow-y-auto leading-relaxed custom-scrollbar"
              style={{ minHeight: '34px', maxHeight: '100px' }}
            />
            <button
              onClick={(e) => handleSubmit(e)}
              disabled={!input.trim() || loading}
              className="shrink-0 w-8 h-8 bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-40 transition-all shadow-xs flex items-center justify-center active:scale-95 cursor-pointer"
              title="Kirim pesan"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-between px-1 mt-1.5">
            <p className="text-[10px] text-dim flex items-center gap-1">
              <Sparkles size={11} className="text-primary shrink-0" />
              Kivo AI dapat melakukan kesalahan. Verifikasi data penting.
            </p>
            {input.trim() && (
              <span className="text-[10px] font-mono text-dim shrink-0 hidden sm:inline">Shift+Enter = baris baru</span>
            )}
          </div>
        </div>

      </div>
    </>
  );
}