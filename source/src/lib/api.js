// All data access goes through here. Each function works with Supabase or the local demo store.
import { supabase, DEMO_MODE } from './backend.js';
import { demoStore } from './demoStore.js';

const ITEM_WITH_OWNER = '*, owner:profiles!items_owner_id_fkey(*)';

// ---------- Auth ----------
export async function authGetSession() {
  if (DEMO_MODE) return demoStore.getSession();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function authOnChange(cb) {
  if (DEMO_MODE) return demoStore.onAuthChange(cb);
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function authSignIn(email, password) {
  if (DEMO_MODE) return demoStore.signIn(email, password);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function authSignUp(email, password, username, city, avatarColor) {
  if (DEMO_MODE) return demoStore.signUp(email, password, username, city, avatarColor);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, avatar_color: avatarColor } },
  });
  if (error) return { error: error.message };
  const id = data.user?.id;
  if (id) {
    const { error: pErr } = await supabase.from('profiles').insert({ id, username, avatar_color: avatarColor, city: city || null });
    // 23505 = profile already exists (e.g. created by a trigger)
    if (pErr && pErr.code !== '23505') return { error: pErr.message };
  }
  return { error: null, needsConfirm: !data.session };
}

export async function authSignOut() {
  if (DEMO_MODE) return demoStore.signOut();
  await supabase.auth.signOut();
}

