// Local demo backend: same shape as the Supabase data, stored in localStorage.
// Used automatically when no Supabase keys are configured.

const DEMO_KEY = 'swapstyle-demo-db-v1';

function demoUid() {
  return (crypto.randomUUID && crypto.randomUUID()) || 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Starts empty: no sample profiles or items, only the accounts people create themselves
function demoSeed() {
  return { profiles: [], items: [], swap_requests: [], swap_messages: [], reports: [], users: [], session: null };
}

// Sample profiles that earlier versions added (maya_tlv, noam.k, dana_swaps): removed with everything they touched
const OLD_SAMPLE_IDS = ['u-maya', 'u-noam', 'u-dana'];
function removeSamples(db) {
  const gone = new Set(OLD_SAMPLE_IDS);
  if (!db.profiles?.some((p) => gone.has(p.id))) return false;
  const goneItems = new Set((db.items || []).filter((i) => gone.has(i.owner_id)).map((i) => i.id));
  db.profiles = db.profiles.filter((p) => !gone.has(p.id));
  db.items = (db.items || []).filter((i) => !goneItems.has(i.id));
  const goneSwaps = new Set(
    (db.swap_requests || [])
      .filter((r) => gone.has(r.requester_id) || goneItems.has(r.requested_item_id) || goneItems.has(r.offered_item_id))
      .map((r) => r.id)
  );
  db.swap_requests = (db.swap_requests || []).filter((r) => !goneSwaps.has(r.id));
  db.swap_messages = (db.swap_messages || []).filter((m) => !goneSwaps.has(m.swap_id));
  // items that had been swapped with a sample user become available again
  const stillSwapped = new Set(db.swap_requests.filter((r) => r.status === 'accepted' || r.status === 'completed').flatMap((r) => [r.requested_item_id, r.offered_item_id]));
  db.items.forEach((i) => { if (i.status === 'swapped' && !stillSwapped.has(i.id)) i.status = 'available'; });
  return true;
}

function demoLoad() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (removeSamples(db)) demoSave(db);
      return db;
    }
  } catch {}
  const db = demoSeed();
  demoSave(db);
  return db;
}

let demoStorageOk = true;
function demoSave(db) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db));
    demoStorageOk = true;
  } catch {
    demoStorageOk = false; // e.g. storage blocked: data lives only until the page reloads
  }
  demoMemory = db;
}

let demoMemory = null;
const DEMO_ADMINS = ['yaya'];
const demoMe = (db) => db.profiles.find((p) => p.id === db.session?.user.id);
const demoNotBanned = (db) => { if (demoMe(db)?.banned) throw new Error('Your account is suspended.'); };
const demoAdminOnly = (db) => { if (!demoMe(db)?.is_admin) throw new Error('Only admins can do that.'); };
function demoDb() {
  if (!demoMemory) demoMemory = demoLoad();
  if (!demoMemory.swap_messages) demoMemory.swap_messages = [];
  if (!demoMemory.reports) demoMemory.reports = [];
  // demo: the YAYA account is the admin (on the real site this is the is_admin column)
  demoMemory.profiles.forEach((p) => { p.is_admin = DEMO_ADMINS.includes((p.username || '').toLowerCase()); p.banned = !!p.banned; });
  return demoMemory;
}

const demoListeners = new Set();
function demoEmit(session) {
  demoListeners.forEach((cb) => cb(session));
}

const demoDelay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const demoProfile = (db, id) => db.profiles.find((p) => p.id === id) ?? null;
const demoWithOwner = (db, it) => ({ ...it, owner: demoProfile(db, it.owner_id) });

