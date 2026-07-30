'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getBaseUrl } from '@/lib/axios';
import { MessageSquare, Send, X, Bot, Sparkles, ArrowRight, Headset, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  supportApi,
  type SupportMessage,
  type SupportTypingEvent,
} from '@/features/support/api';
import { useAuthStore } from '@/lib/zustand/authStore';
import { getErrorMessage } from '@/utils/error';
import { socketClient } from '@/lib/socket';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function mergeSupportMessages(
  current: SupportMessage[],
  incoming: SupportMessage[],
): SupportMessage[] {
  const messagesById = new Map(
    current.map((message) => [message.id, message]),
  );
  incoming.forEach((message) => messagesById.set(message.id, message));
  return Array.from(messagesById.values()).sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
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

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard cá nhân',
  '/organizer/tournaments/create': 'Tạo giải đấu',
  '/organizer/tournaments/': 'Quản lý giải đấu',
  '/tournaments/': 'Chi tiết giải đấu',
  '/profile': 'Hồ sơ cá nhân',
  '/profile/edit': 'Chỉnh sửa hồ sơ',
  '/notifications': 'Thông báo',
  '/payments': 'Lịch sử thanh toán',
  '/matches': 'Danh sách trận đấu',
  '/leaderboard': 'Bảng xếp hạng',
  '/communities': 'Cộng đồng / CLB',
  '/communities/create': 'Tạo cộng đồng',
  '/admin': 'Admin Dashboard',
  '/admin/tournaments': 'Admin - Quản lý giải',
  '/admin/communities': 'Admin - Quản lý CLB',
  '/admin/verification': 'Admin - Xác minh',
  '/admin/disputes': 'Admin - Khiếu nại',
  '/admin/reports': 'Admin - Báo cáo',
  '/admin/transactions': 'Admin - Giao dịch',
  '/admin/payouts': 'Admin - Payout',
  '/admin/configs': 'Admin - Cấu hình',
  '/admin/support': 'Admin - Hỗ trợ',
  '/admin/moderation': 'Admin - Kiểm duyệt',
  '/moderation': 'Kiểm duyệt',
  '/series': 'Chuỗi giải đấu',
  '/live/': 'Trận đấu trực tiếp',
  '/chat': 'Tin nhắn',
  '/download': 'Tải ứng dụng',
  '/terms': 'Điều khoản dịch vụ',
  '/privacy': 'Chính sách bảo mật',
  '/login': 'Đăng nhập',
  '/register': 'Đăng ký',
  '/forgot-password': 'Quên mật khẩu',
};

function getPageTitle(pathname: string): string {
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix)) return title;
  }
  // Patterns with dynamic segments: /tournaments/[id], /organizer/tournaments/[id]/manage, etc.
  if (pathname.startsWith('/tournaments/') && pathname.split('/').length === 3) return 'Chi tiết giải đấu';
  if (pathname.includes('/manage')) return 'Quản lý giải đấu';
  if (pathname.includes('/ops')) return 'Vận hành giải đấu';
  if (pathname.startsWith('/users/')) return 'Hồ sơ người dùng';
  return 'Trang chủ';
}

