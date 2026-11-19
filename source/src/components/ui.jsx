import { useEffect, useId } from 'react';
import { Home, Plus, User, Inbox, X, Globe, MessageCircle } from 'lucide-react';
import { getLang, setLang } from '../lib/i18n.js';
import { GARMENT_STYLES, avatarGradient, initials } from '../lib/constants.js';
import { SHAPE_W, SHAPE_H, garmentShape } from '../lib/garments.js';
import { useRouter, useBackToClose } from '../context/RouterContext.jsx';
import { useInbox } from '../context/InboxContext.jsx';

// ---------- Button ----------
const BUTTON_VARIANTS = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-300 disabled:text-ink-100',
  secondary: 'bg-sand-500 text-white hover:bg-sand-600 active:bg-sand-700 disabled:bg-sand-200',
  outline: 'border border-ink-200 text-ink-900 hover:border-ink-900 hover:bg-ink-50 disabled:opacity-40',
  ghost: 'text-ink-700 hover:bg-ink-100 active:bg-ink-200',
  glass: 'border border-white/20 bg-white/10 text-white hover:bg-white/15',
  light: 'bg-white text-ink-900 hover:bg-ink-50 active:bg-ink-100 disabled:opacity-60',
  danger: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800',
};
const BUTTON_SIZES = {
  sm: 'h-9 px-4 text-xs rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-14 px-7 text-base rounded-2xl gap-2.5',
};

