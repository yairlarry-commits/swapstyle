import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Package, PenLine, Grid2x2, Sparkles, X, Check, LogOut, ShieldAlert, Ban } from 'lucide-react';
import { useRouter, useBackToClose } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchProfile, fetchClosetItems, updateProfile, adminSetBanned } from '../lib/api.js';
import { SWAP_PREFERENCES, conditionLabel, swapPrefLabel } from '../lib/constants.js';
import { Avatar, Button, ItemVisual, LanguageToggle } from '../components/ui.jsx';
import { AdminBox, ConfirmButton, ReportButton } from '../components/Moderation.jsx';

export function ProfileScreen({ userId }) {
  const { navigate, back } = useRouter();
  const { user, refreshProfile, signOut, profile: me } = useAuth();
  const profileId = userId ?? user?.id;
  const isMe = !userId || userId === user?.id;

  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', city: '', swap_preference: 'either' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const [p, its] = await Promise.all([fetchProfile(profileId), fetchClosetItems(profileId)]);
      setProfile(p);
      setItems(its);
      if (p) setForm({ username: p.username, city: p.city ?? '', swap_preference: p.swap_preference });
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        username: form.username.trim() || profile.username,
        city: form.city.trim() || null,
        swap_preference: form.swap_preference,
      });
      await refreshProfile();
      await load();
      setEditing(false);
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const available = items.filter((i) => i.status === 'available');
  const swapped = items.filter((i) => i.status === 'swapped');

  return (
    <div className="min-h-screen bg-sand-50 pb-24">
      {!isMe && (
        <div className="sticky top-0 z-20 bg-sand-50/90 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center px-3 py-3">
            <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-700 shadow-sm">
              <ArrowLeft size={20} className="flip-rtl" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md px-5 pt-4">
        {loading || !profile ? (
          <div className="space-y-4">
            <div className="skeleton h-24 w-full rounded-3xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[4/5] rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-card">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sand-100 opacity-60" />
              <div className="relative flex items-start gap-4">
                <Avatar name={profile.username} color={profile.avatar_color} size="xl" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-2xl font-bold text-ink-900"><bdi>@{profile.username}</bdi></h1>
                  {profile.full_name && <p className="text-sm text-ink-500">{profile.full_name}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-600">
                    {profile.city && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1"><MapPin size={12} /> {profile.city}</span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1"><Package size={12} /> {swapPrefLabel(profile.swap_preference)}</span>
                    {profile.banned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 font-semibold text-accent-700"><Ban size={12} /> Suspended</span>
                    )}
                    {profile.is_admin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 font-semibold text-white"><ShieldAlert size={12} /> Admin</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-sand-50 p-3">
                <Stat label="Available" value={available.length} />
                <Stat label="Swapped" value={swapped.length} />
                <Stat label="Total" value={items.length} />
              </div>
              {isMe && (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                    <PenLine size={15} /> Edit profile
                  </Button>
                  <Button variant="ghost" onClick={signOut} aria-label="Sign out">
                    <LogOut size={15} />
                  </Button>
                </div>
              )}
              {isMe && (
                <div className="mt-3 flex justify-center">
                  <LanguageToggle />
                </div>
              )}
              {isMe && me?.is_admin && (
                <Button className="mt-2 w-full" onClick={() => navigate({ name: 'admin' })}>
                  <ShieldAlert size={15} /> Admin · reports
                </Button>
              )}
              {isMe && me?.banned && (
                <p className="mt-3 rounded-xl bg-accent-50 px-3 py-2 text-xs text-accent-700">
                  Your account is suspended, so you can't post items, request swaps or send messages.
                </p>
              )}
              {!isMe && (
                <div className="mt-4 flex flex-col gap-3">
                  {me?.is_admin && (
                    <AdminBox>
                      {profile.banned ? (
                        <Button size="sm" variant="outline" onClick={async () => { await adminSetBanned(profile.id, false); await load(); }}>Lift suspension</Button>
                      ) : (
                        <ConfirmButton onConfirm={async () => { await adminSetBanned(profile.id, true); await load(); }}>
                          <Ban size={14} /> Suspend <bdi>@{profile.username}</bdi>
                        </ConfirmButton>
                      )}
                    </AdminBox>
                  )}
                  <ReportButton targetType="profile" targetId={profile.id} label={`Report @${profile.username}`} className="self-center" />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-ink-900"><Grid2x2 size={17} /> Closet</h2>
              <span className="text-xs text-ink-400">{items.length} items</span>
            </div>

            {items.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
                <Sparkles size={24} className="text-ink-300" />
                <p className="mt-2 font-medium text-ink-900">{isMe ? 'Your closet is empty' : 'No items yet'}</p>
                <p className="mt-1 max-w-[220px] text-xs text-ink-500">{isMe ? 'Upload your first piece to start swapping.' : 'Check back soon for new drops.'}</p>
                {isMe && <Button className="mt-4" onClick={() => navigate({ name: 'upload' })}>Upload an item</Button>}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {items.map((it) => (
                  <ClosetCard key={it.id} item={it} onClick={() => navigate({ name: 'item', itemId: it.id })} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editing && <EditProfileSheet form={form} setForm={setForm} onSave={save} onCancel={() => setEditing(false)} saving={saving} />}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-xl font-bold text-ink-900">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-ink-400">{label}</span>
    </div>
  );
}

function ClosetCard({ item, onClick }) {
  return (
    <button onClick={onClick} className="group overflow-hidden rounded-2xl bg-white text-start shadow-card transition active:scale-[0.98]">
      <div className="relative aspect-[4/5] w-full">
        <ItemVisual garment={item.garment_type} color={item.color} imageUrl={item.image_url} className="h-full w-full" />
        <div className="absolute left-2 top-2 flex gap-1">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-ink-900">{item.size}</span>
        </div>
        {item.status === 'swapped' && (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-900">Swapped</span>
          </div>
        )}
        {item.item_type === 'bundle' && (
          <span className="absolute right-2 top-2 rounded-full bg-sand-500 px-2 py-0.5 text-[10px] font-semibold text-white">Bundle</span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-semibold text-ink-900">{item.title}</p>
        <p className="text-[10px] text-ink-400">{conditionLabel(item.condition)}</p>
      </div>
    </button>
  );
}

function EditProfileSheet({ form, setForm, onSave, onCancel, saving }) {
  useBackToClose(true, onCancel);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-float animate-slide-up sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Edit profile</h2>
          <button onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">Username</span>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">City</span>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Tel Aviv" className="h-11 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none" />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-500">Swap preference</span>
            <div className="grid gap-1.5">
              {SWAP_PREFERENCES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm({ ...form, swap_preference: p.id })}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${form.swap_preference === p.id ? 'border-ink-900 bg-ink-50 text-ink-900' : 'border-ink-200 text-ink-600'}`}
                >
                  {p.label}
                  {form.swap_preference === p.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          <Button className="mt-2 w-full" loading={saving} onClick={onSave}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
