import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Minimize2, Maximize2, Trash2, Copy, Check, X, BarChart3, Package, Gift, ArrowRight } from 'lucide-react';
import { ChatMessage, sendChatRequest } from '../../lib/aiClient';
import * as api from '../../lib/api';
import { useAuthStore } from '../../store/AuthStore';

const CHAT_HISTORY_KEY = 'achira_chat_history';

// ─── MARKDOWN FORMATTER ──────────────────────────────────────────────────────
const formatMessageContent = (text: string) => {
  if (!text) return { __html: '' };

  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold mt-3 mb-1.5 text-slate-900 dark:text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-extrabold mt-4 mb-2 text-slate-900 dark:text-white">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-light px-2 py-0.5 rounded-md text-xs font-mono border border-brand/20">$1</code>')
    .replace(/^\s*\-\s+(.*$)/gim, '<li class="ml-4 list-disc my-1 text-slate-700 dark:text-slate-300">$1</li>')
    .replace(/^\s*[0-9]+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal my-1 text-slate-700 dark:text-slate-300">$1</li>');

  html = html.replace(/(<li class="[^"]*list-disc[^"]*">.*?<\/li>(?:\n|$))+/g, match => `<ul class="mb-3 mt-1 space-y-1">${match}</ul>`);
  html = html.replace(/(<li class="[^"]*list-decimal[^"]*">.*?<\/li>(?:\n|$))+/g, match => `<ol class="mb-3 mt-1 space-y-1">${match}</ol>`);

  html = html.split('\n').map(line => line.trim() === '' ? '<div class="h-2"></div>' : line).join('\n');
  html = html.replace(/\n/g, '<br />');

  html = html.replace(/(<\/?ul>|<\/?ol>|<\/?li[^>]*>|<\/?h[23][^>]*>)<br \/>/g, '$1');
  html = html.replace(/<br \/>(<\/?ul>|<\/?ol>|<\/?li[^>]*>|<\/?h[23][^>]*>)/g, '$1');

  return { __html: html };
};

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────
function TypewriterMessage({ text, animate, onComplete }: { text: string; animate: boolean; onComplete: () => void }) {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      onComplete();
      return;
    }

    let i = 0;
    const intervalId = setInterval(() => {
      i += 3;
      if (i >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
        onComplete();
      } else {
        setDisplayedText(text.slice(0, i));
      }
    }, 12);

    return () => clearInterval(intervalId);
  }, [text, animate, onComplete]);

  return (
    <div
      className="whitespace-pre-wrap leading-relaxed space-y-2"
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
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as ChatMessage[];
    } catch {}
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [pendingPreview, setPendingPreview] = useState<{items: any[]}|null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animatedIndices = useRef<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setTimeout(() => setCopiedIdx(null), 2000);
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
      alert(`Gagal menerapkan penyesuaian stok: ${e.message || e}`);
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
        className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Container */}
      <div
        className={`fixed z-[110] bottom-0 right-0 sm:bottom-6 sm:right-6 bg-white dark:bg-[#0B0F19] sm:rounded-3xl rounded-t-3xl shadow-2xl shadow-brand/15 border-t sm:border border-slate-200/90 dark:border-slate-800/90 flex flex-col overflow-hidden transition-all duration-300 ${
          isExpanded
            ? 'w-full sm:w-[680px] h-[92vh] sm:h-[720px] sm:max-h-[calc(100vh-3rem)]'
            : 'w-full sm:w-[440px] h-[85vh] sm:h-[660px] sm:max-h-[calc(100vh-3rem)]'
        } animate-in slide-in-from-bottom-10 sm:zoom-in-95`}
      >

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/70 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md z-10 shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-indigo-500 to-purple-600" />
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-brand/25">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-[#0B0F19]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">Achira</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 dark:bg-brand/20 text-brand border border-brand/20">
                  AI Assistant
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Asisten Cerdas ChiraSys</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {visibleMessages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                title="Hapus riwayat chat"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title={isExpanded ? "Kecilkan tampilan" : "Perbesar tampilan"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Tutup (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/40 dark:bg-slate-950/30 custom-scrollbar scroll-smooth">
          
          {/* Welcome / Empty State */}
          {visibleMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 animate-in zoom-in-95 duration-300">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand via-indigo-500 to-purple-500 rounded-3xl blur-xl opacity-25 animate-pulse" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand/40 border border-white/20">
                  <Sparkles size={36} className="text-white" />
                </div>
              </div>

              <h3 className="font-black text-2xl text-slate-900 dark:text-white mb-2 tracking-tight">
                Halo, <span className="bg-gradient-to-r from-brand via-indigo-500 to-purple-500 bg-clip-text text-transparent">{user?.name || 'System Admin'}</span>! 👋
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[300px] leading-relaxed mb-6">
                Saya <strong className="text-slate-800 dark:text-slate-200">Achira</strong>, asisten AI cerdas ChiraSys. Siap membantu analisis stok, laporan penjualan, dan strategi promo.
              </p>

              {/* Quick Prompt Cards */}
              <div className="w-full max-w-sm space-y-2 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1">Coba Pertanyaan Ini:</p>
                
                <button
                  onClick={() => handleSendPrompt('Tampilkan ringkasan penjualan & performa toko hari ini')}
                  className="w-full p-3 bg-white dark:bg-slate-900/90 hover:bg-brand/5 dark:hover:bg-brand/10 border border-slate-200/80 dark:border-slate-800 hover:border-brand/40 dark:hover:border-brand/40 rounded-2xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand transition-colors">Ringkasan Penjualan</p>
                      <p className="text-[11px] text-slate-400">Cek total omset & statistik hari ini</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-brand" />
                </button>

                <button
                  onClick={() => handleSendPrompt('Cek produk yang stoknya sudah di bawah batas minimum')}
                  className="w-full p-3 bg-white dark:bg-slate-900/90 hover:bg-brand/5 dark:hover:bg-brand/10 border border-slate-200/80 dark:border-slate-800 hover:border-brand/40 dark:hover:border-brand/40 rounded-2xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand transition-colors">Cek Stok Kritis</p>
                      <p className="text-[11px] text-slate-400">Daftar produk butuh reorder segera</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-brand" />
                </button>

                <button
                  onClick={() => handleSendPrompt('Rekomendasikan promo bundle menarik dari produk paling laris')}
                  className="w-full p-3 bg-white dark:bg-slate-900/90 hover:bg-brand/5 dark:hover:bg-brand/10 border border-slate-200/80 dark:border-slate-800 hover:border-brand/40 dark:hover:border-brand/40 rounded-2xl transition-all group flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                      <Gift size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand transition-colors">Buat Promo Bundle</p>
                      <p className="text-[11px] text-slate-400">Ide paket bundling item terlaris</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-brand" />
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
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-md mt-0.5 ${
                  isUser
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 text-white shadow-brand/20'
                }`}>
                  {isUser ? <User size={15} /> : <Bot size={15} />}
                </div>

                {/* Bubble Container */}
                <div className={`relative max-w-[85%] group ${
                  isUser
                    ? 'bg-gradient-to-r from-brand via-blue-600 to-indigo-600 text-white rounded-3xl rounded-tr-xs px-4 py-3 shadow-md shadow-brand/15 text-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-3xl rounded-tl-xs p-4 shadow-xs text-sm'
                }`}>
                  {isUser ? (
                    <div
                      className="whitespace-pre-wrap leading-relaxed space-y-2"
                      dangerouslySetInnerHTML={formatMessageContent(msg.content || '')}
                    />
                  ) : (
                    <>
                      <TypewriterMessage
                        text={msg.content || ''}
                        animate={!animatedIndices.current.has(idx)}
                        onComplete={() => {
                          animatedIndices.current.add(idx);
                          scrollToBottom();
                        }}
                      />
                      
                      {/* Copy Action Button */}
                      <button
                        onClick={() => handleCopy(msg.content || '', idx)}
                        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-all"
                        title="Salin jawaban"
                      >
                        {copiedIdx === idx ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading Animation */}
          {loading && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-brand/20 mt-0.5">
                <Sparkles size={15} className="animate-spin" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl rounded-tl-xs px-5 py-3.5 flex items-center gap-3 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Achira sedang menganalisis data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingPreview && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/40 z-10 shrink-0">
            <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100 mb-2">Persetujuan Penyesuaian Stok (AI)</h4>
            <div className="max-h-32 overflow-y-auto custom-scrollbar mb-3 bg-white dark:bg-slate-900 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
              <table className="w-full text-xs text-left">
                <thead><tr className="border-b text-slate-500"><th className="pb-1">Item ID</th><th className="pb-1">Qty</th><th className="pb-1">Batch</th></tr></thead>
                <tbody>
                  {pendingPreview.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="py-1 font-mono">{it.item_id.substring(0,8)}...</td>
                      <td className="py-1">{it.actual_qty}</td>
                      <td className="py-1">{it.batch_no || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleRejectPreview} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700">Tolak & Batal</button>
              <button onClick={handleApprovePreview} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Setujui & Terapkan</button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 z-10 shrink-0">
          <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Tanya Achira... (Enter kirim, Shift+Enter baris baru)"
              disabled={loading}
              autoFocus
              rows={1}
              className="flex-1 resize-none bg-transparent border-none pl-3 pr-2 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 overflow-hidden leading-relaxed"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <button
              onClick={(e) => handleSubmit(e)}
              disabled={!input.trim() || loading}
              className="shrink-0 p-3 bg-gradient-to-r from-brand to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl disabled:opacity-40 disabled:hover:from-brand disabled:hover:to-indigo-600 transition-all shadow-md shadow-brand/20 flex items-center justify-center active:scale-95 cursor-pointer"
              title="Kirim pesan"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between px-2 mt-2.5">
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles size={11} className="text-brand shrink-0" />
              Achira AI dapat membuat kesalahan. Verifikasi data penting.
            </p>
            {input.trim() && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0">Shift+Enter = baris baru</span>
            )}
          </div>
        </div>

      </div>
    </>
  );
}