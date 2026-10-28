// Admin: reports from users, with the actions to handle them.
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ShieldAlert, Flag, Package, User, MessageCircle, X, Check, EyeOff, Eye, Ban, Trash2 } from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  REPORT_REASONS, fetchReports, resolveReport, adminSetItemStatus, adminSetBanned, adminFetchMessages, adminDeleteMessage,
  fetchItem, fetchProfile, fetchSwap,
} from '../lib/api.js';
import { timeAgo } from '../lib/constants.js';
import { Avatar, Button, ItemVisual } from '../components/ui.jsx';
import { ConfirmButton } from '../components/Moderation.jsx';

const reasonLabel = (id) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

export function AdminScreen() {
  const { back } = useRouter();
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReports(await fetchReports());
    } catch (e) {
      setError(/reports/i.test(e.message || '') ? 'Admin tools are not set up yet: run supabase/migration_003_admin_and_reports.sql in Supabase.' : e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-sand-50 px-5 pt-20 text-center">
        <p className="text-sm text-ink-500">This page is for SwapStyle admins.</p>
        <Button variant="outline" className="mt-4" onClick={back}>Back</Button>
      </div>
    );
  }

  const open = reports.filter((r) => r.status === 'open');
  const handled = reports.filter((r) => r.status !== 'open');
  const list = tab === 'open' ? open : handled;

  return (
    <div className="min-h-screen bg-sand-50 pb-24">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-sand-50/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-3 py-3">
          <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-700 shadow-sm">
            <ArrowLeft size={20} className="flip-rtl" />
          </button>
          <div>
            <h1 className="flex items-center gap-1.5 font-display text-xl font-semibold text-ink-900"><ShieldAlert size={18} /> Admin</h1>
            <p className="text-xs text-ink-400">Reports from the community</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-md gap-1 px-5 pb-3">
          {[
            ['open', `Open · ${open.length}`],
            ['handled', `Handled · ${handled.length}`],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${tab === id ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 ring-1 ring-ink-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
        {error && <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}
        {loading ? (
          [0, 1].map((i) => <div key={i} className="skeleton h-40 w-full rounded-2xl" />)
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-card"><Flag size={22} className="text-ink-300" /></div>
            <p className="font-display text-lg font-semibold text-ink-900">{tab === 'open' ? 'All clear' : 'Nothing handled yet'}</p>
            <p className="mt-1 text-sm text-ink-500">{tab === 'open' ? 'No open reports right now.' : 'Reports you resolve or dismiss show up here.'}</p>
          </div>
        ) : (
          list.map((r) => <ReportCard key={r.id} report={r} onChanged={load} />)
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, onChanged }) {
  const { navigate } = useRouter();
  const [target, setTarget] = useState(undefined); // undefined = loading, null = gone
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const loadTarget = useCallback(async () => {
    try {
      if (report.target_type === 'item') setTarget(await fetchItem(report.target_id));
      if (report.target_type === 'profile') setTarget(await fetchProfile(report.target_id));
      if (report.target_type === 'swap') {
        setTarget(await fetchSwap(report.target_id));
        setMessages(await adminFetchMessages(report.target_id));
      }
    } catch (e) {
      setTarget(null);
      setError(e.message);
    }
  }, [report]);

  useEffect(() => {
    loadTarget();
  }, [loadTarget]);

  const act = async (fn) => {
    setError(null);
    try {
      await fn();
      await loadTarget();
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  };

  const Icon = { item: Package, profile: User, swap: MessageCircle }[report.target_type];
  const isOpen = report.status === 'open';

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="flex items-start justify-between gap-2 px-4 pt-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900"><Icon size={15} /> {reasonLabel(report.reason)}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">
            {report.target_type} · by <bdi>@{report.reporter?.username ?? 'someone'}</bdi> · {timeAgo(report.created_at)}
          </p>
        </div>
        {!isOpen && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${report.status === 'resolved' ? 'bg-sage-100 text-sage-700' : 'bg-ink-100 text-ink-500'}`}>
            {report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
          </span>
        )}
      </div>
      {report.details && <p className="mx-4 mt-2 rounded-xl bg-sand-50 px-3 py-2 text-xs italic text-ink-700">"{report.details}"</p>}

      <div className="px-4 py-3">
        {target === undefined ? (
          <div className="skeleton h-16 w-full rounded-xl" />
        ) : target === null ? (
          <p className="text-xs text-ink-400">{{ item: 'This item no longer exists.', profile: 'This profile no longer exists.', swap: 'This conversation no longer exists.' }[report.target_type]}</p>
        ) : report.target_type === 'item' ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => navigate({ name: 'item', itemId: target.id })} className="flex items-center gap-3 text-start">
              <ItemVisual garment={target.garment_type} color={target.color} imageUrl={target.image_url} className="h-16 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{target.title}</p>
                <p className="text-xs text-ink-500"><bdi>@{target.owner?.username}</bdi> · {target.status === 'removed' ? 'Removed' : target.status}</p>
              </div>
            </button>
            <div className="flex flex-wrap gap-2">
              {target.status === 'removed' ? (
                <Button size="sm" variant="outline" onClick={() => act(() => adminSetItemStatus(target.id, 'available'))}><Eye size={14} /> Restore item</Button>
              ) : (
                <ConfirmButton onConfirm={() => act(() => adminSetItemStatus(target.id, 'removed'))}><EyeOff size={14} /> Remove item</ConfirmButton>
              )}
              {target.owner && !target.owner.banned && (
                <ConfirmButton onConfirm={() => act(() => adminSetBanned(target.owner.id, true))}><Ban size={14} /> Suspend <bdi>@{target.owner.username}</bdi></ConfirmButton>
              )}
            </div>
          </div>
        ) : report.target_type === 'profile' ? (
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => navigate({ name: 'profile', userId: target.id })} className="flex min-w-0 items-center gap-2">
              <Avatar name={target.username} color={target.avatar_color} size="sm" />
              <span className="truncate text-sm font-semibold text-ink-900"><bdi>@{target.username}</bdi></span>
              {target.banned && <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold text-accent-700">Suspended</span>}
            </button>
            {target.banned ? (
              <Button size="sm" variant="outline" onClick={() => act(() => adminSetBanned(target.id, false))}>Lift suspension</Button>
            ) : (
              <ConfirmButton onConfirm={() => act(() => adminSetBanned(target.id, true))}><Ban size={14} /> Suspend</ConfirmButton>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-ink-500">
              <bdi>@{target.requester?.username}</bdi> ↔ <bdi>@{target.requested_item?.owner?.username}</bdi> · {messages.length} messages
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl bg-sand-50 p-2">
              {messages.length === 0 && <p className="p-2 text-xs text-ink-400">No messages.</p>}
              {messages.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 border-b border-ink-100 py-1.5 last:border-0">
                  <p className="min-w-0 break-words text-xs text-ink-700">
                    <b><bdi>@{m.sender_id === target.requester_id ? target.requester?.username : target.requested_item?.owner?.username}</bdi>:</b> {m.body}
                  </p>
                  <button onClick={() => act(() => adminDeleteMessage(m.id))} aria-label="Delete message" className="shrink-0 text-ink-300 hover:text-accent-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[target.requester, target.requested_item?.owner].filter(Boolean).map((p) =>
                p.banned ? null : (
                  <ConfirmButton key={p.id} onConfirm={() => act(() => adminSetBanned(p.id, true))}><Ban size={14} /> Suspend <bdi>@{p.username}</bdi></ConfirmButton>
                )
              )}
            </div>
          </div>
        )}
        {error && <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">{error}</p>}
      </div>

      {isOpen ? (
        <div className="flex border-t border-ink-100">
          <button onClick={() => act(() => resolveReport(report.id, 'dismissed'))} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-ink-500 hover:bg-ink-50">
            <X size={14} /> Dismiss
          </button>
          <button onClick={() => act(() => resolveReport(report.id, 'resolved'))} className="flex flex-1 items-center justify-center gap-1.5 border-l border-ink-100 py-2.5 text-xs font-semibold text-sage-700 hover:bg-sage-50">
            <Check size={14} /> Mark resolved
          </button>
        </div>
      ) : (
        <button onClick={() => act(() => resolveReport(report.id, 'open'))} className="w-full border-t border-ink-100 py-2.5 text-xs font-semibold text-ink-500 hover:bg-ink-50">
          Reopen
        </button>
      )}
    </div>
  );
}
