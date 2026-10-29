import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, X, Home, Gift } from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchFeed } from '../lib/api.js';
import { CATEGORIES, SIZES, KIDS_AGES, ITEM_TYPES, conditionLabel, timeAgo, isGiveaway } from '../lib/constants.js';
import { AppHeader, Avatar, Chip, ItemVisual } from '../components/ui.jsx';

export function FeedScreen() {
  const { navigate } = useRouter();
  const suspended = useAuth().profile?.banned;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ category: 'all', size: 'all', itemType: 'all', kidsAge: 'all', listing: 'all' });
  const [showMore, setShowMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchFeed(filters));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const isKids = filters.category === 'kids';
  const sizeOptions = isKids ? KIDS_AGES.map((a) => a.id) : SIZES;
  const isAcc = filters.category === 'accessories';
  const extraActive = filters.size !== 'all' || filters.itemType !== 'all' || filters.listing !== 'all';

  return (
    <div className="min-h-screen bg-sand-50 pb-24">
      <AppHeader title="SwapStyle" subtitle="Swap and refresh your style.">
          <div className="flex items-center gap-1.5">
            <Chip fit label="All" active={filters.category === 'all'} onClick={() => setFilters((f) => ({ ...f, category: 'all', kidsAge: 'all' }))} />
            {CATEGORIES.map((c) => (
              <Chip fit key={c.id} label={c.label} active={filters.category === c.id} onClick={() => setFilters((f) => ({ ...f, category: c.id, kidsAge: 'all', size: 'all' }))} />
            ))}
            <button
              onClick={() => setShowMore((v) => !v)}
              aria-label="More filters"
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${
                showMore || extraActive ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 text-ink-600'
              }`}
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {showMore && (
            <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-card animate-scale-in">
              <FilterRow label="Closet">
                <Chip label="Any" small active={filters.listing === 'all'} onClick={() => setFilters((f) => ({ ...f, listing: 'all' }))} />
                <Chip label="To swap" small active={filters.listing === 'swap'} onClick={() => setFilters((f) => ({ ...f, listing: 'swap' }))} />
                <Chip label="Giveaway" small active={filters.listing === 'give'} onClick={() => setFilters((f) => ({ ...f, listing: 'give' }))} />
              </FilterRow>
              <FilterRow label="Type">
                <Chip label="Any" small active={filters.itemType === 'all'} onClick={() => setFilters((f) => ({ ...f, itemType: 'all' }))} />
                {ITEM_TYPES.map((t) => (
                  <Chip key={t.id} label={t.label} small active={filters.itemType === t.id} onClick={() => setFilters((f) => ({ ...f, itemType: t.id }))} />
                ))}
              </FilterRow>
              {!isAcc && <FilterRow label="Size">
                <Chip label="Any" small active={filters.size === 'all'} onClick={() => setFilters((f) => ({ ...f, size: 'all' }))} />
                {sizeOptions.map((s) => (
                  <Chip
                    key={s}
                    label={isKids ? KIDS_AGES.find((a) => a.id === s)?.label ?? s : s}
                    small
                    active={filters.size === s}
                    onClick={() => setFilters((f) => ({ ...f, size: s }))}
                  />
                ))}
              </FilterRow>}
              {extraActive && (
                <button onClick={() => setFilters((f) => ({ ...f, size: 'all', itemType: 'all', listing: 'all' }))} className="flex items-center justify-center gap-1 text-xs font-medium text-ink-500">
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>
          )}
      </AppHeader>
      {suspended && (
        <div className="mx-auto max-w-md px-4 pt-3">
          <p className="rounded-xl bg-accent-50 px-4 py-2.5 text-xs text-accent-700">Your account is suspended. You can browse, but not post or swap.</p>
        </div>
      )}

      <div className="mx-auto max-w-md px-4 py-4">
        {error && <div className="mb-4 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">Couldn't load feed. {error}</div>}
        {loading ? (
          <div className="flex flex-col gap-5">
            {[0, 1, 2].map((i) => <FeedCardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <FeedEmpty />
        ) : (
          <div className="flex flex-col gap-5">
            {items.map((it) => (
              <FeedCard key={it.id} item={it} onOpen={() => navigate({ name: 'item', itemId: it.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedCard({ item, onOpen }) {
  const { navigate } = useRouter();
  const owner = item.owner;
  const isBundle = item.item_type === 'bundle';
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-card animate-fade-in">
      <div className="relative aspect-[4/5] w-full" onClick={onOpen}>
        <ItemVisual garment={item.garment_type} color={item.color} imageUrl={item.image_url} className="h-full w-full" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink-900 shadow-sm backdrop-blur">{item.size}</span>
          <span className="rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{conditionLabel(item.condition)}</span>
        </div>
        {isGiveaway(item) && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-sage-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"><Gift size={12} /> Giveaway</span>
        )}
        {isBundle && (
          <span className="absolute right-3 top-3 rounded-full bg-sand-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">Bundle · {item.bundle_count}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="absolute bottom-3 right-3 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white shadow-float transition active:scale-95"
        >
          {isGiveaway(item) ? 'I want it' : 'Request Swap'}
        </button>
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink-900">{item.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{item.description || `${conditionLabel(item.condition)} · ${item.size}`}</p>
        </div>
        {owner && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate({ name: 'profile', userId: owner.id }); }}
            className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-ink-50"
          >
            <Avatar name={owner.username} color={owner.avatar_color} size="sm" />
            <div className="flex flex-col text-start leading-tight">
              <span className="text-[11px] font-semibold text-ink-900"><bdi>@{owner.username}</bdi></span>
              <span className="text-[10px] text-ink-400">{owner.city || 'No location'} · {timeAgo(item.created_at)}</span>
            </div>
          </button>
        )}
      </div>
    </article>
  );
}

function FilterRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-400">{label}</span>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">{children}</div>
    </div>
  );
}

function FeedCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-28 rounded" />
        </div>
        <div className="skeleton h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

function FeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-card">
        <Home size={26} className="text-ink-400" />
      </div>
      <h3 className="font-display text-lg font-semibold text-ink-900">No items yet</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-500">Try a different filter, or be the first to upload a piece to the swap.</p>
    </div>
  );
}
