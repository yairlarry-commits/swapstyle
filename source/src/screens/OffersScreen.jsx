import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, ArrowDownLeft, ArrowUpRight, Inbox, Repeat2, MessageCircle, X, Check, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import { fetchSwaps, updateSwapStatus } from '../lib/api.js';
import { conditionLabel, timeAgo } from '../lib/constants.js';
import { isSoundEnabled, playSound, setSoundEnabled, unlockAudio } from '../lib/sounds.js';
import { Avatar, Button, ItemVisual } from '../components/ui.jsx';

export function OffersScreen() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const pendingCount = useRef(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setSwaps(await fetchSwaps(user.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Chime when new incoming pending requests appear
  useEffect(() => {
    if (loading || !swaps.length) return;
    const n = swaps.filter((s) => s.requested_item?.owner_id === user?.id && s.status === 'pending').length;
    if (n > pendingCount.current && pendingCount.current !== 0) playSound('swap-request');
    pendingCount.current = n;
  }, [swaps, loading, user]);

  const act = async (id, status) => {
    setActingId(id);
    try {
      await updateSwapStatus(id, status);
      playSound(status === 'accepted' ? 'swap-accepted' : 'swap-declined');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActingId(null);
    }
  };

  const visible = swaps.filter((s) => {
    if (tab === 'all') return true;
    const incoming = s.requested_item?.owner_id === user?.id;
    return tab === 'incoming' ? incoming : !incoming;
  });

  return (
    <div className="min-h-screen bg-sand-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-sand-50/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto max-w-md px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink-900">Offers</h1>
              <p className="text-xs text-ink-400">Your swap requests &amp; incoming offers</p>
            </div>
            <button
              onClick={() => {
                unlockAudio();
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
                if (next) playSound('pop');
              }}
              aria-label={soundOn ? 'Mute notifications' : 'Unmute notifications'}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-600 ring-1 ring-ink-200 transition active:scale-95"
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-md gap-1 px-5 pb-3">
          {['all', 'incoming', 'outgoing'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                tab === t ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 ring-1 ring-ink-200'
              }`}
            >
              {t === 'incoming' && <ArrowDownLeft size={13} className="flip-rtl" />}
              {t === 'outgoing' && <ArrowUpRight size={13} className="flip-rtl" />}
              {t === 'all' && <Inbox size={13} />}
              {t === 'all' ? 'All' : t === 'incoming' ? 'Incoming' : 'Sent'}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-4">
        {error && <div className="mb-4 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 w-full rounded-2xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-card">
              <Inbox size={26} className="text-ink-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900">No offers yet</h3>
            <p className="mt-1 max-w-xs text-sm text-ink-500">When someone requests one of your items, or you request theirs, it'll show up here.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate({ name: 'feed' })}>Browse the feed</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((s) => (
              <SwapCard
                key={s.id}
                swap={s}
                incoming={s.requested_item?.owner_id === user?.id}
                acting={actingId === s.id}
                onAccept={() => act(s.id, 'accepted')}
                onDecline={() => act(s.id, 'declined')}
                onOpenItem={(id) => navigate({ name: 'item', itemId: id })}
                onOpenProfile={(id) => navigate({ name: 'profile', userId: id })}
                onOpenSwap={() => navigate({ name: 'swap', swapId: s.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SwapCard({ swap, incoming, acting, onAccept, onDecline, onOpenItem, onOpenProfile, onOpenSwap }) {
  const wanted = swap.requested_item;
  const offered = swap.offered_item;
  // The "other person" in this swap
  const other = incoming ? swap.requester : wanted?.owner;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card animate-fade-in">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${incoming ? 'bg-sage-100 text-sage-700' : 'bg-ink-100 text-ink-600'}`}>
            {incoming ? <ArrowDownLeft size={12} className="flip-rtl" /> : <ArrowUpRight size={12} className="flip-rtl" />}
            {incoming ? 'Incoming' : 'Sent'}
          </span>
          <StatusBadge status={swap.status} />
        </div>
        <span className="text-[10px] text-ink-400">{timeAgo(swap.created_at)}</span>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <SwapSide label="Offered" item={offered} onOpen={onOpenItem} />
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-600">
          <Repeat2 size={14} />
        </div>
        <SwapSide label="For" item={wanted} onOpen={onOpenItem} />
      </div>

      {swap.message && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink-700">
          <MessageCircle size={13} className="mt-0.5 shrink-0 text-ink-400" />
          <p className="italic">"{swap.message}"</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2.5">
        {other ? (
          <button onClick={() => onOpenProfile(other.id)} className="flex items-center gap-2">
            <Avatar name={other.username} color={other.avatar_color} size="sm" />
            <span className="text-xs font-medium text-ink-700"><bdi>@{other.username}</bdi></span>
          </button>
        ) : (
          <span />
        )}

        {incoming && swap.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" loading={acting} onClick={onDecline}><X size={14} /> Decline</Button>
            <Button size="sm" loading={acting} onClick={onAccept}><Check size={14} /> Accept</Button>
          </div>
        )}
        {swap.status === 'accepted' && <span className="flex items-center gap-1 text-xs font-semibold text-sage-700"><Check size={13} /> Accepted</span>}
        {swap.status === 'declined' && <span className="flex items-center gap-1 text-xs font-semibold text-ink-400"><X size={13} /> Declined</span>}
        {swap.status === 'pending' && !incoming && <span className="flex items-center gap-1 text-xs font-medium text-ink-400"><Clock size={13} /> Awaiting reply</span>}
        {swap.status === 'completed' && <span className="flex items-center gap-1 text-xs font-semibold text-sage-700"><Check size={13} /> Completed</span>}
      </div>
      {swap.status !== 'declined' && (
        <button
          onClick={onOpenSwap}
          className="flex w-full items-center justify-between border-t border-ink-100 bg-sand-50 px-4 py-2.5 text-xs font-semibold text-ink-900 transition hover:bg-sand-100"
        >
          <span className="flex items-center gap-1.5">
            <MessageCircle size={14} /> Chat &amp; swap details
            <span className="font-normal text-ink-400">· {swap.method === 'shipping' ? 'Shipping' : 'Meet in person'}</span>
          </span>
          <ArrowUpRight size={14} className="flip-rtl" />
        </button>
      )}
    </div>
  );
}

function SwapSide({ label, item, onOpen }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      {item && (
        <button onClick={() => onOpen(item.id)} className="shrink-0">
          <ItemVisual garment={item.garment_type} color={item.color} imageUrl={item.image_url} className="h-14 w-14 rounded-xl" />
        </button>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
        <p className="truncate text-xs font-semibold text-ink-900">{item?.title}</p>
        <p className="text-[10px] text-ink-500">{item && conditionLabel(item.condition)}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'bg-sand-100 text-sand-700' },
    accepted: { label: 'Accepted', cls: 'bg-sage-100 text-sage-700' },
    declined: { label: 'Declined', cls: 'bg-ink-100 text-ink-500' },
    countered: { label: 'Countered', cls: 'bg-accent-100 text-accent-700' },
    completed: { label: 'Completed', cls: 'bg-sage-100 text-sage-700' },
  };
  const s = map[status] ?? map.pending;
  return <span className={`rounded-full px-2 py-0.5 font-semibold ${s.cls}`}>{s.label}</span>;
}
