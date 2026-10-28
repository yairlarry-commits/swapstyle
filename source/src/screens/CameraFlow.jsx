// Full-screen photo flow: Capture → Crop → Position → Clean.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Image as ImageIcon, Camera, RefreshCw, WandSparkles, Check, Move, ZoomIn, ZoomOut, RotateCw,
  LoaderCircle, Sparkles, Crop, Scissors, ArrowLeft,
} from 'lucide-react';
import { CAMERA_TEMPLATES, garmentShape, templateForGarment } from '../lib/garments.js';
import { FRAME_RATIO, cropImage, removeBackground, renderTransformed, toCard } from '../lib/imageClean.js';
import { Button, Corner, GarmentOutline } from '../components/ui.jsx';

const RESET = { x: 0, y: 0, scale: 1, rotation: 0 };
const FULL = { x: 0, y: 0, w: 1, h: 1 };

export function CameraFlow({ open, garment, onClose, onComplete }) {
  const [step, setStep] = useState('capture'); // capture | crop | adjust | done
  const [template, setTemplate] = useState(templateForGarment(garment));
  const [rawImage, setRawImage] = useState(null); // photo as taken
  const [croppedImage, setCroppedImage] = useState(null); // photo after crop
  const [cropBox, setCropBox] = useState(FULL);
  const [cropLocked, setCropLocked] = useState(false);
  const [transform, setTransform] = useState(RESET);
  const [trim, setTrim] = useState(true);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [resultCleaned, setResultCleaned] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!liveSupported()) {
      setCameraError('blocked');
      return;
    }
    // Short wait when the camera is already allowed (some embeds hang silently);
    // a long one when the phone is still asking the person for permission.
    let state = 'prompt';
    try {
      state = (await navigator.permissions?.query({ name: 'camera' }))?.state ?? 'prompt';
    } catch {}
    const ask = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1350 } },
      audio: false,
    });
    try {
      const stream = await Promise.race([
        ask,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), state === 'granted' ? 6000 : 60000)),
      ]).catch((e) => {
        ask.then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {}); // a late answer must not leave the camera on
        throw e;
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch {
      setCameraError('blocked');
      setCameraOn(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep('capture');
      setTemplate(templateForGarment(garment));
      setRawImage(null);
      setCroppedImage(null);
      setResult(null);
      setTransform(RESET);
      setError(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open, garment, stopCamera]);

  useEffect(() => {
    if (open && step === 'capture' && !cameraOn && !cameraError) startCamera();
  }, [open, step, cameraOn, cameraError, startCamera]);

  useEffect(() => {
    if (open) return () => stopCamera();
  }, [open, stopCamera]);

  const gotPhoto = (dataUrl) => {
    stopCamera();
    setRawImage(dataUrl);
    setCroppedImage(dataUrl);
    setCropBox(FULL);
    setCropLocked(false);
    setTransform(RESET);
    setTrim(true);
    setStep('adjust');
  };

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    gotPhoto(c.toDataURL('image/jpeg', 0.92));
  }, []);

  const pickFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Image is too large (max 15MB).');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => gotPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    setWorking(true);
    setError(null);
    try {
      const isFull = cropBox.x <= 0.001 && cropBox.y <= 0.001 && cropBox.w >= 0.999 && cropBox.h >= 0.999;
      setCroppedImage(isFull ? rawImage : await cropImage(rawImage, cropBox));
      setTransform(RESET);
      setStep('adjust');
    } catch (e) {
      setError(e.message || 'Could not crop this photo.');
    } finally {
      setWorking(false);
    }
  };

  const finish = useCallback(
    async (clean) => {
      if (!croppedImage || !frameRef.current) return;
      setWorking(true);
      setError(null);
      try {
        const rect = frameRef.current.getBoundingClientRect();
        const w = Math.round(rect.width * 2), h = Math.round(rect.height * 2);
        const t = { ...transform, frameW: rect.width, frameH: rect.height };
        const trimPath = trim && template !== 'general' ? garmentShape(template).d : null;
        const framed = await renderTransformed(croppedImage, t, w, h);
        let out;
        if (clean) {
          out = await removeBackground(framed, 32, trimPath);
        } else {
          out = await toCard(await renderTransformed(croppedImage, t, w, h, trimPath));
        }
        setResult(out.dataUrl);
        setResultCleaned(clean);
        setStep('done');
      } catch (e) {
        setError(e.message || 'Background removal failed. Try another photo.');
      } finally {
        setWorking(false);
      }
    },
    [croppedImage, transform, trim, template]
  );

  const retake = () => {
    setRawImage(null);
    setCroppedImage(null);
    setResult(null);
    setTransform(RESET);
    setStep('capture');
    setCameraOn(false);
    setCameraError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink-950">
      <div className="flex items-center justify-between px-5 pb-3 pt-safe">
        <button
          onClick={() => { stopCamera(); onClose(); }}
          aria-label="Close"
          className="mt-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          <X size={20} />
        </button>
        <StepDots step={step} />
        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col">
        {step === 'capture' && (
          <CaptureView
            videoRef={videoRef}
            cameraOn={cameraOn}
            cameraError={cameraError}
            template={template}
            onFile={pickFile}
          />
        )}
        {step === 'crop' && rawImage && <CropView src={rawImage} box={cropBox} setBox={setCropBox} locked={cropLocked} />}
        {step === 'adjust' && croppedImage && (
          <AdjustView frameRef={frameRef} image={croppedImage} transform={transform} setTransform={setTransform} template={template} trim={trim} working={working} />
        )}
        {step === 'done' && result && <DoneView result={result} cleaned={resultCleaned} />}
      </div>

      <div className="px-5 pb-safe pt-3">
        {(step === 'capture' || step === 'adjust') && <TemplatePicker active={template} onSelect={setTemplate} />}

        {step === 'capture' && (
          <div className="mb-4 mt-3 flex items-center justify-center gap-6">
            <PhotoPicker onFile={pickFile} label="Gallery" className="flex flex-col items-center gap-1 text-white/80">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 backdrop-blur"><ImageIcon size={22} /></span>
              <span className="text-[11px]">Gallery</span>
            </PhotoPicker>
            {cameraOn ? (
              <button onClick={capture} className="flex flex-col items-center gap-1" aria-label="Capture">
                <span className="grid place-items-center rounded-full bg-white ring-4 ring-white/30 transition active:scale-95" style={{ height: 72, width: 72 }}>
                  <span className="h-14 w-14 rounded-full bg-white ring-2 ring-ink-900" />
                </span>
                <span className="text-[11px] text-white/80">Capture</span>
              </button>
            ) : cameraError && liveSupported() ? (
              // the live camera keeps the outline on screen, so offer it again first
              <button onClick={() => { setCameraError(null); startCamera(); }} className="flex flex-col items-center gap-1" aria-label="Open camera">
                <span className="grid place-items-center rounded-full bg-gold-400 text-black ring-4 ring-gold-400/30 transition active:scale-95" style={{ height: 72, width: 72 }}>
                  <Camera size={28} />
                </span>
                <span className="text-[11px] text-white/80">Open camera</span>
              </button>
            ) : (
              <PhotoPicker onFile={pickFile} camera label="Take photo" className="flex flex-col items-center gap-1">
                <span className="grid place-items-center rounded-full bg-gold-400 text-black ring-4 ring-gold-400/30 transition active:scale-95" style={{ height: 72, width: 72 }}>
                  <Camera size={28} />
                </span>
                <span className="text-[11px] text-white/80">Take photo</span>
              </PhotoPicker>
            )}
            {!cameraOn && cameraError && liveSupported() && (
              <PhotoPicker onFile={pickFile} camera label="Phone camera" className="flex flex-col items-center gap-1 text-white/80">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 backdrop-blur"><Camera size={20} /></span>
                <span className="text-[11px]">Phone camera</span>
              </PhotoPicker>
            )}
          </div>
        )}

        {step === 'crop' && (
          <div className="mb-4 mt-1 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <Toggle active={!cropLocked} onClick={() => { setCropLocked(false); }}>Free</Toggle>
              <Toggle active={cropLocked} onClick={() => { setCropLocked(true); setCropBox(fitRatio(cropBox, rawImage)); }}>Frame 4:5</Toggle>
              <Toggle onClick={() => { setCropBox(FULL); setCropLocked(false); }}><RefreshCw size={13} /> Reset</Toggle>
            </div>
            <div className="flex gap-3">
              <Button variant="glass" className="flex-1" onClick={() => setStep('adjust')}>
                <ArrowLeft size={16} className="flip-rtl" /> Cancel
              </Button>
              <Button variant="light" className="flex-[2]" loading={working} onClick={applyCrop}>
                <Crop size={18} /> Apply crop
              </Button>
            </div>
          </div>
        )}

        {step === 'adjust' && (
          <div className="mb-4 mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <TransformControls transform={transform} setTransform={setTransform} />
              {template !== 'general' && (
                <Toggle active={trim} onClick={() => setTrim((v) => !v)}><Scissors size={13} /> White outside outline</Toggle>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="glass" className="flex-1 px-3" onClick={retake}>
                <Camera size={16} /> Retake
              </Button>
              <Button variant="glass" className="flex-1 px-3" onClick={() => setStep('crop')}>
                <Crop size={16} /> Crop
              </Button>
              <Button variant="light" className="flex-[1.4] px-3" loading={working} onClick={() => finish(false)}>
                <Check size={18} /> Done
              </Button>
            </div>
            <button onClick={() => finish(true)} disabled={working} className="inline-flex items-center justify-center gap-1.5 text-center text-xs font-medium text-white/70 underline-offset-2 hover:underline">
              <WandSparkles size={13} /> Also remove the background inside the outline
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="mb-4 mt-3 flex gap-3">
            <Button variant="glass" className="flex-1" onClick={() => setStep('adjust')}>
              <ArrowLeft size={16} className="flip-rtl" /> Back
            </Button>
            <Button variant="light" className="flex-[2]" onClick={() => result && onComplete(result, template)}>
              <Check size={18} /> Use this photo
            </Button>
          </div>
        )}

        {error && <div className="mb-4 rounded-xl bg-accent-500/20 px-4 py-2.5 text-sm text-accent-200">{error}</div>}
      </div>

    </div>
  );
}

// ---------- pieces ----------

// A tappable area that IS the file field (a <label> around an invisible input).
// This opens the phone's camera / photo library on every browser, including iPhone,
// where opening a hidden file field from code is often blocked.
function PhotoPicker({ onFile, camera = false, label, className, children }) {
  return (
    <label className={`relative cursor-pointer ${className}`} aria-label={label}>
      <input
        type="file"
        accept="image/*"
        {...(camera ? { capture: 'environment' } : {})}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 0 }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      {children}
    </label>
  );
}

