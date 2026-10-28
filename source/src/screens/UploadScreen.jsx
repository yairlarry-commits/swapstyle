import { useState } from 'react';
import { X, WandSparkles, RefreshCw, Camera, Package, Check, Shirt } from 'lucide-react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createItem } from '../lib/api.js';
import { CATEGORIES, SIZES, ONE_SIZE, KIDS_AGES, ITEM_TYPES, CONDITIONS, GARMENTS, GARMENT_STYLES } from '../lib/constants.js';
import { Button, Corner, ItemVisual } from '../components/ui.jsx';
import { CameraFlow } from './CameraFlow.jsx';

export function UploadScreen() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [photo, setPhoto] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'women',
    size: 'M',
    kidsAgeGroup: '',
    itemType: 'single',
    bundleCount: 5,
    condition: 'like_new',
    garment: 'tshirt',
    color: '',
  });
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const isKids = form.category === 'kids';
  const isAcc = form.category === 'accessories';
  const garmentType = form.itemType === 'bundle' ? 'bundle' : form.garment;
  const style = GARMENT_STYLES[garmentType] ?? GARMENT_STYLES.tshirt;

  const publish = async () => {
    if (!user) return;
    if (!photo) {
      setError('Add a photo of your item first.');
      return;
    }
    if (form.title.trim().length < 2) {
      setError('Give your item a title.');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      await createItem({
        owner_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        size: isKids ? form.kidsAgeGroup || '3-5y' : isAcc ? ONE_SIZE : form.size,
        kids_age_group: (isKids && form.kidsAgeGroup) || null,
        item_type: form.itemType,
        bundle_count: form.itemType === 'bundle' ? form.bundleCount : 1,
        condition: form.condition,
        garment_type: garmentType,
        color: form.color.trim() || null,
        image_url: photo,
      });
      navigate({ name: 'profile' });
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-sand-50/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <h1 className="font-display text-lg font-semibold text-ink-900">Add an item</h1>
          <button onClick={() => navigate({ name: 'feed' })} className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-5">
        <button onClick={() => setCameraOpen(true)} className="group relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-white shadow-card transition active:scale-[0.99]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${style.bg} 0%, #faf8f4 100%)` }} />
          {photo ? (
            <>
              <img src={photo} alt="item preview" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-sage-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                <WandSparkles size={12} /> Cleaned
              </div>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-900 shadow-sm backdrop-blur">
                  <RefreshCw size={13} /> Re-capture
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <ItemVisual garment={garmentType} color={style.fg} className="h-full w-full" showSilhouette />
              </div>
              <Corner className="left-4 top-4 border-l-2 border-t-2 border-ink-900/40" />
              <Corner className="right-4 top-4 border-r-2 border-t-2 border-ink-900/40" />
              <Corner className="bottom-4 left-4 border-b-2 border-l-2 border-ink-900/40" />
              <Corner className="bottom-4 right-4 border-b-2 border-r-2 border-ink-900/40" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white shadow-float">
                  <Camera size={15} /> Open camera
                </span>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-ink-900/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white backdrop-blur">
                Align · Position · Clean
              </div>
            </>
          )}
        </button>

        <div className="mt-6 flex flex-col gap-5">
          <Segmented
            label="What are you listing?"
            icon={<Package size={14} />}
            options={ITEM_TYPES}
            value={form.itemType}
            onChange={(v) => setForm({ ...form, itemType: v })}
          />

          {form.itemType === 'bundle' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-500">Number of items in bundle</span>
              <input
                type="number"
                min={2}
                max={10}
                value={form.bundleCount}
                onChange={(e) => setForm({ ...form, bundleCount: Math.max(2, Math.min(10, Number(e.target.value) || 5)) })}
                className="h-11 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none"
              />
            </label>
          )}

          <Segmented
            label="Category"
            options={CATEGORIES}
            value={form.category}
            onChange={(v) =>
              setForm({
                ...form,
                category: v,
                size: v === 'kids' ? form.kidsAgeGroup || '3-5y' : v === 'accessories' ? ONE_SIZE : 'M',
                garment: v === 'accessories' ? 'accessories' : form.garment === 'accessories' ? 'tshirt' : form.garment,
              })
            }
          />

          {!isAcc && (
          <PillGroup label={isKids ? 'Age group' : 'Size'}>
            {isKids
              ? KIDS_AGES.map((a) => (
                  <Pill key={a.id} label={a.label} active={form.kidsAgeGroup === a.id} onClick={() => setForm({ ...form, kidsAgeGroup: a.id, size: a.id })} />
                ))
              : SIZES.map((s) => <Pill key={s} label={s} active={form.size === s} onClick={() => setForm({ ...form, size: s })} />)}
          </PillGroup>
          )}

          {form.itemType === 'single' && !isAcc && (
            <PillGroup label="Garment type">
              {GARMENTS.filter((g) => g.id !== 'bundle').map((g) => (
                <Pill key={g.id} label={g.label} active={form.garment === g.id} onClick={() => setForm({ ...form, garment: g.id })} />
              ))}
            </PillGroup>
          )}

          <PillGroup label="Condition">
            {CONDITIONS.map((c) => (
              <Pill key={c.id} label={c.label} active={form.condition === c.id} onClick={() => setForm({ ...form, condition: c.id })} />
            ))}
          </PillGroup>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Linen shirt, barely worn"
              className="h-11 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">Description (optional)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Brand, fit, any notes…"
              className="resize-none rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-500">Dominant color (optional)</span>
            <input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="e.g. cream, navy"
              className="h-11 rounded-xl border border-ink-200 px-3 text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>

          {error && <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">{error}</div>}

          <Button size="lg" className="w-full" loading={publishing} onClick={publish}>
            <Check size={18} /> Publish to swap feed
          </Button>
          <p className="flex items-center justify-center gap-1 text-center text-xs text-ink-400">
            <Shirt size={12} /> Items are visible to everyone on SwapStyle.
          </p>
        </div>
      </div>

      <CameraFlow
        open={cameraOpen}
        garment={garmentType}
        onClose={() => setCameraOpen(false)}
        onComplete={(dataUrl, template) => {
          setPhoto(dataUrl);
          if (form.itemType === 'single') setForm((f) => ({ ...f, garment: template }));
          setCameraOpen(false);
        }}
      />
    </div>
  );
}

function Segmented({ label, icon, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">
        {icon} {label}
      </span>
      <div className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-xl bg-ink-100 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`h-10 rounded-lg text-sm font-medium transition ${value === o.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PillGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-400">{label}</span>
      <div className="no-scrollbar flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 rounded-full px-3.5 text-xs font-medium transition active:scale-95 ${active ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-ink-200'}`}
    >
      {label}
    </button>
  );
}