// ---------- Profiles ----------
export async function fetchProfile(id) {
  if (DEMO_MODE) return demoStore.getProfile(id);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateProfile(id, patch) {
  if (DEMO_MODE) return demoStore.updateProfile(id, patch);
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

// ---------- Items ----------
export async function fetchFeed(filters) {
  if (DEMO_MODE) return demoStore.feed(filters);
  let q = supabase.from('items').select(ITEM_WITH_OWNER).eq('status', 'available').order('created_at', { ascending: false });
  if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category);
  if (filters.size && filters.size !== 'all') q = q.eq('size', filters.size);
  if (filters.itemType && filters.itemType !== 'all') q = q.eq('item_type', filters.itemType);
  if (filters.kidsAge && filters.kidsAge !== 'all') q = q.eq('kids_age_group', filters.kidsAge);
  const { data, error } = await q.limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function fetchItem(id) {
  if (DEMO_MODE) return demoStore.item(id);
  const { data, error } = await supabase.from('items').select(ITEM_WITH_OWNER).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Everything in a closet except removed items
export async function fetchClosetItems(ownerId) {
  if (DEMO_MODE) return demoStore.itemsByOwner(ownerId, false);
  const { data, error } = await supabase.from('items').select('*').eq('owner_id', ownerId).neq('status', 'removed').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Only items that can still be offered in a swap
export async function fetchAvailableItems(ownerId) {
  if (DEMO_MODE) return demoStore.itemsByOwner(ownerId, true);
  const { data, error } = await supabase.from('items').select('*').eq('owner_id', ownerId).eq('status', 'available').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createItem(row) {
  if (DEMO_MODE) return demoStore.createItem(row);
  const { data, error } = await supabase.from('items').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

// ---------- Swap requests ----------
export async function createSwapRequest(row) {
  if (DEMO_MODE) return demoStore.createSwap(row);
  let { data, error } = await supabase.from('swap_requests').insert(row).select('*').single();
  // Database not updated yet (migration_002 not run): save the request without the new field
  if (error && /method/i.test(error.message || '')) {
    const { method, ...rest } = row;
    ({ data, error } = await supabase.from('swap_requests').insert(rest).select('*').single());
  }
  if (error) throw error;
  return data;
}

export async function updateSwapStatus(id, status) {
  if (DEMO_MODE) return demoStore.updateSwap(id, status);
  const { error } = await supabase.from('swap_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function fetchSwaps(userId) {
  if (DEMO_MODE) return demoStore.swaps(userId);
  const { data, error } = await supabase
    .from('swap_requests')
    .select(
      '*, requested_item:items!swap_requests_requested_item_id_fkey(' + ITEM_WITH_OWNER + '), ' +
        'offered_item:items!swap_requests_offered_item_id_fkey(*), ' +
        'requester:profiles!swap_requests_requester_id_fkey(*)'
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((s) => s.requester_id === userId || (s.requested_item && s.requested_item.owner_id === userId));
}

// ---------- One swap: logistics + chat ----------
const SWAP_SELECT =
  '*, requested_item:items!swap_requests_requested_item_id_fkey(' + ITEM_WITH_OWNER + '), ' +
  'offered_item:items!swap_requests_offered_item_id_fkey(*), ' +
  'requester:profiles!swap_requests_requester_id_fkey(*)';

export async function fetchSwap(id) {
  if (DEMO_MODE) return demoStore.swap(id);
  const { data, error } = await supabase.from('swap_requests').select(SWAP_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Save part of a swap: method, addresses, payment, tracking, "done" confirmations, status
export async function patchSwap(id, patch) {
  if (DEMO_MODE) return demoStore.patchSwap(id, patch);
  const { error } = await supabase.from('swap_requests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function fetchMessages(swapId) {
  if (DEMO_MODE) return demoStore.messages(swapId);
  const { data, error } = await supabase.from('swap_messages').select('*').eq('swap_id', swapId).order('created_at', { ascending: true });
  if (error) {
    if (/swap_messages/i.test(error.message || '')) throw new Error('Chat is not set up yet: run supabase/migration_002_chat_and_shipping.sql in Supabase.');
    throw error;
  }
  return data ?? [];
}

// Recent messages across several swaps, newest first (for the Messages list and unread counts).
// Returns [] when the chat table isn't set up yet.
export async function fetchMessagesFor(swapIds) {
  if (!swapIds.length) return [];
  if (DEMO_MODE) {
    const all = await Promise.all(swapIds.map((id) => demoStore.messages(id)));
    return all.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from('swap_messages')
    .select('*')
    .in('swap_id', swapIds)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    if (/swap_messages/i.test(error.message || '')) return [];
    throw error;
  }
  return data ?? [];
}

export async function sendMessage(swapId, body) {
  if (DEMO_MODE) return demoStore.sendMessage(swapId, body);
  const { data, error } = await supabase.from('swap_messages').insert({ swap_id: swapId, body }).select('*').single();
  if (error) throw error;
  return data;
}

// ---------- Reports (everyone) ----------
export const REPORT_REASONS = [
  { id: 'inappropriate', label: 'Inappropriate or offensive' },
  { id: 'misleading', label: 'Misleading photo or description' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'other', label: 'Something else' },
];

// target_type: 'item' | 'profile' | 'swap'
export async function reportContent({ target_type, target_id, reason, details }) {
  const row = { target_type, target_id, reason, details: details?.trim() || null };
  if (DEMO_MODE) return demoStore.report(row);
  const { error } = await supabase.from('reports').insert(row);
  if (error) {
    if (/reports/i.test(error.message || '')) throw new Error('Reporting is not set up yet: run supabase/migration_003_admin_and_reports.sql in Supabase.');
    throw error;
  }
}

// ---------- Moderation (admins only; the database enforces it too) ----------
export async function fetchReports() {
  if (DEMO_MODE) return demoStore.reports();
  const { data, error } = await supabase
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function resolveReport(id, status) {
  if (DEMO_MODE) return demoStore.resolveReport(id, status);
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('reports').update({ status, resolved_by: u?.user?.id, resolved_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// 'removed' hides an item everywhere; 'available' brings it back
export async function adminSetItemStatus(itemId, status) {
  if (DEMO_MODE) return demoStore.adminSetItemStatus(itemId, status);
  const { error } = await supabase.from('items').update({ status }).eq('id', itemId);
  if (error) throw error;
}

// Suspending also takes the user's listed items off the feed
export async function adminSetBanned(userId, banned) {
  if (DEMO_MODE) return demoStore.adminSetBanned(userId, banned);
  const { error } = await supabase.from('profiles').update({ banned }).eq('id', userId);
  if (error) throw error;
  if (banned) {
    const { error: e2 } = await supabase.from('items').update({ status: 'removed' }).eq('owner_id', userId).eq('status', 'available');
    if (e2) throw e2;
  }
}

export async function adminFetchMessages(swapId) {
  if (DEMO_MODE) return demoStore.adminMessages(swapId);
  const { data, error } = await supabase.from('swap_messages').select('*').eq('swap_id', swapId).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function adminDeleteMessage(id) {
  if (DEMO_MODE) return demoStore.adminDeleteMessage(id);
  const { error } = await supabase.from('swap_messages').delete().eq('id', id);
  if (error) throw error;
}
