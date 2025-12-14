import React, { useEffect, useState, useRef } from 'react';
import { chatAPI, superAdminAPI, notificationAPI } from '../../services/api';
import { FiSend } from 'react-icons/fi';

interface Message {
  _id: string;
  from: any;
  to: any;
  content: string;
  createdAt: string;
  read?: boolean;
}

const SuperAdminMessages: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const pollRef = useRef<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const countsPollRef = useRef<number | null>(null);

  const loadAdmins = async () => {
    try {
      const list = await superAdminAPI.getAdmins();
      // show only ADMIN role entries (exclude SUPER_ADMIN)
      const filtered = Array.isArray(list) ? list.filter((x: any) => x.role === 'ADMIN') : [];
      setAdmins(filtered);
    } catch (err) {
      console.error('Failed to load admins', err);
    }
  };

  const loadMessages = async (adminId?: string | null) => {
    try {
      const res = await chatAPI.listMessages(adminId || undefined);
      setMessages(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  useEffect(() => {
    loadAdmins();
    // load unread counts and poll
    const loadUnreadCounts = async () => {
        try {
          // use notification API as the source of truth for unread counts
          const all = await notificationAPI.list();
          const arr = Array.isArray(all) ? all : [];
          const counts: Record<string, number> = {};
          arr.forEach((n: any) => {
            // use sender from populated notification or meta
            const aid = (n.sender && (n.sender.adminId || n.sender._id)) || (n.meta && (n.meta.fromAdminId || n.meta.toAdminId));
            if (!aid) return;
            counts[aid.toString()] = (counts[aid.toString()] || 0) + 1;
          });
          setUnreadCounts(counts);
        } catch (err) {
          console.error('Failed to load unread counts', err);
        }
      };

    loadUnreadCounts();
    // Poll unread counts every 5 minutes
    countsPollRef.current = window.setInterval(loadUnreadCounts, 300000) as unknown as number;

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (countsPollRef.current) window.clearInterval(countsPollRef.current);
    };
  }, []);

  // read optional adminId from query string to open conversation directly
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const aid = qs.get('adminId') || qs.get('withAdminId');
      if (aid) setSelectedAdmin(aid);
    } catch (e) {}
  }, []);

  // When selected admin changes, fetch messages for that admin and auto-mark unread admin->superadmin messages
  useEffect(() => {
    if (!selectedAdmin) {
      setMessages([]);
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await chatAPI.listMessages(selectedAdmin);
        if (cancelled) return;
        setMessages(Array.isArray(res) ? res : []);

        // Auto-mark messages addressed to SUPER_ADMIN as read
        const toMark = (res || []).filter((m: Message) => {
          const isToSuper = m.to && (m.to.role === 'SUPER_ADMIN' || m.to === 'SUPER_ADMIN');
          return isToSuper && !m.read;
        });

        if (toMark.length) {
          await Promise.all(toMark.map((m: Message) => chatAPI.markMessageRead(m._id).catch(() => {})));
          // notify navbars to refresh notifications immediately
          try { window.dispatchEvent(new CustomEvent('notificationsChanged')); } catch (e) {}
          // refresh after marking
          const after = await chatAPI.listMessages(selectedAdmin);
          if (!cancelled) setMessages(Array.isArray(after) ? after : []);
        }
      } catch (err) {
        console.error('refresh messages failed', err);
      }
    };

    refresh();

    // poll every 5 minutes
    pollRef.current = window.setInterval(refresh, 300000) as unknown as number;

    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedAdmin]);

  const sendReply = async () => {
    if (!selectedAdmin || !reply.trim()) return;
    try {
      await chatAPI.superadminReply(selectedAdmin, reply.trim());
      setReply('');
      // notify admin navbars/clients to refresh notifications immediately
      try { window.dispatchEvent(new CustomEvent('notificationsChanged')); } catch (e) {}
      await loadMessages(selectedAdmin);
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-supercream to-violet-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-purple-950">Messages</h1>
          <button 
            onClick={() => { window.location.href = '/super-admin'; }} 
            className="px-4 py-2 bg-white border border-purple-300 text-purple-900 rounded-lg shadow-sm hover:shadow-md hover:border-purple-500 transition-all font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '75vh' }}>
          <div className="grid grid-cols-1 md:grid-cols-12 h-full" style={{ minHeight: '75vh' }}>
            
            {/* Left Sidebar - Admin List */}
            <div className="md:col-span-4 border-r border-gray-200 bg-gradient-to-b from-purple-50 to-white p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-purple-950">Admins</h2>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
                </span>
              </div>
              
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(75vh - 120px)' }}>
                {admins.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No admins available</p>
                  </div>
                ) : (
                  admins.map((a: any) => {
                    const aid = (a.adminId || a._id).toString();
                    const unread = unreadCounts[aid] || 0;
                    const displayName = a.username || a.name || a.email || 'Admin';
                    const isSelected = selectedAdmin === aid;
                    
                    return (
                      <button
                        key={aid}
                        onClick={() => setSelectedAdmin(aid)}
                        className={`w-full flex items-center gap-3 p-4 transition-all duration-200 ${
                          isSelected
                            ? 'bg-purple-50 text-black-700 border-2 border-purple-600 shadow-lg transform scale-105 rounded-xl'
                            : 'bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-gray-800 rounded-xl'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-purple-100 text-purple-700 border border-purple-400' : 'bg-purple-50 text-purple-700 border border-purple-600'
                        }`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="mb-1">
                            <span className={`inline-block px-3 py-1 rounded-full truncate text-sm font-semibold ${
                              isSelected ? 'bg-transparent text-black' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {displayName}
                            </span>
                          </div>
                          <p className={`text-xs ${isSelected ? 'text-black/60' : 'text-gray-500'}`}>
                            {aid}
                          </p>
                        </div>
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] shadow-lg">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel - Conversation */}
            <div className="md:col-span-8 flex flex-col bg-white">
              {!selectedAdmin ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Conversation</h3>
                    <p className="text-gray-500">Choose an admin from the list to start messaging</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="border-b border-gray-200 p-4 bg-purple-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-700 border-2 border-purple-600 flex items-center justify-center font-bold">
                        {(admins.find(a => (a.adminId || a._id).toString() === selectedAdmin)?.username || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {admins.find(a => (a.adminId || a._id).toString() === selectedAdmin)?.username || selectedAdmin}
                        </h3>
                        <p className="text-xs text-gray-500">Admin ID: {selectedAdmin}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white" style={{ maxHeight: 'calc(75vh - 200px)' }}>
                    <div className="space-y-4">
                      {messages
                        .filter(m => {
                          const aid = (m.from?.adminId || m.from?._id || '').toString();
                          const toAid = (m.to?.adminId || m.to?._id || '').toString();
                          return aid === selectedAdmin || toAid === selectedAdmin;
                        })
                        .map(m => {
                          const fromSuper = m.from?.role === 'SUPER_ADMIN';
                          return (
                            <div key={m._id} className={`flex ${fromSuper ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] ${fromSuper ? 'text-right' : 'text-left'}`}>
                                <div className={`inline-block px-4 py-3 rounded-2xl shadow-md border-2 ${
                                  fromSuper 
                                    ? 'bg-purple-50 text-purple-900 border-purple-600 rounded-br-sm' 
                                    : 'bg-white border-gray-200 text-gray-800 rounded-bl-sm'
                                }`}>
                                  <div className={`text-xs mb-1 ${fromSuper ? 'text-purple-600' : 'text-gray-500'}`}>
                                    {m.from?.username || m.from?.role || 'User'} • {new Date(m.createdAt).toLocaleTimeString()}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-gray-200 p-4 bg-white">
                    <div className="flex items-end gap-3">
                      <textarea
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            const maxH = 120;
                            el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
                            el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
                          }
                        }}
                        value={reply}
                        onChange={e => {
                          setReply(e.target.value);
                          const ta = e.currentTarget as HTMLTextAreaElement;
                          ta.style.height = 'auto';
                          const maxH = 120;
                          const newH = Math.min(ta.scrollHeight, maxH);
                          ta.style.height = newH + 'px';
                          ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden';
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Type your message..."
                        rows={1}
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                      />
                      <button
                        onClick={sendReply}
                        disabled={!selectedAdmin || !reply.trim()}
                        className="p-3 rounded-xl bg-white text-purple-700 border-2 border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none"
                        aria-label="Send message"
                      >
                        <FiSend size={20} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 ml-1">Press Enter to send • Shift+Enter for new line</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminMessages;
