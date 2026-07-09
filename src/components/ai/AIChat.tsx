import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Minimize2 } from 'lucide-react';
import { ChatMessage, sendChatRequest } from '../../lib/aiClient';
import { useAuthStore } from '../../store/AuthStore';

// FUNGSI PARSER MARKDOWN SEDERHANA (tetap sama)
const formatMessageContent = (text: string) => {
  if (!text) return { __html: '' };
  
  let html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-slate-900 dark:text-white">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-brand">$1</code>')
    .replace(/^\s*\-\s+(.*$)/gim, '<li class="ml-5 list-disc my-1">$1</li>')
    .replace(/^\s*[0-9]+\.\s+(.*$)/gim, '<li class="ml-5 list-decimal my-1">$1</li>');

  // Wrap consecutive list items
  html = html.replace(/(<li class="[^"]*list-disc[^"]*">.*?<\/li>(?:\n|$))+/g, match => `<ul class="mb-3 mt-1">${match}</ul>`);
  html = html.replace(/(<li class="[^"]*list-decimal[^"]*">.*?<\/li>(?:\n|$))+/g, match => `<ol class="mb-3 mt-1">${match}</ol>`);

  // Handle line breaks (avoid breaking HTML tags)
  html = html.split('\n').map(line => line.trim() === '' ? '<div class="h-2"></div>' : line).join('\n');
  html = html.replace(/\n/g, '<br />');

  // Cleanup unwanted <br /> inside lists or headers
  html = html.replace(/(<\/?ul>|<\/?ol>|<\/?li[^>]*>|<\/?h[23][^>]*>)<br \/>/g, '$1');
  html = html.replace(/<br \/>(<\/?ul>|<\/?ol>|<\/?li[^>]*>|<\/?h[23][^>]*>)/g, '$1');

  return { __html: html };
};

function TypewriterMessage({ text, animate, onComplete }: { text: string, animate: boolean, onComplete: () => void }) {
  const [displayedText, setDisplayedText] = useState(animate ? '' : text);
  
  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      onComplete();
      return;
    }
    
    let i = 0;
    const intervalId = setInterval(() => {
      i += 2; // Type speed: 2 chars per tick
      if (i >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
        onComplete();
      } else {
        setDisplayedText(text.slice(0, i));
      }
    }, 15); // Tick every 15ms
    
    return () => clearInterval(intervalId);
  }, [text, animate, onComplete]);

  return (
    <div 
      className="whitespace-pre-wrap leading-relaxed space-y-2"
      dangerouslySetInnerHTML={formatMessageContent(displayedText)}
    />
  );
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

export default function AIChat({ isOpen, onClose, branchId }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animatedIndices = useRef<Set<number>>(new Set());
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const finalConversation = await sendChatRequest(newMessages, branchId);
      
      // Hapus semua pesan tool dari hasil akhir agar tidak mengganggu tampilan
      const filteredMessages = finalConversation.filter(m => m.role !== 'tool');
      setMessages(filteredMessages);
    } catch (error: any) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `**Error:** ${error.message || 'Terjadi kesalahan sistem.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="fixed z-[110] bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[420px] h-[85vh] sm:h-[650px] sm:max-h-[calc(100vh-3rem)] bg-white dark:bg-[#0B0F19] sm:rounded-3xl rounded-t-3xl shadow-2xl sm:shadow-brand/10 border-t sm:border border-slate-200/80 dark:border-slate-800/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md z-10 shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-indigo-500 to-purple-500"></div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand/30">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0B0F19] rounded-full"></div>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Achira</h2>
              <p className="text-[11px] font-medium text-slate-500">Asisten AI ChiraSys</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
            title="Sembunyikan (Esc)"
          >
            <Minimize2 size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar scroll-smooth">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4">
                <Bot size={32} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">Halo, {user?.name}!</h3>
              <div 
                className="text-sm text-slate-500 max-w-[260px] leading-relaxed"
                dangerouslySetInnerHTML={formatMessageContent('Saya **Achira**, asisten cerdas Anda. Saya dapat membantu mengecek stok, membuat promo, atau menganalisis data penjualan.')}
              />
              
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <button onClick={() => setInput('Tampilkan ringkasan penjualan hari ini')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand hover:border-brand/30 transition-colors shadow-sm">📊 Ringkasan Penjualan</button>
                <button onClick={() => setInput('Cek item yang stoknya kritis')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand hover:border-brand/30 transition-colors shadow-sm">📦 Cek Stok Kritis</button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            // Jangan tampilkan pesan dengan role 'tool' sama sekali
            if (msg.role === 'tool') return null;

            if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
              return (
                <div key={idx} className="flex justify-center animate-in fade-in">
                  <div className="text-[11px] font-bold text-brand bg-brand/5 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse border border-brand/10">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Achira sedang memproses data...</span>
                  </div>
                </div>
              );
            }

            if (!msg.content) return null;

            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={idx} 
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-1 ${
                  isUser 
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' 
                    : 'bg-gradient-to-br from-brand to-indigo-500 text-white'
                }`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[85%] px-4 py-3 text-sm shadow-sm ${
                  isUser 
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl rounded-tr-sm' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 rounded-2xl rounded-tl-sm'
                }`}>
                  {isUser ? (
                    <div 
                      className="whitespace-pre-wrap leading-relaxed space-y-2"
                      dangerouslySetInnerHTML={formatMessageContent(msg.content)}
                    />
                  ) : (
                    <TypewriterMessage 
                      text={msg.content} 
                      animate={!animatedIndices.current.has(idx)} 
                      onComplete={() => {
                        animatedIndices.current.add(idx);
                        scrollToBottom();
                      }} 
                    />
                  )}
                </div>
              </div>
            );
          })}
          
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand to-indigo-500 text-white flex items-center justify-center shadow-sm mt-1">
                <Bot size={14} />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-slate-800/60 z-10 shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya Achira..."
              disabled={loading}
              autoFocus
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-5 pr-14 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2.5 bg-brand text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-brand transition-all shadow-md shadow-brand/20 flex items-center justify-center active:scale-95"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] font-medium text-slate-400">Achira dapat membuat kesalahan. Selalu verifikasi data penting.</p>
          </div>
        </div>
      </div>
    </>
  );
}