import React, { useEffect, useState, useRef } from 'react';
import { chatAPI, superAdminAPI, notificationAPI } from '../services/api';
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
    countsPollRef.current = window.setInterval(loadUnreadCounts, 8000) as unknown as number;

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

    // poll every 8s
    pollRef.current = window.setInterval(refresh, 8000) as unknown as number;

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
    <div className="p-4">
      <div className="w-full mb-4 flex items-center">
        <button onClick={() => { window.location.href = '/super-admin'; }} className="px-2 py-1 mr-4 bg-white border rounded text-supergreenDark hover:bg-gray-50">Back</button>
        <h2 className="text-xl font-semibold flex-1 text-center">Messages</h2>
        <div className="w-16" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="hidden md:block md:w-1/6" />

        <div className="md:w-1/4 flex flex-col items-center">
          <h4 className="font-semibold mb-3">Admins</h4>
          <div className="w-full">
            {admins.length === 0 ? (
              <div className="text-sm text-gray-500 text-center">No admins yet</div>
            ) : (
              <ul className="space-y-3 w-full">
                {admins.map((a: any) => {
                  const aid = (a.adminId || a._id).toString();
                  const unread = unreadCounts[aid] || 0;
                  const displayName = a.username || a.name || a.email || 'Admin';
                  return (
                    <li key={aid} className="flex justify-center">
                      <button
                        onClick={() => setSelectedAdmin(aid)}
                        className={`w-full max-w-xs flex items-center justify-between gap-3 px-4 py-2 rounded ${selectedAdmin === aid ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'} shadow-sm`}
                      >
                        <span className="truncate">{displayName}</span>
                        {unread > 0 && <span className="ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unread}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <h4 className="font-semibold">Conversation</h4>

          {/* Card container for messages + input */}
          <div className="mt-4 bg-white shadow rounded-lg p-4 flex-1 flex flex-col min-h-[300px] mx-auto w-full max-w-5xl">
            {!selectedAdmin ? (
              <div className="p-8 border border-dashed border-gray-300 rounded text-center text-gray-600">Select an admin from the list to open the conversation</div>
            ) : (
              <>
                <div className="flex-1 overflow-auto space-y-3 px-2 py-1 relative">
                  {/* provide bottom padding so last message isn't hidden behind the sticky input */}
                  <div className="pb-28">
                    {messages
                      .filter(m => {
                        const aid = (m.from?.adminId || m.from?._id || '').toString();
                        const toAid = (m.to?.adminId || m.to?._id || '').toString();
                        return aid === selectedAdmin || toAid === selectedAdmin;
                      })
                      .map(m => {
                        const fromSuper = m.from?.role === 'SUPER_ADMIN';
                        return (
                          <div key={m._id} className={`max-w-[75%] ${fromSuper ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                            <div className={`inline-block px-4 py-2 rounded-lg break-words ${fromSuper ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                              <div className="text-xs opacity-70">{m.from?.username || m.from?.role || 'User'} • {new Date(m.createdAt).toLocaleString()}</div>
                              <div className="mt-1 text-sm whitespace-pre-wrap">{m.content}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* input area: sticky at bottom of the scrollable messages area */}
                  <div className="sticky bottom-0 bg-white pt-3 border-t border-gray-100">
                    <div className="flex items-end gap-2 px-2">
                      <textarea
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            const maxH = 160;
                            el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
                            el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
                          }
                        }}
                        value={reply}
                        onChange={e => {
                          setReply(e.target.value);
                          const ta = e.currentTarget as HTMLTextAreaElement;
                          ta.style.height = 'auto';
                          const maxH = 160;
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
                        className="flex-1 border rounded-full p-3 resize-none min-h-[42px] max-h-[160px]"
                        placeholder={selectedAdmin ? `Reply to ${selectedAdmin}` : 'Select an admin to reply'}
                      />
                      <button
                        onClick={sendReply}
                        disabled={!selectedAdmin || !reply.trim()}
                        className="p-3 rounded bg-supergreenDark text-white disabled:opacity-50 hover:bg-green-700 flex items-center justify-center"
                        aria-label="Send"
                      >
                        <FiSend size={18} />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 px-2">Press Enter to send, Shift+Enter for newline</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminMessages;
