// In-browser background removal: flood-fills the background colour from the image edges,
// cleans the mask, crops to the item and places it on a white 800×1000 "studio card".

export const CARD_W = 800;
export const CARD_H = 1000;
export const FRAME_RATIO = 4 / 5;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

// Renders the user's positioned photo (pan / zoom / rotate) into a canvas of the frame size.
// If `trimPath` (an SVG path in the 80×100 outline box) is given, everything outside it turns white.
export async function renderTransformed(src, t, w, h, trimPath = null) {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const fit = Math.min(w / img.width, h / img.height);
  const dw = img.width * fit * t.scale;
  const dh = img.height * fit * t.scale;
  ctx.save();
  ctx.translate(w / 2 + t.x * (w / t.frameW || 1), h / 2 + t.y * (h / t.frameH || 1));
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  if (trimPath) {
    // White layer with a soft hole in the garment's shape, laid over the photo
    const layer = document.createElement('canvas');
    layer.width = w;
    layer.height = h;
    const lc = layer.getContext('2d');
    lc.fillStyle = '#ffffff';
    lc.fillRect(0, 0, w, h);
    lc.globalCompositeOperation = 'destination-out';
    lc.drawImage(softShapeMask(w, h, trimPath), 0, 0);
    ctx.drawImage(layer, 0, 0);
  }
  return c.toDataURL('image/png');
}

// Cuts a rectangle out of the photo. `box` is in 0..1 fractions of the image size.
export async function cropImage(src, box) {
  const img = await loadImage(src);
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const sx = Math.round(box.x * nw), sy = Math.round(box.y * nh);
  const sw = Math.max(1, Math.round(box.w * nw)), sh = Math.max(1, Math.round(box.h * nh));
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return c.toDataURL('image/jpeg', 0.92);
}

// Puts a finished frame on the standard white 800×1000 card without removing the background.
export async function toCard(src) {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.drawImage(img, 0, 0, CARD_W, CARD_H);
  return { dataUrl: c.toDataURL('image/jpeg', 0.92), width: CARD_W, height: CARD_H };
}

export async function removeBackground(src, tolerance = 24, keepPath = null) {
  const { canvas, ctx } = await cutoutGarment(src, tolerance, keepPath);
  const cropped = cropToContent(canvas, ctx);
  return placeOnCard(cropped.canvas, cropped.w, cropped.h);
}

// The garment alone (transparent around it), still in the photo frame's coordinates.
// Used both for the clean studio card and for dressing the mannequin.
export async function cutoutGarment(src, tolerance = 24, keepPath = null, margin = 0.006) {
  const img = await loadImage(src);
  const MAX = 900;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  const k = Math.min(1, MAX / Math.max(w, h));
  w = Math.round(w * k);
  h = Math.round(h * k);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Sample the edges to estimate the background colour
  const samples = [];
  const sample = (x, y) => {
    const p = (y * w + x) * 4;
    samples.push([d[p], d[p + 1], d[p + 2]]);
  };
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 40))) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 40))) { sample(0, y); sample(w - 1, y); }
  const [br, bg, bb] = averageColor(samples);

  const visited = new Uint8Array(w * h);
  const stack = [];
  const tol2 = tolerance * tolerance * 3;
  const dist = (p) => {
    const r = d[p] - br, g = d[p + 1] - bg, b = d[p + 2] - bb;
    return r * r + g * g + b * b;
  };
  const seed = (x, y) => {
    const i = y * w + x;
    if (visited[i]) return;
    if (dist(i * 4) <= tol2) { visited[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }

  const grow2 = (tolerance + 10) * (tolerance + 10) * 3;
  while (stack.length) {
    const i = stack.pop();
    d[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of nb) {
      if (n < 0 || visited[n]) continue;
      visited[n] = 1;
      if (dist(n * 4) <= grow2) stack.push(n);
    }
  }

  blurAlpha(d, w, h);
  despeckle(d, w, h);
  closeMask(d, w, h);
  despeckle(d, w, h);
  if (keepPath) clearOutsidePath(d, w, h, keepPath, margin);
  ctx.putImageData(imageData, 0, 0);
  return { canvas, ctx, w, h };
}

function averageColor(list) {
  let r = 0, g = 0, b = 0;
  for (const c of list) { r += c[0]; g += c[1]; b += c[2]; }
  return [r / list.length, g / list.length, b / list.length];
}

function alphaOf(d, w, h) {
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  return a;
}

function blurAlpha(d, w, h) {
  const a = alphaOf(d, w, h);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          sum += a[yy * w + xx];
          n++;
        }
      out[y * w + x] = sum / n;
    }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = out[i];
}

