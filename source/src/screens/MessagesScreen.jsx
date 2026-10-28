// All conversations in one place: one per swap, newest activity first, unread marked.
import { MessageCircle, Repeat2 } from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useInbox } from '../context/InboxContext.jsx';
import { timeAgo } from '../lib/constants.js';
import { AppHeader, Avatar, Button, ItemVisual } from '../components/ui.jsx';

export function MessagesScreen() {
  const { navigate } = useRouter();
  const { threads, unreadTotal, loading, error } = useInbox();

  return (
    <div className="min-h-screen bg-sand-50 pb-24">
      <AppHeader title="Messages" subtitle={unreadTotal ? `${unreadTotal} unread` : 'Your conversations'} />

      <div className="mx-auto max-w-md px-4 py-3">
        {error && <div className="mb-3 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[76px] w-full rounded-2xl" />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-card">
              <MessageCircle size={26} className="text-ink-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900">No conversations yet</h3>
            <p className="mt-1 max-w-xs text-sm text-ink-500">When you offer a swap or someone asks for one of your items, you can chat here.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate({ name: 'feed' })}>Browse the feed</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {threads.map((t) => (
              <ThreadRow key={t.swap.id} thread={t} onOpen={() => navigate({ name: 'swap', swapId: t.swap.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadRow({ thread, onOpen }) {
  const { swap, partner, preview, lastFromMe, lastAt, unread, incoming } = thread;
  const theirItem = incoming ? swap.offered_item : swap.requested_item;
  const isNew = unread > 0;

  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start shadow-card transition active:scale-[0.99] ${isNew ? 'bg-white ring-1 ring-gold-400/60' : 'bg-white/80'}`}
    >
      <div className="relative shrink-0">
        <Avatar name={partner?.username ?? '?'} color={partner?.avatar_color} size="md" />
        {theirItem && (
          <ItemVisual
            garment={theirItem.garment_type}
            color={theirItem.color}
            imageUrl={theirItem.image_url}
            className="absolute -bottom-1 -end-1 h-6 w-6 rounded-md ring-2 ring-white"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${isNew ? 'font-bold text-ink-900' : 'font-semibold text-ink-800'}`}>
            <bdi>@{partner?.username ?? 'someone'}</bdi>
          </p>
          <span className={`shrink-0 text-[10px] ${isNew ? 'font-semibold text-gold-600' : 'text-ink-400'}`}>{lastAt ? timeAgo(lastAt) : ''}</span>
        </div>
        <p className="flex items-center gap-1 truncate text-[11px] text-ink-400">
          <Repeat2 size={11} className="shrink-0" />
          <span className="truncate">{swap.requested_item?.title ?? ''}</span>
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${isNew ? 'font-medium text-ink-900' : 'text-ink-500'}`}>
            {preview ? (
              <>
                {lastFromMe && <span className="text-ink-400">You: </span>}
                {preview}
              </>
            ) : incoming ? (
              'New swap request'
            ) : (
              'Request sent'
            )}
          </p>
          {isNew && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
