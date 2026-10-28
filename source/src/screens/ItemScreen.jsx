import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Package, Repeat2, Check, MessageCircle, Clock, Truck, Handshake, EyeOff, Eye, Ban } from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchItem, fetchAvailableItems, createSwapRequest, sendMessage, adminSetItemStatus, adminSetBanned } from '../lib/api.js';
import { conditionLabel, garmentLabel, swapPrefLabel, timeAgo, SWAP_METHODS, SHIPPING_FEE, methodsAllowed } from '../lib/constants.js';
import { Avatar, Button, ItemVisual, Sheet } from '../components/ui.jsx';
import { AdminBox, ConfirmButton, ReportButton } from '../components/Moderation.jsx';

export function ItemScreen({ itemId }) {
  const { navigate, back } = useRouter();
  const { user, profile } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swapOpen, setSwapOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchItem(itemId)
      .then((it) => alive && setItem(it))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [itemId]);

  const isMine = item?.owner_id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="skeleton aspect-[4/5] w-full" />
        <div className="mx-auto max-w-md space-y-3 px-5 py-6">
          <div className="skeleton h-6 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <BackBar onBack={back} />
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <p className="text-sm text-ink-500">{error || 'Item not found.'}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate({ name: 'feed' })}>Back to feed</Button>
        </div>
      </div>
    );
  }

  const owner = item.owner;
  return (
    <div className="min-h-screen bg-white pb-32">
      <BackBar onBack={back} />
      <div className="mx-auto max-w-md">
        <div className="relative aspect-[4/5] w-full">
          <ItemVisual garment={item.garment_type} color={item.color} imageUrl={item.image_url} className="h-full w-full" showSilhouette />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink-900 shadow-sm">{item.size}</span>
            <span className="rounded-full bg-ink-900/85 px-3 py-1 text-xs font-semibold text-white">{conditionLabel(item.condition)}</span>
            {item.item_type === 'bundle' && <span className="rounded-full bg-sand-500 px-3 py-1 text-xs font-semibold text-white">Bundle · {item.bundle_count}</span>}
          </div>
        </div>

        <div className="px-5 py-5">
          <h1 className="font-display text-2xl font-bold text-ink-900">{item.title}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {garmentLabel(item.garment_type)} · {item.category} · {timeAgo(item.created_at)}
          </p>
          {item.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{item.description}</p>}

          {owner && (
            <button
              onClick={() => navigate({ name: 'profile', userId: owner.id })}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-ink-100 bg-sand-50 p-3 text-start transition hover:border-ink-200"
            >
              <Avatar name={owner.username} color={owner.avatar_color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900"><bdi>@{owner.username}</bdi></p>
                <p className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} /> {owner.city || 'Location not set'}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500"><Package size={12} /> {swapPrefLabel(owner.swap_preference)}</p>
              </div>
            </button>
          )}

          {!isMine && item.status === 'available' && (
            <Button size="lg" className="mt-6 w-full" onClick={() => setSwapOpen(true)}>
              <Repeat2 size={18} /> Request Swap
            </Button>
          )}
          {isMine && (
            <div className="mt-6 rounded-2xl bg-ink-50 px-4 py-3 text-center text-sm text-ink-500">This is your item. Waiting for swap requests.</div>
          )}
          {item.status === 'swapped' && (
            <div className="mt-6 rounded-2xl bg-sage-50 px-4 py-3 text-center text-sm text-sage-700">Already swapped — congrats!</div>
          )}
          {item.status === 'removed' && (
            <div className="mt-6 rounded-2xl bg-accent-50 px-4 py-3 text-center text-sm text-accent-700">This item was removed and isn't visible in the feed.</div>
          )}

          {profile?.is_admin && (
            <div className="mt-6">
              <AdminBox>
                {item.status === 'removed' ? (
                  <Button size="sm" variant="outline" onClick={async () => { await adminSetItemStatus(item.id, 'available'); setItem(await fetchItem(item.id)); }}>
                    <Eye size={14} /> Restore item
                  </Button>
                ) : (
                  <ConfirmButton onConfirm={async () => { await adminSetItemStatus(item.id, 'removed'); setItem(await fetchItem(item.id)); }}>
                    <EyeOff size={14} /> Remove item
                  </ConfirmButton>
                )}
                {owner && !isMine && !owner.banned && (
                  <ConfirmButton onConfirm={async () => { await adminSetBanned(owner.id, true); setItem(await fetchItem(item.id)); }}>
                    <Ban size={14} /> Suspend <bdi>@{owner.username}</bdi>
                  </ConfirmButton>
                )}
              </AdminBox>
            </div>
          )}
          {!isMine && (
            <div className="mt-5 flex justify-center">
              <ReportButton targetType="item" targetId={item.id} label="Report this item" />
            </div>
          )}
        </div>
      </div>
      <SwapRequestSheet open={swapOpen} onClose={() => setSwapOpen(false)} target={item} myProfile={profile} />
    </div>
  );
}