export function Button({ variant = 'primary', size = 'md', loading = false, children, className = '', disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium tracking-tight transition-all duration-200 disabled:cursor-not-allowed select-none active:scale-[0.98] ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// ---------- Logo: gold swap arrow + inner dashed (stitched) arrow the other way, on a white disc ----------
const LOGO_ARC = 'M 42.74,21.92 A 29,29 0 1,0 68.45,27.62';
const LOGO_HEAD = '57.83,20.41 75.03,19.80 63.99,36.47';
// inner dashed "stitch" arrow turning the other way: two people swapping
const LOGO_INNER_ARC = 'M 54.07,34.28 A 16.24,16.24 0 1,1 38.82,38.22';
const LOGO_INNER_HEAD = '46.29,32.98 35.71,33.29 41.86,42.60';

export function Logo({ size = 32, className = '', container = true }) {
  const gid = `ss-logo-${useId().replace(/:/g, '')}`;
  const svg = (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SwapStyle">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A24A" />
          <stop offset="50%" stopColor="#E4C878" />
          <stop offset="100%" stopColor="#A27420" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#FFFFFF" />
      <circle cx="50" cy="50" r="47.25" fill="none" stroke={`url(#${gid})`} strokeWidth="1.5" opacity="0.55" />
      <path d={LOGO_ARC} fill="none" stroke={`url(#${gid})`} strokeWidth="8.5" strokeLinecap="round" />
      <polygon points={LOGO_HEAD} fill={`url(#${gid})`} stroke={`url(#${gid})`} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={LOGO_INNER_ARC} fill="none" stroke={`url(#${gid})`} strokeWidth="2.2" strokeDasharray="3.2 2.8" strokeLinecap="round" />
      <polygon points={LOGO_INNER_HEAD} fill={`url(#${gid})`} stroke={`url(#${gid})`} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
  if (!container) return <span className={className}>{svg}</span>;
  return (
    <span className={`inline-flex items-center justify-center rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.08)] ${className}`} style={{ width: size, height: size }}>
      {svg}
    </span>
  );
}

// ---------- Avatar (initials on a gradient) ----------
const AVATAR_SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-20 w-20 text-lg',
};

export function Avatar({ name, color = 'slate', size = 'md', className = '' }) {
  return (
    <div
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-2 ring-white ${avatarGradient(color)} ${AVATAR_SIZES[size]} ${className}`}
    >
      {initials(name)}
    </div>
  );
}

// ---------- Item visual: photo, or a garment illustration on a tinted card ----------
export function ItemVisual({ garment, color, imageUrl, className = '', showSilhouette = false }) {
  const style = GARMENT_STYLES[garment] ?? GARMENT_STYLES.tshirt;
  const fill = color || style.fg;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(160deg, ${style.bg} 0%, #faf8f4 100%)` }}>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={garment} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <GarmentIllustration garment={garment} color={fill} />
          {showSilhouette && (
            <span
              className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: style.fg, opacity: 0.6 }}
            >
              {style.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GarmentIllustration({ garment, color }) {
  const shape = garmentShape(garment);
  return (
    <svg viewBox={`0 0 ${SHAPE_W} ${SHAPE_H}`} className="h-[72%] w-[72%]" aria-hidden>
      <path d={shape.d} fill={color} fillOpacity={0.88} />
      {shape.details && <path d={shape.details} fill="none" stroke="#faf8f4" strokeOpacity={0.45} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// ---------- Camera guide: clothing outline with the area outside it dimmed ----------
// Drawn in the same 4:5 box as the photo frame, inset 5% on every side.
export function GarmentOutline({ garment, className = '', dim = 'rgba(15,15,18,0.45)', tone = 'gold' }) {
  const shape = garmentShape(garment);
  const uid = useId().replace(/:/g, '');
  const goldId = `ss-gold-${uid}`, holeId = `ss-hole-${uid}`, softId = `ss-soft-${uid}`;
  const stroke = tone === 'gold' ? `url(#${goldId})` : tone;
  const inset = `translate(${SHAPE_W * 0.05} ${SHAPE_H * 0.05}) scale(0.9)`;
  return (
    <svg viewBox={`0 0 ${SHAPE_W} ${SHAPE_H}`} className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCF6BA" />
          <stop offset="55%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#F4E5A1" />
        </linearGradient>
        {/* blurs the edge of the hole so the area outside fades in instead of a hard cut */}
        <filter id={softId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      {dim && (
        <path
          d={`M0 0 H${SHAPE_W} V${SHAPE_H} H0 Z`}
          fill={dim}
          mask={`url(#${holeId})`}
        />
      )}
      <mask id={holeId}>
        <rect width={SHAPE_W} height={SHAPE_H} fill="white" />
        <path d={shape.d} transform={inset} fill="black" stroke="black" strokeWidth={1.2} strokeLinejoin="round" filter={`url(#${softId})`} />
      </mask>
      <g transform={inset} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {tone === 'gold' && <path d={shape.d} stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />}
        <path d={shape.d} stroke={stroke} strokeWidth={0.5} strokeOpacity={tone === 'gold' ? 0.75 : 1} />
        {shape.details && <path d={shape.details} stroke={stroke} strokeWidth={0.35} strokeOpacity={0.4} />}
      </g>
    </svg>
  );
}

// ---------- Corner marks (viewfinder) ----------
export function Corner({ className }) {
  return <div className={`absolute h-6 w-6 rounded-sm ${className}`} />;
}

// ---------- Bottom sheet / modal ----------
export function Sheet({ open, onClose, children, title, sheet = true }) {
  useBackToClose(open, onClose);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full sm:max-w-md bg-white shadow-float animate-slide-up sm:animate-scale-in ${sheet ? 'rounded-t-3xl sm:rounded-3xl' : 'rounded-3xl'} max-h-[92vh] overflow-y-auto pb-safe`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-ink-500 transition hover:bg-ink-100 hover:text-ink-900">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ---------- Pill / chip ----------
export function Chip({ label, active, onClick, small, fit }) {
  // fit: share one row with its siblings, so the whole row fits the screen without scrolling
  const size = fit ? 'h-9 min-w-0 flex-auto px-2 text-[12.5px]' : small ? 'h-8 shrink-0 px-3 text-xs' : 'h-9 shrink-0 px-4 text-sm';
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full font-medium transition-all active:scale-95 ${size} ${
        active ? 'bg-ink-900 text-white shadow-sm' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:ring-ink-300'
      }`}
    >
      {label}
    </button>
  );
}

// ---------- Top header with logo ----------
export function AppHeader({ title, subtitle, children }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-sand-50/95 backdrop-blur-xl pt-safe">
      <div className={`mx-auto flex max-w-md items-center gap-2.5 px-5 ${children ? 'pb-2 pt-3' : 'py-3'}`}>
        <Logo size={26} container={false} />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold text-ink-900">{title}</span>
          {subtitle && <span className="text-[11px] text-ink-400">{subtitle}</span>}
        </div>
      </div>
      {children && <div className="mx-auto max-w-md px-5 pb-3">{children}</div>}
    </header>
  );
}

// Switch between Hebrew and English
export function LanguageToggle({ className = '' }) {
  const he = getLang() === 'he';
  return (
    <button
      onClick={() => setLang(he ? 'en' : 'he')}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-ink-600 ring-1 ring-ink-200 transition active:scale-95 ${className}`}
    >
      <Globe size={13} /> {he ? 'English' : 'עברית'}
    </button>
  );
}

// ---------- Bottom tab bar ----------
const TABS = [
  { route: { name: 'feed' }, icon: Home, label: 'Feed' },
  { route: { name: 'offers' }, icon: Inbox, label: 'Offers' },
  { route: { name: 'upload' }, icon: Plus, label: 'Add' },
  { route: { name: 'messages' }, icon: MessageCircle, label: 'Messages' },
  { route: { name: 'profile' }, icon: User, label: 'Closet' },
];

export function BottomNav() {
  const { route, navigate } = useRouter();
  const { unreadTotal } = useInbox();
  const isActive = (r) => (r.name === 'profile' && route.name === 'profile' ? !route.userId : r.name === route.name);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white/90 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.route);
          if (t.route.name === 'upload') {
            return (
              <button key="upload" onClick={() => navigate({ name: 'upload' })} aria-label={t.label} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2">
                <div className="grid h-12 w-12 -translate-y-1 place-items-center rounded-2xl bg-ink-900 text-white shadow-float transition active:scale-95">
                  <Icon size={22} strokeWidth={2.2} />
                </div>
              </button>
            );
          }
          return (
            <button key={t.route.name} onClick={() => navigate(t.route)} aria-label={t.label} className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition active:scale-95">
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} className={active ? 'text-ink-900' : 'text-ink-400'} />
                {t.route.name === 'messages' && unreadTotal > 0 && (
                  <span className="absolute -end-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-ink-900' : 'text-ink-400'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
