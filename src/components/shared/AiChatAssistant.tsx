'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/axios';
import { ApiResponse } from '@/types/api';
import { MessageSquare, Send, X, Bot, Sparkles, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function mergeStreamContent(previous: string, incoming: string): string {
  if (!incoming) {
    return previous;
  }

  if (!previous) {
    return incoming;
  }

  if (incoming.startsWith(previous)) {
    return incoming;
  }

  if (previous.endsWith(incoming)) {
    return previous;
  }

  const maxOverlap = Math.min(previous.length, incoming.length);

  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (previous.slice(-overlap) === incoming.slice(0, overlap)) {
      return previous + incoming.slice(overlap);
    }
  }

  return previous + incoming;
}

const QUICK_PROMPTS = [
  'Làm sao để đăng ký thi đấu đôi?',
  'Chính sách hoàn tiền khi rút giải?',
  'Hệ thống tính điểm ELO như thế nào?',
];

export default function AiChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là **Trợ lý ảo VNDC Sport**. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi tôi về cách đăng ký giải, cách tính ELO, chính sách hoàn tiền, hoặc các tính năng khác trên hệ thống.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api/v1` : 'http://localhost:3000/api/v1');
      const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          currentUrl: pathname,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Yêu cầu AI thất bại');
      }

      if (!response.body) {
        throw new Error('Không nhận được dữ liệu stream từ AI');
      }

      // Thêm placeholder tin nhắn trống cho Assistant trước khi stream
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n\r?\n/);
        
        // Giữ lại phần chưa hoàn thành ở cuối buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.slice(6);
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const lastMsg = copy[copy.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = mergeStreamContent(lastMsg.content, parsed.content);
                  }
                  return copy;
                });
              }
            } catch (e) {
              console.error('Lỗi parse stream chunk:', e, dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI chat failed:', error);
      setMessages((prev) => {
        const copy = [...prev];
        const lastMsg = copy[copy.length - 1];

        if (lastMsg?.role === 'assistant' && !lastMsg.content) {
          lastMsg.content = 'Đã xảy ra lỗi kết nối với máy chủ AI. Vui lòng thử lại sau.';
          return copy;
        }

        return [
          ...copy,
          {
            role: 'assistant',
            content: 'Đã xảy ra lỗi kết nối với máy chủ AI. Vui lòng thử lại sau.',
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    // Outer: fixed to bottom-right, auto-size, no pointer-events blocking
    <div className="fixed bottom-6 right-6 z-[9999] font-sans flex flex-col items-end gap-3">
      {/* Chat Panel — appears above the bubble button */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-[340px] sm:w-[370px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '490px' }}
          >
            {/* Header — fixed height so nothing gets cut off */}
            <div className="h-[60px] shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-[13px] leading-tight flex items-center gap-1">
                    Trợ lý AI VNDC Sport
                    <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                  </p>
                  <p className="text-white/75 text-[10px] leading-tight mt-0.5">
                    Hỗ trợ thông tin thi đấu 24/7
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/30 min-h-0">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold shadow ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                        : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? 'U' : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Gợi ý câu hỏi
                </p>
                <div className="flex flex-col gap-1">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left text-[11px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all flex items-center justify-between group"
                    >
                      <span className="font-medium truncate">{prompt}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 text-blue-500 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Hỏi trợ lý ảo về giải đấu..."
                rows={1}
                className="flex-1 resize-none max-h-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[12.5px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl transition-colors cursor-pointer relative border-2 border-blue-500"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageSquare className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-blue-600 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
