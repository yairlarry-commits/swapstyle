import { tr, getLang } from './i18n.js';
// Lists, labels and helpers shared across the app.

export const CATEGORIES = [
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'kids', label: 'Kids' },
  { id: 'accessories', label: 'Accessories' },
];

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const ONE_SIZE = 'One size';

export const KIDS_AGES = [
  { id: '0-12m', label: '0–12m' },
  { id: '1-2y', label: '1–2y' },
  { id: '3-5y', label: '3–5y' },
  { id: '6-8y', label: '6–8y' },
  { id: '9-12y', label: '9–12y' },
];

export const ITEM_TYPES = [
  { id: 'single', label: 'Single' },
  { id: 'bundle', label: 'Bundle' },
];

export const CONDITIONS = [
  { id: 'new', label: 'New with tags' },
  { id: 'like_new', label: 'Like new' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
];

export const SWAP_PREFERENCES = [
  { id: 'either', label: 'In-person or postal' },
  { id: 'in_person', label: 'In-person only' },
  { id: 'postal', label: 'Postal only' },
];

export const GARMENTS = [
  { id: 'tshirt', label: 'T-shirt' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'sweater', label: 'Sweater' },
  { id: 'jacket', label: 'Jacket' },
  { id: 'coat', label: 'Coat' },
  { id: 'dress', label: 'Dress' },
  { id: 'skirt', label: 'Skirt' },
  { id: 'pants', label: 'Pants' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'bundle', label: 'Bundle' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'general', label: 'General / Square' },
];

export const AVATAR_COLORS = ['slate', 'sand', 'sage', 'accent', 'rose', 'teal', 'amber', 'violet'];

export const AVATAR_GRADIENTS = {
  slate: 'from-ink-600 to-ink-800',
  sand: 'from-sand-500 to-sand-700',
  sage: 'from-sage-500 to-sage-700',
  accent: 'from-accent-500 to-accent-700',
  rose: 'from-rose-500 to-rose-700',
  teal: 'from-teal-500 to-teal-700',
  amber: 'from-amber-500 to-amber-700',
  violet: 'from-violet-500 to-violet-700',
};

// Placeholder card colors per garment type (used when an item has no photo)
export const GARMENT_STYLES = {
  tshirt: { bg: '#e6dcc7', fg: '#514231', label: 'Tee' },
  shirt: { bg: '#e3e8df', fg: '#323e2d', label: 'Shirt' },
  sweater: { bg: '#d4c39e', fg: '#514231', label: 'Knit' },
  jacket: { bg: '#c7d1c0', fg: '#3d4b35', label: 'Jacket' },
  coat: { bg: '#a0b094', fg: '#2a3326', label: 'Coat' },
  dress: { bg: '#ffd0c6', fg: '#7d2516', label: 'Dress' },
  skirt: { bg: '#ffab98', fg: '#9c2915', label: 'Skirt' },
  pants: { bg: '#b6b6bf', fg: '#27272d', label: 'Pants' },
  jeans: { bg: '#8b8b97', fg: '#1a1a1f', label: 'Jeans' },
  shorts: { bg: '#d9d9de', fg: '#3f3f47', label: 'Shorts' },
  bundle: { bg: '#f3eee3', fg: '#514231', label: 'Bundle' },
  accessories: { bg: '#f0ece4', fg: '#3f3f47', label: 'Accessories' },
  general: { bg: '#eeeef0', fg: '#3f3f47', label: 'General' },
};

export function conditionLabel(id) {
  return tr(CONDITIONS.find((c) => c.id === id)?.label ?? id);
}

export function swapPrefLabel(id) {
  return tr(SWAP_PREFERENCES.find((p) => p.id === id)?.label ?? id);
}

export function garmentLabel(id) {
  return tr(GARMENTS.find((g) => g.id === id)?.label ?? id);
}

export function initials(name) {
  const parts = (name || '').trim().split(/[\s_]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarGradient(color) {
  return AVATAR_GRADIENTS[color] ?? AVATAR_GRADIENTS.slate;
}

export function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Date.now() - t) / 1000;
  if (s < 60) return tr('just now');
  if (s < 3600) return tr(`${Math.floor(s / 60)}m ago`);
  if (s < 86400) return tr(`${Math.floor(s / 3600)}h ago`);
  if (s < 604800) return tr(`${Math.floor(s / 86400)}d ago`);
  return new Date(iso).toLocaleDateString(getLang() === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' });
}

// ---------- Swap logistics ----------
export const SWAP_METHODS = [
  { id: 'in_person', label: 'Meet in person', hint: 'Meet up and hand the items over' },
  { id: 'shipping', label: 'Shipping', hint: 'Each side pays to ship their own item' },
];

// What each side pays to ship their item (shown in shekels)
export const SHIPPING_FEE = 25;

export function methodsAllowed(ownerPreference) {
  if (ownerPreference === 'in_person') return ['in_person'];
  if (ownerPreference === 'postal') return ['shipping'];
  return ['in_person', 'shipping'];
}