// True when the page is allowed to ask for the live camera at all
function liveSupported() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const pp = document.permissionsPolicy || document.featurePolicy;
    if (pp && typeof pp.allowsFeature === 'function') return pp.allowsFeature('camera');
  } catch {}
  return true;
}

function StepDots({ step }) {
  const steps = [
    { id: 'capture', label: 'Capture' },
    { id: 'adjust', label: 'Position' },
    { id: 'done', label: 'Done' },
  ];
  const idx = steps.findIndex((s) => s.id === (step === 'crop' ? 'adjust' : step));
  return (
    <div className="mt-3 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <div className={`h-1.5 rounded-full transition-all ${i <= idx ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />
          <span className={`text-[10px] font-medium uppercase tracking-wider transition ${i === idx ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function TemplatePicker({ active, onSelect }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/5 p-1.5">
      {CAMERA_TEMPLATES.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium leading-tight transition active:scale-95 ${
              on ? 'bg-gold-400 text-black' : 'text-white/60 hover:text-white/90'
            }`}
          >
            <GarmentOutline garment={t.id} dim={null} tone="currentColor" className="h-5 w-4" />
            <span className="w-full truncate text-center">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition active:scale-95 ${
        active ? 'bg-gold-400 text-black' : 'bg-white/10 text-white/80 hover:bg-white/15'
      }`}
    >
      {children}
    </button>
  );
}

function RoundAction({ children, onClick, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-white/80" aria-label={label}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 backdrop-blur">{children}</span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function CaptureView({ videoRef, cameraOn, cameraError, template, onFile }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <div
        className="relative overflow-hidden rounded-3xl bg-ink-900 shadow-float"
        style={{ aspectRatio: String(FRAME_RATIO), width: `min(100%, 24rem, calc(52vh * ${FRAME_RATIO}))` }}
      >
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 z-0 h-full w-full object-cover" />
        {/* z-index + translateZ keep the outline above the live video on iPhone */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{ transform: 'translateZ(0)' }}>
          <GarmentOutline garment={template} className="h-full w-full" dim={cameraOn ? 'rgba(15,15,18,0.5)' : null} />
        </div>
        {!cameraOn && !cameraError && (
          <p className="absolute inset-x-0 bottom-4 text-center text-xs text-white/50">Starting camera…</p>
        )}
        {!cameraOn && cameraError && liveSupported() && (
          <p className="absolute inset-x-4 bottom-4 text-center text-xs text-white/70">The camera did not open. Tap Open camera and allow access.</p>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-white/55">Lay it flat and line it up with the outline.</p>
    </div>
  );
}

// Crop box over the full photo, with corner handles and drag-to-move.
function CropView({ src, box, setBox, locked }) {
  const wrapRef = useRef(null);
  const [nat, setNat] = useState(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth - PAD * 2, h: el.clientHeight - PAD * 2 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // Where the photo sits inside the area (object-contain)
  const k = nat && area.w ? Math.min(area.w / nat.w, area.h / nat.h) : 0;
  const dw = nat ? nat.w * k : 0, dh = nat ? nat.h * k : 0;
  const ox = PAD + (area.w - dw) / 2, oy = PAD + (area.h - dh) / 2;
  const aspectN = nat ? (nat.w / nat.h) / FRAME_RATIO : 1; // h = w * aspectN keeps 4:5

  const start = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapRef.current.setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, b: { ...box } };
  };

  const move = (e) => {
    const d = drag.current;
    if (!d || !dw) return;
    const dx = (e.clientX - d.sx) / dw, dy = (e.clientY - d.sy) / dh;
    setBox(applyDrag(d.mode, d.b, dx, dy, locked ? aspectN : null));
  };
  const end = () => { drag.current = null; };

  const L = ox + box.x * dw, T = oy + box.y * dh, W = box.w * dw, H = box.h * dh;
  const handles = [
    { m: 'nw', x: L, y: T }, { m: 'ne', x: L + W, y: T },
    { m: 'sw', x: L, y: T + H }, { m: 'se', x: L + W, y: T + H },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <div className="mb-3 flex items-center gap-2 text-white/70">
        <Crop size={15} />
        <span className="text-xs font-medium">Drag the corners to cut away the surroundings</span>
      </div>
      <div
        ref={wrapRef}
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-3xl bg-black"
        style={{ height: 'min(62vh, 520px)' }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {nat && (
          <>
            <img src={src} alt="crop" draggable={false} className="absolute" style={{ left: ox, top: oy, width: dw, height: dh }} />
            <div
              onPointerDown={start('move')}
              className="absolute cursor-move border-2 border-white"
              style={{ left: L, top: T, width: W, height: H, boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
            >
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/35" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/35" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-white/35" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-white/35" />
              </div>
            </div>
            {handles.map((h) => (
              <div
                key={h.m}
                onPointerDown={start(h.m)}
                aria-label={`Crop corner ${h.m}`}
                className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ left: h.x, top: h.y }}
              >
                <span className="h-4 w-4 rounded-full border-2 border-ink-900 bg-white shadow" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const MIN = 0.08;
const PAD = 16;
function applyDrag(mode, b, dx, dy, aspectN) {
  if (mode === 'move') {
    return { ...b, x: clamp(b.x + dx, 0, 1 - b.w), y: clamp(b.y + dy, 0, 1 - b.h) };
  }
  const east = mode.includes('e'), south = mode.includes('s');
  const ax = east ? b.x : b.x + b.w; // fixed corner
  const ay = south ? b.y : b.y + b.h;
  const cx = clamp((east ? b.x + b.w : b.x) + dx, 0, 1);
  const cy = clamp((south ? b.y + b.h : b.y) + dy, 0, 1);
  let w = Math.max(MIN, Math.abs(cx - ax));
  let h = Math.max(MIN, Math.abs(cy - ay));
  const roomW = east ? 1 - ax : ax;
  const roomH = south ? 1 - ay : ay;
  w = Math.min(w, roomW);
  h = Math.min(h, roomH);
  if (aspectN) {
    h = w * aspectN;
    if (h > roomH) { h = roomH; w = h / aspectN; }
  }
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
}

// Largest 4:5 box inside the current one, centered
function fitRatio(b, src) {
  const img = new Image();
  img.src = src;
  const r = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight / FRAME_RATIO : 1;
  let w = b.w, h = w * r;
  if (h > b.h) { h = b.h; w = h / r; }
  return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
}

function AdjustView({ frameRef, image, transform, setTransform, template, trim, working }) {
  const gesture = useRef(null);

  const onDown = (e) => {
    if (working) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const g = gesture.current ?? { startX: e.clientX, startY: e.clientY, startT: { ...transform }, pointers: new Map(), pinchDist: 0, pinchAngle: 0 };
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 1) {
      g.startX = e.clientX;
      g.startY = e.clientY;
      g.startT = { ...transform };
    } else if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values());
      g.pinchDist = distance(a, b);
      g.pinchAngle = angle(a, b);
      g.startT = { ...transform };
    }
    gesture.current = g;
  };

  const onMove = (e) => {
    const g = gesture.current;
    if (!g || working) return;
    if (g.pointers.has(e.pointerId)) g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 1) {
      setTransform({ ...g.startT, x: g.startT.x + (e.clientX - g.startX), y: g.startT.y + (e.clientY - g.startY) });
    } else if (g.pointers.size >= 2) {
      const [a, b] = Array.from(g.pointers.values());
      const ratio = distance(a, b) / (g.pinchDist || distance(a, b));
      setTransform({ ...g.startT, scale: clamp(g.startT.scale * ratio, 0.4, 4), rotation: g.startT.rotation + (angle(a, b) - g.pinchAngle) });
    }
  };

  const onUp = (e) => {
    const g = gesture.current;
    if (!g) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size < 2) {
      const rest = Array.from(g.pointers.values())[0];
      if (rest) {
        g.startX = rest.x;
        g.startY = rest.y;
        g.startT = { ...transform };
      }
    }
    if (g.pointers.size === 0) gesture.current = null;
  };

  const showTrim = trim && template !== 'general';

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <div className="mb-3 flex items-center gap-2 text-white/70">
        <Move size={15} />
        <span className="text-xs font-medium">Drag to position · pinch to zoom &amp; rotate</span>
      </div>
      <div
        ref={frameRef}
        className="relative w-full max-w-sm touch-none overflow-hidden rounded-3xl shadow-float"
        style={{ aspectRatio: String(FRAME_RATIO), background: '#FFFFFF' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <img
          src={image}
          alt="adjust"
          draggable={false}
          className="absolute left-1/2 top-1/2 max-w-none select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: working ? 0.35 : 1,
            transition: 'opacity 0.2s',
          }}
        />
        <div className="pointer-events-none absolute inset-0">
          <GarmentOutline garment={template} className="h-full w-full" dim={showTrim ? '#ffffff' : 'rgba(15,15,18,0.12)'} />
        </div>
        <Corner className="left-4 top-4 border-l-2 border-t-2 border-ink-900/30" />
        <Corner className="right-4 top-4 border-r-2 border-t-2 border-ink-900/30" />
        <Corner className="bottom-4 left-4 border-b-2 border-l-2 border-ink-900/30" />
        <Corner className="bottom-4 right-4 border-b-2 border-r-2 border-ink-900/30" />
        {working && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 backdrop-blur-sm">
            <LoaderCircle size={28} className="animate-spin text-ink-900" />
            <p className="text-xs font-medium text-ink-900">Preparing your photo…</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransformControls({ transform, setTransform }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <RoundButton label="Zoom out" onClick={() => setTransform({ ...transform, scale: clamp(transform.scale * 0.9, 0.4, 4) })}><ZoomOut size={17} /></RoundButton>
      <RoundButton label="Zoom in" onClick={() => setTransform({ ...transform, scale: clamp(transform.scale * 1.1, 0.4, 4) })}><ZoomIn size={17} /></RoundButton>
      <RoundButton label="Rotate" onClick={() => setTransform({ ...transform, rotation: transform.rotation + 90 })}><RotateCw size={17} /></RoundButton>
      <RoundButton label="Reset" onClick={() => setTransform(RESET)}><RefreshCw size={17} /></RoundButton>
    </div>
  );
}

function RoundButton({ children, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95">
      {children}
    </button>
  );
}

function DoneView({ result, cleaned }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5">
      <div className="mb-4 flex items-center gap-2 rounded-full bg-sage-500/20 px-3 py-1.5 text-sage-200">
        <Sparkles size={15} />
        <span className="text-xs font-semibold">{cleaned ? 'Background removed' : 'Photo ready'}</span>
      </div>
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-float" style={{ aspectRatio: String(FRAME_RATIO), background: '#FFFFFF' }}>
        <img src={result} alt="finished item" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <p className="mt-4 max-w-xs text-center text-xs text-white/50">Your item sits on a clean studio card, so it looks consistent across the swap feed.</p>
    </div>
  );
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function angle(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
