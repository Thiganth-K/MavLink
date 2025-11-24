import React, { useEffect, useState } from 'react';
import { chatAPI, notificationAPI } from '../services/api';
import { FiSend } from 'react-icons/fi';

interface Message {
  _id: string;
  from: any;
  to: any;
  content: string;
  createdAt: string;
  read?: boolean;
}

const AdminChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const msgs = await chatAPI.listMessages();
      setMessages(msgs || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  useEffect(() => {
    const doLoad = async () => {
      try {
        const msgs = await chatAPI.listMessages();
        setMessages(msgs || []);

        // auto-mark unread messages addressed to this admin as read
        const toMark = (msgs || []).filter((m: any) => m.to && m.to.role === 'ADMIN' && !m.read).map((m: any) => m._id);
        if (toMark.length) {
          await Promise.all(toMark.map((id: string) => chatAPI.markMessageRead(id).catch(() => {})));
          // notify other parts of app to refresh notifications
          try { window.dispatchEvent(new CustomEvent('notificationsChanged')); } catch (e) {}
          // reload messages after marking
          const refreshed = await chatAPI.listMessages();
          setMessages(refreshed || []);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    doLoad();
    // simple polling for notifications/messages
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const send = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await chatAPI.adminSend(content.trim());
      setContent('');
      await notificationAPI.list(); // optionally refresh notifications
      try { window.dispatchEvent(new CustomEvent('notificationsChanged')); } catch (e) {}
      await load();
    } catch (err) {
      console.error(err);
      alert((err as any).message || 'Send failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ensure there's space from any fixed navbar/profile and center the card */}
      <div className="pt-24 px-4 flex justify-center">
        <div className="w-full max-w-[1400px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Message to Superadmin</h3>
          </div>

          {/* Card container for conversation - centered */}
          <div className="bg-white shadow rounded-lg p-4 flex flex-col min-h-[380px] relative z-0">
        <div className="flex-1 overflow-auto mb-4 relative">
          <h4 className="text-md font-medium">Conversation</h4>
          <div className="mt-2 space-y-2 pb-28">
            {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet</div>}
            {messages.map(m => {
              const fromAdmin = m.from?.role === 'ADMIN';
              return (
                <div key={m._id} className={`max-w-[75%] ${fromAdmin ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                  <div className={`inline-block px-4 py-2 rounded-lg ${fromAdmin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <div className="text-xs opacity-70">{m.from?.username || m.from?.role || ''} • {new Date(m.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-sm whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* sticky input inside messages area */}
          <div className="sticky bottom-0 bg-white pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 px-2">
              <textarea
                ref={(el) => {
                  if (el) {
                    // adjust height on mount/input
                    el.style.height = 'auto';
                    const maxH = 160;
                    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
                    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
                  }
                }}
                value={content}
                onChange={e => {
                  setContent(e.target.value);
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
                    send();
                  }
                }}
                className="flex-1 border rounded-full p-3 resize-none min-h-[42px] max-h-[160px]"
                placeholder="Write your message to superadmin"
                style={{height: 'auto'}}
              />
              <button onClick={send} disabled={loading || !content.trim()} className="p-3 rounded-full bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center">
                <FiSend size={18} />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1 px-2">Press Enter to send, Shift+Enter for newline</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default AdminChat;
