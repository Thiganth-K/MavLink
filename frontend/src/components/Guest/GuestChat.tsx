import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiSend, FiX } from 'react-icons/fi';
import { chatAPI } from '../../services/api';

type Props = { onClose: () => void };

type Msg = {
  _id: string;
  from: any;
  to: any;
  content: string;
  createdAt: string;
  read?: boolean;
};

export default function GuestChatModal({ onClose }: Props) {
  const CHAT_POLL_MS = 5000;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const msgs: Msg[] = await chatAPI.listMessages();
      setMessages(msgs || []);
    } catch (e) {
      console.error('Failed to load chat messages', e);
    }
  };

  useEffect(() => {
    const doLoad = async () => {
      try {
        const msgs: Msg[] = await chatAPI.listMessages();
        setMessages(msgs || []);

        // mark unread messages addressed to this guest as read
        const toMark = (msgs || []).filter(m => m.to && m.to.role === 'GUEST' && !m.read).map(m => m._id);
        if (toMark.length) {
          await Promise.all(toMark.map((id: string) => chatAPI.markMessageRead(id).catch(() => {})));
          const refreshed: Msg[] = await chatAPI.listMessages();
          setMessages(refreshed || []);
        }
      } catch (e) {
        console.error('Failed to init guest chat', e);
      }
    };

    doLoad();

    // Poll chat messages periodically
    pollRef.current = window.setInterval(load, CHAT_POLL_MS) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await chatAPI.guestSend(trimmed);
      setInput('');
      await load();
    } catch (e) {
      console.error('Send failed', e);
      alert((e as any).message || 'Send failed');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-lg font-semibold text-violet-900">Chat with Superadmin</div>
          <button
            aria-label="Close chat"
            onClick={onClose}
            className="p-2 rounded-md text-violet-700 hover:bg-violet-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 h-[60vh] flex flex-col">
          <div ref={listRef} className="flex-1 overflow-auto space-y-3 pb-4">
            {messages.length === 0 && <div className="text-sm text-gray-500">No messages yet</div>}
            {messages.map(m => {
              const fromGuest = m.from?.role === 'GUEST';
              return (
                <div key={m._id} className={`max-w-[75%] ${fromGuest ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                  <div className={`inline-block px-4 py-2 rounded-lg ${fromGuest ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <div className="text-xs opacity-70">
                      {m.from?.username || m.from?.role || ''} • {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 px-3 py-2 border border-violet-200 rounded-lg resize-none h-12"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-12 h-12 rounded-lg bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-50"
            >
              <FiSend className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
