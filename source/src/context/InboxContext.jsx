// Conversations (one per swap), what's unread, and a chime + app badge when something new arrives.
// "Read up to" times are kept on this device.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { fetchSwaps, fetchMessagesFor } from '../lib/api.js';
import { playSound } from '../lib/sounds.js';

const POLL_MS = 10000;
const InboxContext = createContext(null);

const readKey = (userId) => `swapstyle-read-${userId}`;
function loadRead(userId) {
  try {
    return JSON.parse(localStorage.getItem(readKey(userId)) || '{}');
  } catch {
    return {};
  }
}
function saveRead(userId, map) {
  try {
    localStorage.setItem(readKey(userId), JSON.stringify(map));
  } catch {}
}

export function InboxProvider({ children }) {
  const { user } = useAuth();
  const me = user?.id;
  const [swaps, setSwaps] = useState([]);
  const [messages, setMessages] = useState([]);
  const [readMap, setReadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastUnread = useRef(null);

  useEffect(() => {
    setReadMap(me ? loadRead(me) : {});
    setSwaps([]);
    setMessages([]);
    setLoading(true);
    lastUnread.current = null;
  }, [me]);

  const refresh = useCallback(async () => {
    if (!me) return;
    try {
      const s = await fetchSwaps(me);
      setSwaps(s);
      setMessages(await fetchMessagesFor(s.map((x) => x.id)));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    if (!me) return;
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState !== 'hidden') refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [me, refresh]);

  const markRead = useCallback(
    (swapId, at = new Date().toISOString()) => {
      if (!me) return;
      setReadMap((prev) => {
        if (prev[swapId] && prev[swapId] >= at) return prev;
        const next = { ...prev, [swapId]: at };
        saveRead(me, next);
        return next;
      });
    },
    [me]
  );

  const threads = useMemo(() => {
    const bySwap = new Map();
    for (const m of messages) {
      if (!bySwap.has(m.swap_id)) bySwap.set(m.swap_id, []);
      bySwap.get(m.swap_id).push(m); // newest first
    }
    return swaps
      .filter((s) => s.status !== 'declined' || bySwap.has(s.id))
      .map((s) => {
        const incoming = s.requested_item?.owner_id === me;
        const partner = incoming ? s.requester : s.requested_item?.owner;
        const msgs = bySwap.get(s.id) ?? [];
        const last = msgs[0];
        const readAt = readMap[s.id];
        let unread = msgs.filter((m) => m.sender_id !== me && (!readAt || m.created_at > readAt)).length;
        // a new request someone sent me counts as one unread until I open it
        if (incoming && !readAt && unread === 0) unread = 1;
        return {
          swap: s,
          incoming,
          partner,
          last,
          preview: last ? last.body : s.message || null,
          lastFromMe: last ? last.sender_id === me : !incoming,
          lastAt: last?.created_at ?? s.updated_at ?? s.created_at,
          unread,
        };
      })
      .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
  }, [swaps, messages, readMap, me]);

  const unreadTotal = useMemo(() => threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0), [threads]);
  const unreadMessages = useMemo(() => threads.reduce((n, t) => n + t.unread, 0), [threads]);

  // chime + home-screen badge when something new arrives
  useEffect(() => {
    if (loading) return;
    if (lastUnread.current !== null && unreadMessages > lastUnread.current) playSound('message');
    lastUnread.current = unreadMessages;
    try {
      if (unreadTotal > 0) navigator.setAppBadge?.(unreadTotal)?.catch?.(() => {});
      else navigator.clearAppBadge?.()?.catch?.(() => {});
    } catch {}
  }, [unreadMessages, unreadTotal, loading]);

  const value = useMemo(
    () => ({ threads, unreadTotal, loading, error, refresh, markRead }),
    [threads, unreadTotal, loading, error, refresh, markRead]
  );
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  return (
    useContext(InboxContext) ?? { threads: [], unreadTotal: 0, loading: false, error: null, refresh: () => {}, markRead: () => {} }
  );
}