function BackBar({ onBack }) {
  return (
    <div className="sticky top-0 z-20 bg-white/90 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center px-3 py-3">
        <button onClick={onBack} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-700 shadow-sm transition hover:bg-ink-50">
          <ArrowLeft size={20} className="flip-rtl" />
        </button>
      </div>
    </div>
  );
}

function SwapRequestSheet({ open, onClose, target }) {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const allowed = methodsAllowed(target.owner?.swap_preference);
  const [method, setMethod] = useState(allowed[0]);
  const [sentId, setSentId] = useState(null);
  const [mine, setMine] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingMine(true);
    setError(null);
    setSent(false);
    setSelected(null);
    setMessage('');
    setMethod(methodsAllowed(target.owner?.swap_preference)[0]);
    fetchAvailableItems(user.id)
      .then(setMine)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMine(false));
  }, [open, user]);

  const selectedItem = useMemo(() => mine.find((m) => m.id === selected) ?? null, [mine, selected]);

  const send = async () => {
    if (!selected) {
      setError('Pick one of your items to offer.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const created = await createSwapRequest({ requested_item_id: target.id, offered_item_id: selected, message: message.trim() || undefined, method });
      if (message.trim()) await sendMessage(created.id, message.trim()).catch(() => {});
      setSentId(created.id);
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={sent ? 'Swap requested' : 'Offer a swap'}>
      {sent ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-sage-100 text-sage-700">
            <Check size={30} />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-900">Request sent to <bdi>@{target.owner?.username}</bdi></h3>
          <p className="mt-1 max-w-xs text-sm text-ink-500">You can chat with them now. Their answer shows up in your Offers tab.</p>
          <div className="mt-5 flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Done</Button>
            <Button className="flex-1" onClick={() => { onClose(); navigate({ name: 'swap', swapId: sentId }); }}>
              <MessageCircle size={16} /> Open chat
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3">
            <ItemVisual garment={target.garment_type} color={target.color} imageUrl={target.image_url} className="h-16 w-16 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-400">You want</p>
              <p className="truncate text-sm font-semibold text-ink-900">{target.title}</p>
              <p className="text-xs text-ink-500">{target.size} · <bdi>@{target.owner?.username}</bdi></p>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">
              <Repeat2 size={13} /> Pick an item to offer
            </p>
            {loadingMine ? (
              <div className="skeleton h-24 w-full rounded-2xl" />
            ) : mine.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 p-5 text-center">
                <p className="text-sm text-ink-500">Your closet is empty. Upload something first to start swapping.</p>
              </div>
            ) : (
              <div className="no-scrollbar flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {mine.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-2.5 text-start transition ${selected === m.id ? 'border-ink-900 bg-ink-50' : 'border-ink-100 hover:border-ink-200'}`}
                  >
                    <ItemVisual garment={m.garment_type} color={m.color} imageUrl={m.image_url} className="h-12 w-12 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{m.title}</p>
                      <p className="text-xs text-ink-500">{m.size} · {conditionLabel(m.condition)}</p>
                    </div>
                    <div className={`grid h-5 w-5 place-items-center rounded-full border ${selected === m.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200'}`}>
                      {selected === m.id && <Check size={12} />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">How to swap</p>
            <div className="grid grid-cols-2 gap-2">
              {SWAP_METHODS.map((m) => {
                const can = allowed.includes(m.id);
                const on = method === m.id;
                return (
                  <button
                    key={m.id}
                    disabled={!can}
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-start rounded-2xl border p-2.5 text-start transition ${
                      on ? 'border-ink-900 bg-ink-50' : can ? 'border-ink-100 hover:border-ink-200' : 'border-ink-100 opacity-40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                      {m.id === 'shipping' ? <Truck size={15} /> : <Handshake size={15} />} {m.label}
                    </span>
                    <span className="mt-0.5 text-[11px] leading-snug text-ink-500">
                      {m.id === 'shipping' ? `Each side pays ₪${SHIPPING_FEE} shipping` : m.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">
              <MessageCircle size={13} /> Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Say hi or suggest how you'd swap…"
              className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
            />
          </div>

          {error && <div className="rounded-xl bg-accent-50 px-4 py-2.5 text-sm text-accent-700">{error}</div>}
          {selectedItem && (
            <div className="flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-xs text-sage-700">
              <Clock size={13} /> Offering your {selectedItem.title} for their {target.title}.
            </div>
          )}
          <Button size="lg" className="w-full" loading={sending} disabled={!selected} onClick={send}>Send swap request</Button>
        </div>
      )}
    </Sheet>
  );
}