export const demoStore = {
  async getSession() {
    return demoDb().session;
  },
  onAuthChange(cb) {
    demoListeners.add(cb);
    return () => demoListeners.delete(cb);
  },
  // One tap into the demo, no form: reuses the same guest account every time
  async guestLogin() {
    await demoDelay(150);
    const db = demoDb();
    let u = db.users.find((x) => x.email === 'guest@swapstyle.demo');
    if (!u) {
      u = { id: 'guest-' + demoUid(), email: 'guest@swapstyle.demo', password: '' };
      db.users.push(u);
      db.profiles.push({ id: u.id, username: 'guest', full_name: null, city: 'Tel Aviv', avatar_color: 'violet', swap_preference: 'either', created_at: new Date().toISOString() });
    }
    db.session = { user: { id: u.id, email: u.email } };
    demoSave(db);
    demoEmit(db.session);
    return { error: null };
  },
  storageWorks() {
    return demoStorageOk;
  },
  hasAccounts() {
    return demoDb().users.length > 0;
  },
  async signIn(email, password) {
    await demoDelay();
    const db = demoDb();
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) return { error: 'Invalid login credentials' };
    db.session = { user: { id: u.id, email: u.email } };
    demoSave(db);
    demoEmit(db.session);
    return { error: null };
  },
  async signUp(email, password, username, city, avatarColor) {
    await demoDelay();
    const db = demoDb();
    if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return { error: 'User already registered' };
    const id = demoUid();
    db.users.push({ id, email, password });
    db.profiles.push({ id, username, full_name: null, city: city || null, avatar_color: avatarColor, swap_preference: 'either', created_at: new Date().toISOString() });
    db.session = { user: { id, email } };
    demoSave(db);
    demoEmit(db.session);
    return { error: null };
  },
  async signOut() {
    const db = demoDb();
    db.session = null;
    demoSave(db);
    demoEmit(null);
  },
  async getProfile(id) {
    return demoProfile(demoDb(), id);
  },
  async updateProfile(id, patch) {
    await demoDelay();
    const db = demoDb();
    const p = demoProfile(db, id);
    const { is_admin, banned, ...safe } = patch; // flags only via admin actions
    if (p) Object.assign(p, safe);
    if (p) p.is_admin = DEMO_ADMINS.includes((p.username || '').toLowerCase());
    demoSave(db);
  },
  async feed(f) {
    await demoDelay();
    const db = demoDb();
    return db.items
      .filter((i) => i.status === 'available')
      .filter((i) => !f.category || f.category === 'all' || i.category === f.category)
      .filter((i) => !f.size || f.size === 'all' || i.size === f.size)
      .filter((i) => !f.itemType || f.itemType === 'all' || i.item_type === f.itemType)
      .filter((i) => !f.kidsAge || f.kidsAge === 'all' || i.kids_age_group === f.kidsAge)
      .filter((i) => !f.listing || f.listing === 'all' || (i.listing || 'swap') === f.listing)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 60)
      .map((i) => demoWithOwner(db, i));
  },
  async item(id) {
    await demoDelay(150);
    const db = demoDb();
    const it = db.items.find((i) => i.id === id);
    return it ? demoWithOwner(db, it) : null;
  },
  async itemsByOwner(ownerId, onlyAvailable) {
    await demoDelay(150);
    return demoDb()
      .items.filter((i) => i.owner_id === ownerId && (onlyAvailable ? i.status === 'available' : i.status !== 'removed'))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async createItem(row) {
    await demoDelay();
    const db = demoDb();
    demoNotBanned(db);
    const it = { id: demoUid(), owner_id: db.session?.user.id, status: 'available', created_at: new Date().toISOString(), ...row };
    db.items.push(it);
    demoSave(db);
    return it;
  },
  async createSwap(row) {
    await demoDelay();
    const db = demoDb();
    demoNotBanned(db);
    const now = new Date().toISOString();
    const s = { id: demoUid(), requester_id: db.session?.user.id, status: 'pending', message: null, created_at: now, updated_at: now, ...row };
    db.swap_requests.push(s);
    demoSave(db);
    demoPartner(s.id, 'requested');
    return s;
  },
  async updateSwap(id, status) {
    await demoDelay();
    const db = demoDb();
    const s = db.swap_requests.find((x) => x.id === id);
    if (s) {
      s.status = status;
      s.updated_at = new Date().toISOString();
      if (status === 'accepted') {
        db.items.forEach((i) => {
          if (i.id === s.requested_item_id || i.id === s.offered_item_id) i.status = 'swapped';
        });
      }
    }
    demoSave(db);
  },
  async patchSwap(id, patch) {
    await demoDelay(150);
    const db = demoDb();
    const s = db.swap_requests.find((x) => x.id === id);
    if (!s) return;
    Object.assign(s, patch, { updated_at: new Date().toISOString() });
    demoSave(db);
    demoPartner(id, 'patched', patch);
  },
  async swap(id) {
    await demoDelay(120);
    const db = demoDb();
    const s = db.swap_requests.find((x) => x.id === id);
    if (!s) return null;
    const byId = (iid) => {
      const it = db.items.find((i) => i.id === iid);
      return it ? demoWithOwner(db, it) : null;
    };
    return { ...s, requested_item: byId(s.requested_item_id), offered_item: byId(s.offered_item_id), requester: demoProfile(db, s.requester_id) };
  },
  async messages(swapId) {
    return demoDb().swap_messages.filter((m) => m.swap_id === swapId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async sendMessage(swapId, body) {
    await demoDelay(100);
    const db = demoDb();
    demoNotBanned(db);
    const m = { id: demoUid(), swap_id: swapId, sender_id: db.session?.user.id, body, created_at: new Date().toISOString() };
    db.swap_messages.push(m);
    demoSave(db);
    demoPartner(swapId, 'message');
    return m;
  },
  // ---------- reports & moderation ----------
  async report(row) {
    await demoDelay(150);
    const db = demoDb();
    const r = { id: demoUid(), reporter_id: db.session?.user.id, status: 'open', created_at: new Date().toISOString(), details: null, ...row };
    db.reports.push(r);
    demoSave(db);
    return r;
  },
  async reports() {
    await demoDelay(150);
    const db = demoDb();
    demoAdminOnly(db);
    return db.reports
      .map((r) => ({ ...r, reporter: demoProfile(db, r.reporter_id) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async resolveReport(id, status) {
    await demoDelay(120);
    const db = demoDb();
    demoAdminOnly(db);
    const r = db.reports.find((x) => x.id === id);
    if (r) Object.assign(r, { status, resolved_by: db.session.user.id, resolved_at: new Date().toISOString() });
    demoSave(db);
  },
  async adminSetItemStatus(itemId, status) {
    await demoDelay(120);
    const db = demoDb();
    demoAdminOnly(db);
    const it = db.items.find((i) => i.id === itemId);
    if (it) it.status = status;
    demoSave(db);
  },
  async adminSetBanned(userId, banned) {
    await demoDelay(120);
    const db = demoDb();
    demoAdminOnly(db);
    const p = demoProfile(db, userId);
    if (p) p.banned = banned;
    if (banned) db.items.forEach((i) => { if (i.owner_id === userId && i.status === 'available') i.status = 'removed'; });
    demoSave(db);
  },
  async adminMessages(swapId) {
    const db = demoDb();
    demoAdminOnly(db);
    return db.swap_messages.filter((m) => m.swap_id === swapId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async adminDeleteMessage(id) {
    const db = demoDb();
    demoAdminOnly(db);
    db.swap_messages = db.swap_messages.filter((m) => m.id !== id);
    demoSave(db);
  },
  async swaps(userId) {
    await demoDelay();
    const db = demoDb();
    const byId = (id) => {
      const it = db.items.find((i) => i.id === id);
      return it ? demoWithOwner(db, it) : null;
    };
    return db.swap_requests
      .map((s) => ({ ...s, requested_item: byId(s.requested_item_id), offered_item: byId(s.offered_item_id), requester: demoProfile(db, s.requester_id) }))
      .filter((s) => s.requester_id === userId || (s.requested_item && s.requested_item.owner_id === userId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};

// ---------- Demo partner ----------
// In demo mode the sample users (maya_tlv, noam.k, dana_swaps) answer by themselves,
// so you can try the whole swap: accept, chat, address, shipping payment, tracking, done.
const DEMO_REPLIES = [
  'Hi! Happy to swap. Does that work for you?',
  'Sounds good to me.',
  'Great, talk soon!',
  'Perfect, thanks!',
];
function demoPartner(swapId, event, patch = {}) {
  const db = demoDb();
  const s = db.swap_requests.find((x) => x.id === swapId);
  if (!s) return;
  const owner = db.items.find((i) => i.id === s.requested_item_id)?.owner_id;
  const me = db.session?.user.id;
  const mySide = s.requester_id === me ? 'requester' : 'owner';
  const partnerSide = mySide === 'requester' ? 'owner' : 'requester';
  const partnerId = partnerSide === 'owner' ? owner : s.requester_id;
  if (!partnerId || !partnerId.startsWith('u-')) return; // only sample users act on their own

  const later = (ms, fn) =>
    setTimeout(() => {
      const d = demoDb();
      const sw = d.swap_requests.find((x) => x.id === swapId);
      if (!sw) return;
      fn(d, sw);
      sw.updated_at = new Date().toISOString();
      demoSave(d);
    }, ms);
  const say = (d, body) => d.swap_messages.push({ id: demoUid(), swap_id: swapId, sender_id: partnerId, body, created_at: new Date().toISOString() });

  if (event === 'requested' && partnerSide === 'owner') {
    later(2500, (d, sw) => {
      sw.status = 'accepted';
      d.items.forEach((i) => { if (i.id === sw.requested_item_id || i.id === sw.offered_item_id) i.status = 'swapped'; });
      say(d, sw.method === 'shipping'
        ? 'Hi! Accepted. Let\'s do it by post - add your address and pay the shipping, I\'ll do the same.'
        : 'Hi! Accepted. When is good for you to meet?');
    });
  }
  if (event === 'message') {
    const n = db.swap_messages.filter((m) => m.swap_id === swapId && m.sender_id === partnerId).length;
    later(2000, (d) => say(d, DEMO_REPLIES[n % DEMO_REPLIES.length]));
  }
  if (event === 'patched') {
    if (patch[mySide + '_address'] && !s[partnerSide + '_address']) {
      later(1500, (d, sw) => { sw[partnerSide + '_address'] = { name: 'Sample User', street: '12 Herzl St', city: 'Tel Aviv', phone: '050-0000000' }; });
    }
    if (patch[mySide + '_paid'] && !s[partnerSide + '_paid']) {
      later(1800, (d, sw) => { sw[partnerSide + '_paid'] = true; });
    }
    if (patch[mySide + '_tracking'] && !s[partnerSide + '_tracking']) {
      later(2000, (d, sw) => { sw[partnerSide + '_tracking'] = 'RR' + Math.floor(100000000 + Math.random() * 899999999) + 'IL'; say(d, 'Sent! Tracking number is in the app.'); });
    }
    if (patch[mySide + '_done'] && !s[partnerSide + '_done']) {
      later(2000, (d, sw) => { sw[partnerSide + '_done'] = true; sw.status = 'completed'; say(d, 'Got it, thanks! Enjoy :)'); });
    }
  }
}