export default function AiChatAssistant() {
  const router = useRouter();
  const getSearchParamsString = () => (typeof window !== 'undefined' ? window.location.search : '');
  const { isAuthenticated, user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'ai' | 'support'>('ai');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là **Trợ lý ảo VNDC Sport**. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể hỏi tôi về cách đăng ký giải, cách tính ELO, chính sách hoàn tiền, hoặc các tính năng khác trên hệ thống.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportRoomId, setSupportRoomId] = useState<string | null>(null);
  const [isSupportAgentTyping, setIsSupportAgentTyping] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supportTypingTimerRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, supportMessages, isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'support' || !isAuthenticated) return;

    const socket = socketClient.refreshChatAuthentication();
    let activeRoomId: string | null = null;
    let disposed = false;
    let syncInFlight = false;

    const appendMessage = (message: SupportMessage) => {
      if (!activeRoomId || message.roomId !== activeRoomId) return;
      setSupportMessages((current) => mergeSupportMessages(current, [message]));
    };

    const handleTyping = (event: SupportTypingEvent) => {
      if (
        event.roomId !== activeRoomId ||
        event.userId === user?.id ||
        !event.isSupportStaff
      ) {
        return;
      }
      setIsSupportAgentTyping(event.isTyping);
    };

    const loadSupportMessages = async () => {
      if (syncInFlight || document.hidden) return;
      syncInFlight = true;
      try {
        const conversation = await supportApi.getMine();
        if (disposed) return;
        setSupportMessages((current) =>
          mergeSupportMessages(current, conversation?.messages ?? []),
        );
        if (conversation?.id && activeRoomId !== conversation.id) {
          if (activeRoomId) socket.emit('leaveChatRoom', activeRoomId);
          activeRoomId = conversation.id;
          setSupportRoomId(conversation.id);
          socket.emit('subscribeMySupport');
        }
      } catch {
        // Socket remains primary; polling recovers from proxy/network gaps.
      } finally {
        syncInFlight = false;
      }
    };

    const subscribe = () => socket.emit('subscribeMySupport');
    socket.on('connect', subscribe);
    socket.on('chat:message', appendMessage);
    socket.on('support:typing', handleTyping);
    if (!socket.connected) socket.connect();
    else subscribe();
    void loadSupportMessages();
    const handleFocus = () => void loadSupportMessages();
    const timer = window.setInterval(() => void loadSupportMessages(), 2000);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      socket.off('connect', subscribe);
      socket.off('chat:message', appendMessage);
      socket.off('support:typing', handleTyping);
      if (activeRoomId) socket.emit('leaveChatRoom', activeRoomId);
      setIsSupportAgentTyping(false);
    };
  }, [isAuthenticated, isOpen, mode, user?.id]);

  useEffect(() => () => {
    if (supportTypingTimerRef.current) {
      window.clearTimeout(supportTypingTimerRef.current);
    }
  }, []);

  const emitSupportTyping = (isTyping: boolean) => {
    if (!supportRoomId) return;
    socketClient.getChatSocket().emit('supportTyping', {
      roomId: supportRoomId,
      isTyping,
    });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (mode !== 'support' || !supportRoomId) return;

    emitSupportTyping(value.trim().length > 0);
    if (supportTypingTimerRef.current) {
      window.clearTimeout(supportTypingTimerRef.current);
    }
    supportTypingTimerRef.current = window.setTimeout(
      () => emitSupportTyping(false),
      1200,
    );
  };

  const handleOpenSupport = async () => {
    if (!isAuthenticated || !user) {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname || '/')}`);
      toast('Đăng nhập để trò chuyện trực tiếp với admin.');
      return;
    }

    setIsLoading(true);
    try {
      const initialMessage =
        input.trim() || `Tôi cần admin hỗ trợ tại trang ${pathname || '/'}.`;
      const conversation = await supportApi.send(initialMessage);
      setSupportMessages(conversation.messages);
      setSupportRoomId(conversation.id);
      setInput('');
      setMode('support');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể kết nối với bộ phận hỗ trợ.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendSupportMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isSendingSupport) return;
    setIsSendingSupport(true);
    setInput('');
    emitSupportTyping(false);
    try {
      const conversation = await supportApi.send(content);
      setSupportRoomId(conversation.id);
      setSupportMessages((current) =>
        mergeSupportMessages(current, conversation.messages),
      );
    } catch (error) {
      setInput((current) => current || content);
      toast.error(getErrorMessage(error, 'Không gửi được tin nhắn hỗ trợ.'));
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          currentUrl: pathname,
          pageTitle: getPageTitle(pathname),
          isMobile: typeof navigator !== 'undefined' && /Mobile|Android|iPhone/.test(navigator.userAgent),
          searchParams: getSearchParamsString(),
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
      if (mode === 'support') {
        void handleSendSupportMessage(input);
      } else {
        void handleSendMessage(input);
      }
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
            className="w-[340px] sm:w-[370px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '490px' }}
          >
            {/* Header — brand blue design matching the website */}
            <div className="h-[60px] shrink-0 bg-blue-600 flex items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  {mode === 'support' ? (
                    <Headset className="w-4.5 h-4.5 text-white" />
                  ) : (
                    <Bot className="w-4.5 h-4.5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-white font-bold text-[13px] leading-tight flex items-center gap-1">
                    {mode === 'support' ? 'Chat trực tiếp với admin' : 'Trợ lý AI VNDC Sport'}
                    {mode === 'ai' && <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />}
                  </p>
                  <p className="text-white/85 text-[10px] leading-tight mt-0.5">
                    {mode === 'support' ? 'Tin nhắn được chuyển tới quản trị viên' : 'Hỗ trợ thông tin thi đấu 24/7'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {mode === 'support' && (
                  <button
                    type="button"
                    onClick={() => setMode('ai')}
                    title="Quay lại trợ lý AI"
                    className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white min-h-0">
              {mode === 'ai' && messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || 'Bạn'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        (user?.fullName || user?.email || 'B').charAt(0).toUpperCase()
                      )
                    ) : (
                      <img
                        src="/vndcsport.svg"
                        alt="VNDC Sport"
                        className="h-5 w-5 object-contain"
                      />
                    )}
                  </div>
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-lg text-[12.5px] leading-relaxed shadow-sm border ${
                      msg.role === 'user'
                        ? 'bg-white border-slate-200 text-slate-800 rounded-tr-sm'
                        : 'bg-slate-50 border-slate-100 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {mode === 'support' && supportMessages.length === 0 && !isLoading && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                  <Headset className="mx-auto mb-2 h-7 w-7 text-blue-600" />
                  <p className="text-xs font-semibold text-slate-800">
                    Cuộc hội thoại đã được chuyển tới admin
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Bạn có thể gửi nội dung cần hỗ trợ ngay bên dưới.
                  </p>
                </div>
              )}

              {mode === 'support' && supportMessages.map((msg) => {
                const mine = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 items-start ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        mine
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {mine ? (
                        user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || 'Bạn'}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          (user?.fullName || user?.email || 'B').charAt(0).toUpperCase()
                        )
                      ) : msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName || 'Hỗ trợ'}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <Headset className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className={`max-w-[78%] ${mine ? 'text-right' : 'text-left'}`}>
                      <p className="mb-1 truncate text-[10px] font-semibold text-slate-500">
                        {mine ? user?.fullName || 'Bạn' : msg.senderName || 'Hỗ trợ VNDC Sport'}
                      </p>
                      <div
                        className={`px-3.5 py-2.5 rounded-lg text-[12.5px] leading-relaxed shadow-sm border whitespace-pre-wrap break-words ${
                          mine
                            ? 'bg-white border-slate-200 text-slate-800 rounded-tr-sm'
                            : 'bg-blue-50 border-blue-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        {msg.messageText}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && mode === 'ai' && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                    {mode === 'support' ? <Headset className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-lg rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              {mode === 'support' && isSupportAgentTyping && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Headset className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-lg rounded-tl-sm border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="mb-1 text-[10px] font-semibold text-blue-700">
                      Admin đang nhập
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {mode === 'ai' && messages.length <= 2 && !isLoading && (
              <div className="px-4 py-2.5 bg-white border-t border-slate-100 shrink-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Gợi ý câu hỏi
                </p>
                <div className="flex flex-col gap-1">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left text-[11px] px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-semibold truncate">{prompt}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 text-blue-500 transition-opacity" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleOpenSupport()}
                    className="mt-1 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-[11px] font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                  >
                    <span className="flex items-center gap-2">
                      <Headset className="h-3.5 w-3.5" />
                      Chat trực tiếp với admin
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
              <textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={mode === 'support' ? 'Nhắn nội dung cần admin hỗ trợ...' : 'Hỏi trợ lý ảo về giải đấu...'}
                rows={1}
                className="flex-1 resize-none max-h-20 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-[12.5px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
              />
              <button
                onClick={() =>
                  mode === 'support'
                    ? void handleSendSupportMessage(input)
                    : void handleSendMessage(input)
                }
                disabled={!input.trim() || isLoading || isSendingSupport}
                className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
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