function despeckle(d, w, h) {
  const a = alphaOf(d, w, h);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (a[i] < 30) { out[i] = 0; continue; }
      let n = 0;
      if (x > 0 && a[i - 1] > 30) n++;
      if (x < w - 1 && a[i + 1] > 30) n++;
      if (y > 0 && a[i - w] > 30) n++;
      if (y < h - 1 && a[i + w] > 30) n++;
      out[i] = n >= 2 ? a[i] : 0;
    }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = out[i];
}

// Morphological close: dilate then erode the alpha mask
function closeMask(d, w, h) {
  const dil = morph(alphaOf(d, w, h), w, h, Math.max);
  const ero = morph(dil, w, h, Math.min);
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = ero[i];
}

function morph(a, w, h, pick) {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = a[i];
      if (x > 0) v = pick(v, a[i - 1]);
      if (x < w - 1) v = pick(v, a[i + 1]);
      if (y > 0) v = pick(v, a[i - w]);
      if (y < h - 1) v = pick(v, a[i + w]);
      out[i] = v;
    }
  return out;
}

function cropToContent(canvas, ctx) {
  const w = canvas.width, h = canvas.height;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
  if (!found) return { canvas, w, h };
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  c.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas: c, w: cw, h: ch };
}

function placeOnCard(src, sw, sh) {
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const pad = 80;
  const k = Math.min((CARD_W - pad * 2) / sw, (CARD_H - pad * 2) / sh);
  const dw = sw * k, dh = sh * k;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(src, (CARD_W - dw) / 2, (CARD_H - dh) / 2, dw, dh);
  ctx.restore();
  return { dataUrl: c.toDataURL('image/jpeg', 0.92), width: CARD_W, height: CARD_H };
}

// Makes every pixel outside the outline (80×100 box, inset 5%) transparent
function clearOutsidePath(d, w, h, pathD, margin = 0.006) {
  const md = softShapeMask(w, h, pathD, margin).getContext('2d').getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) {
    const a = md[i * 4 + 3];
    if (a < 255) d[i * 4 + 3] = Math.min(d[i * 4 + 3], a);
  }
}

// The garment shape as a soft-edged mask (opaque inside, fading out just past the outline).
// The blur comes from halving the mask a few times and doubling it back up, which gives a
// smooth fade on every browser (iPhone Safari has no canvas blur filter).
function softShapeMask(w, h, pathD, margin = 0.006) {
  const full = document.createElement('canvas');
  full.width = w;
  full.height = h;
  const fc = full.getContext('2d');
  const shape = new Path2D();
  shape.addPath(new Path2D(pathD), new DOMMatrix([(w * 0.9) / 80, 0, 0, (h * 0.9) / 100, w * 0.05, h * 0.05]));
  fc.fillStyle = '#000';
  fc.strokeStyle = '#000';
  fc.lineJoin = 'round';
  fc.lineWidth = w * margin * 2; // breathing room around the outline
  fc.fill(shape);
  fc.stroke(shape);

  let cur = full;
  const steps = [];
  for (let i = 0; i < 2; i++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cur.width / 2));
    c.height = Math.max(1, Math.round(cur.height / 2));
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(cur, 0, 0, c.width, c.height);
    steps.push(cur);
    cur = c;
  }
  while (steps.length) {
    const target = steps.pop();
    const c = document.createElement('canvas');
    c.width = target.width;
    c.height = target.height;
    const cc = c.getContext('2d');
    cc.imageSmoothingEnabled = true;
    cc.imageSmoothingQuality = 'high';
    cc.drawImage(cur, 0, 0, c.width, c.height);
    cur = c;
  }
  return cur;
}
