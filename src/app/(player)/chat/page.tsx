'use client';

import { useEffect, useState, useRef } from 'react';
import { chatApi, ChatConversation, ChatMessage } from '@/features/chat/api';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/lib/zustand/authStore';
import { Search, Send, Paperclip, MoreVertical, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations initially
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await chatApi.getConversations();
        setConversations(data);
        if (data.length > 0) {
          setActiveConvId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch conversations', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const data = await chatApi.getMessages(activeConvId);
        setMessages(data);
        scrollToBottom();
      } catch (error) {
        console.error('Failed to fetch messages', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();

    // Socket Setup for the active conversation
    const socket = socketClient.getChatSocket();
    socket.connect();
    socket.emit('joinConversation', activeConvId);

    socket.on('newMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    return () => {
      socket.emit('leaveConversation', activeConvId);
      socket.off('newMessage');
    };
  }, [activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const socket = socketClient.getChatSocket();
    
    // In a real implementation, you might want to call REST API or just emit via socket
    socket.emit('sendMessage', {
      conversationId: activeConvId,
      content: inputText,
    });

    // Optimistic UI update (optional, usually backend responds via 'newMessage' event)
    setInputText('');
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      
      {/* Left Sidebar - Conversations */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 mb-4">Tin nhắn</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoadingConversations ? (
            <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : conversations.length > 0 ? (
            conversations.map(conv => {
              const otherParticipant = conv.participants.find(p => p.id !== user?.id) || conv.participants[0];
              const name = conv.type === 'PRIVATE' ? otherParticipant?.fullName : conv.name || 'Nhóm Chat';
              const isActive = conv.id === activeConvId;

              return (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveConvId(conv.id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50 ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-slate-500">{name?.substring(0, 1).toUpperCase() || 'U'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`font-bold text-sm truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>{name}</h3>
                      {conv.lastMessage && (
                        <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${isActive ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>
                      {conv.lastMessage?.content || 'Chưa có tin nhắn'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-500">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-sm">Bạn chưa có cuộc trò chuyện nào.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Area - Chat Messages */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {activeConvId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="font-bold text-slate-500">
                    {(activeConversation.type === 'PRIVATE' 
                      ? activeConversation.participants.find(p => p.id !== user?.id)?.fullName 
                      : activeConversation.name)?.substring(0, 1).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {activeConversation.type === 'PRIVATE' 
                      ? activeConversation.participants.find(p => p.id !== user?.id)?.fullName 
                      : activeConversation.name || 'Nhóm Chat'}
                  </h3>
                  <p className="text-xs text-emerald-500 font-medium">Đang trực tuyến</p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  const showAvatar = index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId;
                  
                  return (
                    <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      {!isMe && (
                        <div className={`w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center ${!showAvatar ? 'invisible' : ''}`}>
                          <span className="text-xs font-bold text-slate-500">{msg.sender.fullName.substring(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      
                      {/* Message Bubble */}
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm shadow-sm'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-medium px-1">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p className="text-sm font-medium">Bắt đầu cuộc trò chuyện</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <button type="button" className="w-10 h-10 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-slate-100 border-none rounded-full py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium text-slate-500">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        )}
      </div>

    </div>
  );
}
