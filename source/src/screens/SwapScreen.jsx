// One swap: the two items, how it happens (meet / shipping), each side's steps, and a chat.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Repeat2, Send, Check, X, MapPin, Truck, Handshake, CreditCard, Package, Clock, PartyPopper, Copy, Lock,
} from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useInbox } from '../context/InboxContext.jsx';
import { fetchSwap, patchSwap, fetchMessages, sendMessage } from '../lib/api.js';
import { SWAP_METHODS, SHIPPING_FEE, methodsAllowed, conditionLabel, timeAgo } from '../lib/constants.js';
import { playSound } from '../lib/sounds.js';
import { Avatar, Button, ItemVisual } from '../components/ui.jsx';
import { ReportButton } from '../components/Moderation.jsx';

const POLL_MS = 3000;

export function SwapScreen({ swapId }) {
  const { back, navigate } = useRouter();
  const { user } = useAuth();
  const [swap, setSwap] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const lastCount = useRef(0);
  const { markRead } = useInbox();

  const load = useCallback(async () => {
    try {
      const s = await fetchSwap(swapId);
      setSwap(s);
      setMessages(await fetchMessages(swapId));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [swapId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // opening the conversation marks everything in it as read
  useEffect(() => {
    if (!swap) return;
    const latest = messages.length ? messages[messages.length - 1].created_at : swap.created_at;
    markRead(swap.id, latest);
  }, [swap, messages, markRead]);

  // chime when the other person writes
  useEffect(() => {
    const theirs = messages.filter((m) => m.sender_id !== user?.id).length;
    if (theirs > lastCount.current && lastCount.current !== 0) playSound('message');
    lastCount.current = theirs || lastCount.current;
  }, [messages, user]);

  const me = user?.id;
  const ownerId = swap?.requested_item?.owner_id;
  const mySide = swap && swap.requester_id === me ? 'requester' : 'owner';
  const theirSide = mySide === 'requester' ? 'owner' : 'requester';
  const partner = swap ? (mySide === 'requester' ? swap.requested_item?.owner : swap.requester) : null;
  const myItem = swap ? (mySide === 'requester' ? swap.offered_item : swap.requested_item) : null;
  const theirItem = swap ? (mySide === 'requester' ? swap.requested_item : swap.offered_item) : null;

  const update = async (key, patch) => {
    setBusy(key);
    setError(null);
    try {
      // finishing: both sides confirmed → the swap is complete
      const next = { ...swap, ...patch };
      if (next.requester_done && next.owner_done && swap.status !== 'completed') patch = { ...patch, status: 'completed' };
      await patchSwap(swap.id, patch);
      if (patch.status === 'completed') playSound('swap-accepted');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 px-5 pt-16">
        <div className="mx-auto max-w-md space-y-3">
          <div className="skeleton h-24 w-full rounded-3xl" />
          <div className="skeleton h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!swap) {
    return (
      <div className="min-h-screen bg-sand-50 px-5 pt-20 text-center">
        <p className="text-sm text-ink-500">{error || 'This swap could not be found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ name: 'offers' })}>Back to offers</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-sand-50/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-3 py-3">
          <button onClick={back} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink-700 shadow-sm">
            <ArrowLeft size={20} className="flip-rtl" />
          </button>
          {partner && (
            <button onClick={() => navigate({ name: 'profile', userId: partner.id })} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
              <Avatar name={partner.username} color={partner.avatar_color} size="sm" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-ink-900"><bdi>@{partner.username}</bdi></p>
                <p className="truncate text-[11px] text-ink-400">{partner.city || 'No location'}</p>
              </div>
            </button>
          )}
          <StatusPill status={swap.status} />
        </div>
      </header>

      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-4">
        <ItemsCard myItem={myItem} theirItem={theirItem} onOpen={(id) => navigate({ name: 'item', itemId: id })} />

        <MethodCard swap={swap} ownerPref={swap.requested_item?.owner?.swap_preference} busy={busy} onChange={(m) => update('method', { method: m })} />

        {swap.status === 'pending' && (
          <PendingCard
            isOwner={ownerId === me}
            partner={partner}
            busy={busy}
            onAccept={() => update('accept', { status: 'accepted' })}
            onDecline={() => update('decline', { status: 'declined' })}
          />
        )}

        {(swap.status === 'accepted' || swap.status === 'completed') &&
          (swap.method === 'shipping' ? (
            <ShippingSteps swap={swap} mySide={mySide} theirSide={theirSide} partner={partner} busy={busy} update={update} />
          ) : (
            <MeetSteps swap={swap} mySide={mySide} theirSide={theirSide} partner={partner} busy={busy} update={update} />
          ))}

        {swap.status === 'completed' && (
          <div className="flex items-center gap-3 rounded-3xl bg-sage-100 p-4 text-sage-700">
            <PartyPopper size={22} />
            <div>
              <p className="font-display text-base font-semibold">Swap complete!</p>
              <p className="text-xs">Enjoy your new piece. Thanks for swapping instead of buying.</p>
            </div>
          </div>
        )}

        {error && <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

        <Chat messages={messages} me={me} partner={partner} />
        <ReportButton targetType="swap" targetId={swap.id} label="Report this conversation" className="self-center" />
      </div>

      {swap.status !== 'declined' && <ChatInput swapId={swap.id} onSent={load} />}
    </div>
  );
}

// ---------- pieces ----------

function StatusPill({ status }) {
  const map = {
    pending: ['Pending', 'bg-sand-100 text-sand-700'],
    accepted: ['In progress', 'bg-ink-900 text-white'],
    declined: ['Declined', 'bg-ink-100 text-ink-500'],
    countered: ['Countered', 'bg-accent-100 text-accent-700'],
    completed: ['Completed', 'bg-sage-100 text-sage-700'],
  };
  const [label, cls] = map[status] ?? map.pending;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function ItemsCard({ myItem, theirItem, onOpen }) {
  const Side = ({ label, item }) => (
    <button onClick={() => item && onOpen(item.id)} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
      <ItemVisual garment={item?.garment_type} color={item?.color} imageUrl={item?.image_url} className="aspect-[4/5] w-full rounded-2xl" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</span>
      <span className="w-full truncate text-xs font-semibold text-ink-900">{item?.title}</span>
      <span className="text-[10px] text-ink-500">{item && `${item.size} · ${conditionLabel(item.condition)}`}</span>
    </button>
  );
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-card">
      <Side label="You give" item={myItem} />
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-white"><Repeat2 size={16} /></div>
      <Side label="You get" item={theirItem} />
    </div>
  );
}

function MethodCard({ swap, ownerPref, busy, onChange }) {
  const allowed = methodsAllowed(ownerPref);
  const locked = swap.requester_paid || swap.owner_paid || swap.requester_done || swap.owner_done || ['completed', 'declined'].includes(swap.status);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400">
        How the swap happens {locked && <Lock size={11} />}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SWAP_METHODS.map((m) => {
          const on = swap.method === m.id;
          const can = allowed.includes(m.id) && !locked;
          const Icon = m.id === 'shipping' ? Truck : Handshake;
          return (
            <button
              key={m.id}
              disabled={!can || on || busy === 'method'}
              onClick={() => onChange(m.id)}
              className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-start transition ${
                on ? 'border-ink-900 bg-ink-900 text-white' : can ? 'border-ink-200 text-ink-700 hover:border-ink-400' : 'border-ink-100 text-ink-300'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-semibold">{m.label}</span>
              <span className={`text-[11px] leading-snug ${on ? 'text-white/70' : 'text-ink-400'}`}>
                {m.id === 'shipping' ? `Each side pays ₪${SHIPPING_FEE}` : m.hint}
              </span>
            </button>
          );
        })}
      </div>
      {allowed.length === 1 && (
        <p className="mt-2 text-[11px] text-ink-400">The owner only swaps {allowed[0] === 'shipping' ? 'by post' : 'in person'}.</p>
      )}
    </div>
  );
}

function PendingCard({ isOwner, partner, busy, onAccept, onDecline }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      {isOwner ? (
        <>
          <p className="text-sm font-semibold text-ink-900"><bdi>@{partner?.username}</bdi> wants to swap with you</p>
          <p className="mt-0.5 text-xs text-ink-500">Chat below if you have questions, then decide.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" loading={busy === 'decline'} onClick={onDecline}><X size={15} /> Decline</Button>
            <Button className="flex-1" loading={busy === 'accept'} onClick={onAccept}><Check size={15} /> Accept</Button>
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-600"><Clock size={16} className="text-ink-400" /> Waiting for <bdi>@{partner?.username}</bdi> to accept.</p>
      )}
    </div>
  );
}

// A row in the step tracker
function Step({ n, done, active, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
            done ? 'bg-sage-500 text-white' : active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-400'
          }`}
        >
          {done ? <Check size={14} /> : n}
        </div>
        <div className="mt-1 w-px flex-1 bg-ink-100" />
      </div>
      <div className={`min-w-0 flex-1 pb-4 ${!done && !active ? 'opacity-50' : ''}`}>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        {children && <div className="mt-1.5">{children}</div>}
      </div>
    </div>
  );
}

function TheirStatus({ partner, ok, text, waiting }) {
  return (
    <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${ok ? 'text-sage-700' : 'text-ink-400'}`}>
      {ok ? <Check size={12} /> : <Clock size={12} />} <bdi>@{partner?.username}</bdi>: {ok ? text : waiting}
    </p>
  );
}

function MeetSteps({ swap, mySide, theirSide, partner, busy, update }) {
  const iDone = swap[mySide + '_done'];
  const theyDone = swap[theirSide + '_done'];
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400"><Handshake size={12} /> Meet-up steps</p>
      <Step n={1} done active title="Agree on a time and place">
        <p className="text-xs text-ink-500">Use the chat below. Pick a public place you both know.</p>
      </Step>
      <Step n={2} done={iDone && theyDone} active={!iDone || !theyDone} title="Swap the items">
        {iDone ? (
          <p className="flex items-center gap-1.5 text-xs text-sage-700"><Check size={13} /> You confirmed the swap</p>
        ) : (
          <Button size="sm" loading={busy === 'done'} onClick={() => update('done', { [mySide + '_done']: true })}>
            <Check size={14} /> We swapped – I got my item
          </Button>
        )}
        <TheirStatus partner={partner} ok={theyDone} text="confirmed" waiting="not confirmed yet" />
      </Step>
    </div>
  );
}

function ShippingSteps({ swap, mySide, theirSide, partner, busy, update }) {
  const myAddr = swap[mySide + '_address'];
  const theirAddr = swap[theirSide + '_address'];
  const iPaid = swap[mySide + '_paid'];
  const theyPaid = swap[theirSide + '_paid'];
  const myTracking = swap[mySide + '_tracking'];
  const theirTracking = swap[theirSide + '_tracking'];
  const iDone = swap[mySide + '_done'];
  const theyDone = swap[theirSide + '_done'];
  const bothPaid = iPaid && theyPaid;
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400"><Truck size={12} /> Shipping steps</p>

      <Step n={1} done={!!myAddr && !editing} active={!myAddr || editing} title="Your delivery address">
        {myAddr && !editing ? (
          <div className="flex items-start justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink-700">
            <AddressText a={myAddr} />
            {!iPaid && <button onClick={() => setEditing(true)} className="shrink-0 text-[11px] font-semibold text-ink-500 underline">Edit</button>}
          </div>
        ) : (
          <AddressForm
            initial={myAddr}
            saving={busy === 'address'}
            onSave={async (a) => { await update('address', { [mySide + '_address']: a }); setEditing(false); }}
          />
        )}
        <TheirStatus partner={partner} ok={!!theirAddr} text="address added" waiting="no address yet" />
      </Step>

      <Step n={2} done={bothPaid} active={!!myAddr && !bothPaid} title={`Pay your shipping · ₪${SHIPPING_FEE}`}>
        {iPaid ? (
          <p className="flex items-center gap-1.5 text-xs text-sage-700"><Check size={13} /> You paid ₪{SHIPPING_FEE}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-500">Each side pays to send their own item.</p>
            <Button size="sm" disabled={!myAddr} loading={busy === 'pay'} onClick={() => update('pay', { [mySide + '_paid']: true })}>
              <CreditCard size={14} /> Pay ₪{SHIPPING_FEE}
            </Button>
            <p className="mt-1.5 text-[10px] text-accent-600">Test mode: no money is charged yet. A payment service still needs to be connected.</p>
          </>
        )}
        <TheirStatus partner={partner} ok={theyPaid} text="paid" waiting="hasn't paid yet" />
      </Step>

      <Step n={3} done={!!myTracking} active={bothPaid && !myTracking} title="Send your item">
        {bothPaid ? (
          <>
            <p className="mb-1.5 text-xs text-ink-500">Ship <b>your</b> item to <bdi>@{partner?.username}</bdi>:</p>
            <div className="mb-2 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink-700"><AddressText a={theirAddr} copy /></div>
            {myTracking ? (
              <p className="flex items-center gap-1.5 text-xs text-sage-700"><Package size={13} /> Sent · tracking {myTracking}</p>
            ) : (
              <TrackingForm saving={busy === 'track'} onSave={(t) => update('track', { [mySide + '_tracking']: t })} />
            )}
          </>
        ) : (
          <p className="text-xs text-ink-500">The address to send to appears once you both paid.</p>
        )}
        <TheirStatus partner={partner} ok={!!theirTracking} text={`sent · tracking ${theirTracking}`} waiting="hasn't sent yet" />
      </Step>

      <Step n={4} done={iDone && theyDone} active={!!theirTracking && (!iDone || !theyDone)} title="Got your new item?">
        {iDone ? (
          <p className="flex items-center gap-1.5 text-xs text-sage-700"><Check size={13} /> You confirmed you received it</p>
        ) : (
          <Button size="sm" disabled={!theirTracking} loading={busy === 'done'} onClick={() => update('done', { [mySide + '_done']: true })}>
            <Check size={14} /> I received my item
          </Button>
        )}
        <TheirStatus partner={partner} ok={theyDone} text="received" waiting="hasn't confirmed yet" />
      </Step>
    </div>
  );
}

function AddressText({ a, copy }) {
  if (!a) return <span className="text-ink-400">—</span>;
  const text = `${a.name}\n${a.street}\n${a.city}\n${a.phone}`;
  return (
    <div className="flex w-full items-start justify-between gap-2">
      <div className="min-w-0 leading-relaxed">
        <p className="font-semibold text-ink-900">{a.name}</p>
        <p className="flex items-center gap-1"><MapPin size={11} className="shrink-0 text-ink-400" /> {a.street}, {a.city}</p>
        <p>{a.phone}</p>
      </div>
      {copy && (
        <button
          onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
          aria-label="Copy address"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink-500 ring-1 ring-ink-200"
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  );
}

function AddressForm({ initial, saving, onSave }) {
  const [a, setA] = useState(initial ?? { name: '', street: '', city: '', phone: '' });
  const ok = a.name.trim() && a.street.trim() && a.city.trim() && a.phone.trim();
  const field = (k, ph, type = 'text') => (
    <input
      id={`addr-${k}`}
      type={type}
      value={a[k]}
      placeholder={ph}
      onChange={(e) => setA({ ...a, [k]: e.target.value })}
      className="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none"
    />
  );
  return (
    <div className="flex flex-col gap-2">
      {field('name', 'Full name')}
      {field('street', 'Street and number')}
      <div className="grid grid-cols-2 gap-2">
        {field('city', 'City')}
        {field('phone', 'Phone', 'tel')}
      </div>
      <Button size="sm" disabled={!ok} loading={saving} onClick={() => onSave({ name: a.name.trim(), street: a.street.trim(), city: a.city.trim(), phone: a.phone.trim() })}>
        Save address
      </Button>
      <p className="text-[10px] text-ink-400">Only your swap partner sees it, and only after you both paid.</p>
    </div>
  );
}

function TrackingForm({ saving, onSave }) {
  const [t, setT] = useState('');
  return (
    <div className="flex gap-2">
      <input
        id="tracking"
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Tracking number"
        className="h-9 min-w-0 flex-1 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none"
      />
      <Button size="sm" disabled={!t.trim()} loading={saving} onClick={() => onSave(t.trim())}>
        <Package size={14} /> Sent
      </Button>
    </div>
  );
}

function Chat({ messages, me, partner }) {
  const endRef = useRef(null);
  const count = messages.length;
  useEffect(() => {
    if (count) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [count]);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400">Chat with <bdi>@{partner?.username}</bdi></p>
      {count === 0 ? (
        <p className="py-4 text-center text-xs text-ink-400">No messages yet. Say hi and agree on the details.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === me;
            const prev = messages[i - 1];
            const gap = !prev || prev.sender_id !== m.sender_id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} ${gap ? 'mt-1.5' : ''}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    mine ? 'rounded-br-md bg-ink-900 text-white' : 'rounded-bl-md bg-sand-100 text-ink-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[9px] ${mine ? 'text-white/50' : 'text-ink-400'}`}>{timeAgo(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function ChatInput({ swapId, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(swapId, body);
      setText('');
      await onSent();
    } finally {
      setSending(false);
    }
  };
  return (
    <form onSubmit={send} className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white/95 pb-safe backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2.5">
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          maxLength={2000}
          className="h-11 min-w-0 flex-1 rounded-full border border-ink-200 bg-sand-50 px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-900 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition active:scale-95 disabled:bg-ink-300"
        >
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}
