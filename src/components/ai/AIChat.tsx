import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, Terminal } from 'lucide-react';
import { ChatMessage, sendChatRequest } from '../../lib/aiClient';
import { useAuthStore } from '../../store/AuthStore';

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
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
      // Filter out system messages and tool messages for UI display
      setMessages(finalConversation.filter(m => m.role !== 'system'));
    } catch (error: any) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Error: ${error.message || 'Something went wrong.'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-white dark:bg-[#0B0F19] border-l border-brand/20 dark:border-brand/20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-brand/10 to-indigo-500/10 dark:from-brand/5 dark:to-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-brand to-indigo-600 rounded-xl text-white shadow-md shadow-brand/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg">AI Assistant</h2>
              <p className="text-[10px] font-bold text-brand uppercase tracking-wider">Powered by OpenAI</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-[#0B0F19]/50 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-70 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-4">
                <Bot size={32} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Hello, {user?.name}!</h3>
              <p className="text-xs text-slate-500 max-w-[250px]">
                I can help you manage inventory, create promos, check sales, and more. What do you need?
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (msg.role === 'tool') {
              // Show a small technical pill for tool executions
              return (
                <div key={idx} className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono px-3 py-1 rounded-full flex items-center gap-1.5 border border-slate-300 dark:border-slate-700">
                    <Terminal size={10} /> 
                    <span>Executed: {msg.name}</span>
                  </div>
                </div>
              );
            }

            if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
              return (
                <div key={idx} className="flex justify-center animate-in fade-in">
                  <div className="text-[10px] font-bold text-brand flex items-center gap-1.5 animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Working on it...</span>
                  </div>
                </div>
              );
            }

            if (!msg.content) return null;

            const isUser = msg.role === 'user';
            
            return (
              <div 
                key={idx} 
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                  isUser 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                    : 'bg-gradient-to-br from-brand to-indigo-600 text-white'
                }`}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isUser 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            );
          })}
          
          {loading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 animate-in fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-4 flex items-center gap-1 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-[#0B0F19] border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-5 pr-12 py-3.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-brand text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-brand transition-all shadow-md shadow-brand/20 flex items-center justify-center"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[9px] text-slate-400">AI can make mistakes. Always verify destructive actions.</p>
          </div>
        </div>
      </div>
    </>
  );
}
