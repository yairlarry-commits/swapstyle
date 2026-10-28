// Dresses SwapStyle's fixed mannequin with a photographed garment.
//
// How it works: the user lines the garment up with a known outline (tee, shirt, dress, pants…),
// so we know where its neckline, shoulders, sleeves, waist and hem are in the photo. Each outline
// has a "rig": pairs of points (spot on the garment outline → spot on the mannequin's body).
// A thin-plate-spline warp bends the photo smoothly so every garment point lands on its body point,
// then the mannequin's light and shadow are laid over the garment so it looks worn, not pasted on.
// Finally the picture is framed per garment type (a top from head to hips, pants from waist to feet),
// the way fashion shops shoot their products. Everything runs in the browser: instant, free, no server.

// The figure is designed in a 400×500 box: a 9-head fashion figure, glossy white finish.
const BOX_W = 400;
const BOX_H = 500;
const K = 5; // render scale for the full scene (2000×2500), then cropped down to the card
export const OUT_W = 800;
export const OUT_H = 1000;

// Outline box used by the camera templates (see garments.js): 80×100, drawn at 90% inside the frame
const T_W = 80;
const T_H = 100;

export const DRESSABLE = ['tshirt', 'shirt', 'dress', 'pants', 'skirt', 'shorts'];

// ---------- Rigs: [templateX, templateY, mannequinX, mannequinY] (right half; mirrored) ----------
const mirror = (pairs) =>
  pairs.flatMap(([tx, ty, mx, my]) =>
    Math.abs(tx - T_W / 2) < 0.01 ? [[tx, ty, mx, my]] : [[tx, ty, mx, my], [T_W - tx, ty, BOX_W - mx, my]]
  );

const RIGS = {
  tshirt: mirror([
    [53, 9, 209, 96], // neck edge
    [40, 15, 200, 104], // neck dip
    [65, 13, 246, 112], // shoulder tip (covers the mannequin's shoulder)
    [64, 34, 236, 136], // armpit
    [79, 37, 254, 160], // sleeve end, outer
    [67, 41, 236, 164], // sleeve end, inner
    [64, 65, 228, 190], // waist side
    [64, 95, 232, 240], // hem corner
    [40, 50, 200, 150], // chest
    [40, 95, 200, 243], // hem centre
  ]),
  shirt: mirror([
    [52, 8, 209, 96],
    [40, 17, 200, 108],
    [64, 12, 246, 112],
    [64, 35, 236, 136],
    [75.5, 43, 253, 187], // elbow, outer
    [66.5, 50, 237, 189], // elbow, inner
    [78, 63, 259, 252], // cuff, outer
    [69, 65, 246, 254], // cuff, inner
    [64, 65, 229, 190],
    [64, 92, 236, 262], // hem below the wrists, like a real shirt
    [40, 50, 200, 150],
    [40, 92, 200, 265],
  ]),
  dress: mirror([
    [51, 5, 222, 101], // strap, outer
    [46, 5, 212, 98], // strap, inner
    [40, 11, 200, 116], // neckline
    [53, 27, 234, 146], // bust side
    [52, 37, 225, 186], // waist
    [67, 91, 252, 350], // hem corner
    [40, 50, 200, 222],
    [40, 95, 200, 354],
  ]),
  skirt: mirror([
    [56, 22, 225, 188], // waist corner
    [40, 22, 200, 189],
    [61.5, 55, 240, 242], // hip side
    [67, 88, 248, 330], // hem corner
    [40, 55, 200, 246],
    [40, 92, 200, 334],
  ]),
  pants: mirror([
    [62, 5, 229, 205], // waist corner
    [40, 5, 200, 206],
    [63, 20, 238, 236], // hip
    [40, 40, 200, 266], // crotch
    [64.5, 50, 226, 362], // knee, outer
    [40.6, 50, 206, 362], // knee, inner
    [67, 92, 216, 470], // hem, outer
    [43, 92, 203, 470], // hem, inner
  ]),
  shorts: mirror([
    [61, 20, 229, 205],
    [40, 20, 200, 206],
    [40, 42, 200, 266],
    [67, 64, 238, 298], // hem, outer
    [43, 64, 204, 298], // hem, inner
    [63, 42, 238, 240], // hip
  ]),
};

// How each garment is framed in the final 4:5 picture: [centreX, centreY, height] in the 400×500 box
const FRAMES = {
  tshirt: [200, 158, 262],
  shirt: [200, 172, 288],
  dress: [200, 210, 370],
  skirt: [200, 262, 252],
  shorts: [200, 252, 238],
  pants: [200, 330, 330],
  none: [200, 250, 480],
};

// ---------- The mannequin ----------
const P = (arr) => arr.map(([x, y]) => ({ x, y }));
const mirrorPts = (arr) => arr.map(({ x, y }) => ({ x: BOX_W - x, y })).reverse();

const TORSO_R = P([
  [208, 70], [209, 91], [216, 98], [228, 102], [237, 106], [242, 113], [241, 124], [235, 134],
  [233, 148], [229, 166], [223, 185], [226, 203], [233, 220], [236, 236], [234, 250], [224, 258], [210, 262],
]);
const TORSO = [...TORSO_R, { x: 200, y: 264 }, ...mirrorPts(TORSO_R)];

const LEG_R = P([
  [229, 230], [236, 244], [236, 264], [233, 292], [228, 330], [224, 356], [224, 374], [226, 396],
  [222, 422], [216, 448], [213, 466], [215, 480], [211, 493], [206, 493], [204, 480],
  [204, 466], [203, 445], [203, 420], [205, 396], [207, 374], [206, 356], [205, 330], [203, 296], [202, 272], [201, 262],
]);

const ARM_R = P([
  [236, 107], [244, 116], [247, 134], [248, 160], [249, 186], [252, 211], [255, 234], [257, 249],
  [259, 258], [260, 271], [256, 282], [251, 284], [248, 276], [248, 261],
  [247, 249], [243, 231], [240, 208], [238, 187], [236, 165], [234, 141],
]);

function smoothClosed(path, p, k) {
  // Catmull-Rom → cubic Bézier, closed
  const n = p.length;
  const at = (i) => p[(i + n) % n];
  path.moveTo(at(0).x * k, at(0).y * k);
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    path.bezierCurveTo(
      (p1.x + (p2.x - p0.x) / 6) * k, (p1.y + (p2.y - p0.y) / 6) * k,
      (p2.x - (p3.x - p1.x) / 6) * k, (p2.y - (p3.y - p1.y) / 6) * k,
      p2.x * k, p2.y * k
    );
  }
  path.closePath();
}

const shape = (points, k) => {
  const p = new Path2D();
  smoothClosed(p, points, k);
  return p;
};

// Body parts with the axis they run along (for the glossy highlight across them)
function bodyParts(k) {
  return [
    { path: shape(LEG_R, k), axis: [219, 240, 209, 470], w: 34 },
    { path: shape(mirrorPts(LEG_R), k), axis: [181, 240, 191, 470], w: 34 },
    { path: shape(ARM_R, k), axis: [241, 110, 254, 270], w: 17 },
    { path: shape(mirrorPts(ARM_R), k), axis: [159, 110, 146, 270], w: 17 },
    { path: shape(TORSO, k), axis: [200, 70, 200, 262], w: 86 },
  ];
}

// Gloss across a limb: light from the upper left, a bright specular line, soft dark edges
function gloss(ctx, part, k, strength = 1) {
  const [x1, y1, x2, y2] = part.axis;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (y2 - y1) / len, ny = -(x2 - x1) / len; // perpendicular
  const h = part.w / 2 + 2;
  const sgn = nx >= 0 ? 1 : -1; // always run left → right on screen
  const g = ctx.createLinearGradient((mx - sgn * nx * h) * k, (my - sgn * ny * h) * k, (mx + sgn * nx * h) * k, (my + sgn * ny * h) * k);
  g.addColorStop(0, `rgba(96,92,88,${0.3 * strength})`);
  g.addColorStop(0.16, `rgba(96,92,88,${0.06 * strength})`);
  g.addColorStop(0.3, `rgba(255,255,255,${0.75 * strength})`);
  g.addColorStop(0.36, `rgba(255,255,255,${0.12 * strength})`);
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.84, `rgba(96,92,88,${0.12 * strength})`);
  g.addColorStop(1, `rgba(96,92,88,${0.36 * strength})`);
  return g;
}

function drawBackdrop(ctx, w, h) {
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, '#f7f5f1');
  wall.addColorStop(1, '#ebe6de');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);
  const spot = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.02, w * 0.5, h * 0.45, w * 0.75);
  spot.addColorStop(0, 'rgba(255,255,255,0.85)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);
}

function drawMannequin(ctx, k) {
  // soft floor shadow under the feet
  ctx.save();
  ctx.translate(200 * k, 492 * k);
  ctx.scale(1, 0.16);
  const fs = ctx.createRadialGradient(0, 0, 2 * k, 0, 0, 44 * k);
  fs.addColorStop(0, 'rgba(40,32,24,0.24)');
  fs.addColorStop(1, 'rgba(40,32,24,0)');
  ctx.fillStyle = fs;
  ctx.fillRect(-46 * k, -46 * k, 92 * k, 92 * k);
  ctx.restore();

  const parts = bodyParts(k);
  const base = ctx.createLinearGradient(0, 30 * k, 0, 495 * k);
  base.addColorStop(0, '#fbfaf8');
  base.addColorStop(1, '#efedea');
  for (const part of parts) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,32,24,0.16)';
    ctx.shadowBlur = 6 * k;
    ctx.shadowOffsetX = 1.5 * k;
    ctx.shadowOffsetY = 2 * k;
    ctx.fillStyle = base;
    ctx.fill(part.path);
    ctx.restore();
    ctx.save();
    ctx.clip(part.path);
    ctx.fillStyle = gloss(ctx, part, k);
    ctx.fillRect(0, 0, BOX_W * k, BOX_H * k);
    ctx.restore();
  }
  // soft contact shadow where the arms meet the torso
  for (const s of [1, -1]) {
    const x = 200 + s * 36;
    const g = ctx.createRadialGradient(x * k, 132 * k, 1 * k, x * k, 132 * k, 9 * k);
    g.addColorStop(0, 'rgba(70,62,54,0.18)');
    g.addColorStop(1, 'rgba(70,62,54,0)');
    ctx.fillStyle = g;
    ctx.fillRect((x - 10) * k, 120 * k, 20 * k, 24 * k);
  }
  // head: a smooth egg, slightly narrower at the chin, glossy
  const head = new Path2D();
  head.moveTo(200 * k, 29 * k);
  head.bezierCurveTo(212 * k, 29 * k, 218 * k, 40 * k, 217 * k, 53 * k);
  head.bezierCurveTo(216 * k, 66 * k, 208 * k, 76 * k, 200 * k, 76 * k);
  head.bezierCurveTo(192 * k, 76 * k, 184 * k, 66 * k, 183 * k, 53 * k);
  head.bezierCurveTo(182 * k, 40 * k, 188 * k, 29 * k, 200 * k, 29 * k);
  ctx.save();
  ctx.shadowColor = 'rgba(40,32,24,0.14)';
  ctx.shadowBlur = 6 * k;
  ctx.shadowOffsetY = 2 * k;
  ctx.fillStyle = base;
  ctx.fill(head);
  ctx.restore();
  ctx.save();
  ctx.clip(head);
  const hs = ctx.createRadialGradient(193 * k, 42 * k, 1 * k, 200 * k, 52 * k, 26 * k);
  hs.addColorStop(0, 'rgba(255,255,255,0.95)');
  hs.addColorStop(0.35, 'rgba(255,255,255,0.15)');
  hs.addColorStop(1, 'rgba(96,92,88,0.32)');
  ctx.fillStyle = hs;
  ctx.fillRect(180 * k, 26 * k, 40 * k, 52 * k);
  ctx.restore();
  // fine joint line at the neck, as on real display mannequins
  ctx.strokeStyle = 'rgba(110,104,98,0.25)';
  ctx.lineWidth = 0.5 * k;
  ctx.beginPath();
  ctx.moveTo(192 * k, 90 * k);
  ctx.quadraticCurveTo(200 * k, 93 * k, 208 * k, 90 * k);
  ctx.stroke();
}

// ---------- Thin-plate spline ----------
function U(r2) {
  return r2 === 0 ? 0 : r2 * Math.log(r2);
}

function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      if (f) for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// Fits a smooth map from `from` points to `to` points (coordinates scaled down for stability)
function fitTPS(from, to, scale) {
  const n = from.length;
  const c = from.map((p) => ({ x: p.x / scale, y: p.y / scale }));
  const A = Array.from({ length: n + 3 }, () => new Array(n + 3).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = c[i].x - c[j].x, dy = c[i].y - c[j].y;
      A[i][j] = U(dx * dx + dy * dy);
    }
    A[i][n] = A[n][i] = 1;
    A[i][n + 1] = A[n + 1][i] = c[i].x;
    A[i][n + 2] = A[n + 2][i] = c[i].y;
  }
  const wx = solve(A, [...to.map((p) => p.x), 0, 0, 0]);
  const wy = solve(A, [...to.map((p) => p.y), 0, 0, 0]);
  return (X, Y) => {
    const x = X / scale, y = Y / scale;
    let fx = wx[n] + wx[n + 1] * x + wx[n + 2] * y;
    let fy = wy[n] + wy[n + 1] * x + wy[n + 2] * y;
    for (let i = 0; i < n; i++) {
      const dx = x - c[i].x, dy = y - c[i].y;
      const u = U(dx * dx + dy * dy);
      fx += wx[i] * u;
      fy += wy[i] * u;
    }
    return [fx, fy];
  };
}

// Warps the garment cut-out (frame coordinates) onto the body; returns a transparent layer
function warpGarment(cutout, template, k) {
  const rig = RIGS[template];
  const sw = cutout.width, sh = cutout.height;
  const src = cutout.getContext('2d').getImageData(0, 0, sw, sh).data;
  const toSrc = ([tx, ty]) => ({ x: (0.05 + (0.9 * tx) / T_W) * sw, y: (0.05 + (0.9 * ty) / T_H) * sh });
  const dstPts = rig.map(([, , mx, my]) => ({ x: mx * k, y: my * k }));
  const srcPts = rig.map(([tx, ty]) => toSrc([tx, ty]));
  const map = fitTPS(dstPts, srcPts, 100 * k);

  const W = BOX_W * k, H = BOX_H * k;
  // generous area around the rig, so frills and flounces beyond the outline come along
  const pad = 46 * k;
  const x0 = Math.max(0, Math.floor(Math.min(...dstPts.map((p) => p.x)) - pad));
  const x1 = Math.min(W - 1, Math.ceil(Math.max(...dstPts.map((p) => p.x)) + pad));
  const y0 = Math.max(0, Math.floor(Math.min(...dstPts.map((p) => p.y)) - pad));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(...dstPts.map((p) => p.y)) + pad));

  // evaluate the map on a coarse grid, interpolate in between (fast on phones)
  const STEP = 6;
  const gw = Math.ceil((x1 - x0) / STEP) + 2, gh = Math.ceil((y1 - y0) / STEP) + 2;
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++)
    for (let i = 0; i < gw; i++) {
      const [sx, sy] = map(x0 + i * STEP, y0 + j * STEP);
      gx[j * gw + i] = sx;
      gy[j * gw + i] = sy;
    }

  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d');
  const img = octx.createImageData(bw, bh);
  const o = img.data;
  for (let y = y0; y <= y1; y++) {
    const fj = (y - y0) / STEP, j = Math.floor(fj), tj = fj - j;
    for (let x = x0; x <= x1; x++) {
      const fi = (x - x0) / STEP, i = Math.floor(fi), ti = fi - i;
      const a = j * gw + i;
      const sx = (gx[a] * (1 - ti) + gx[a + 1] * ti) * (1 - tj) + (gx[a + gw] * (1 - ti) + gx[a + gw + 1] * ti) * tj;
      const sy = (gy[a] * (1 - ti) + gy[a + 1] * ti) * (1 - tj) + (gy[a + gw] * (1 - ti) + gy[a + gw + 1] * ti) * tj;
      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) continue;
      const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy;
      const p00 = (iy * sw + ix) * 4, p10 = p00 + 4, p01 = p00 + sw * 4, p11 = p01 + 4;
      const w00 = (1 - fx) * (1 - fy) * src[p00 + 3], w10 = fx * (1 - fy) * src[p10 + 3];
      const w01 = (1 - fx) * fy * src[p01 + 3], w11 = fx * fy * src[p11 + 3];
      const wa = w00 + w10 + w01 + w11;
      // near-transparent leftovers from the background removal would glow under the shading: drop them
      if (wa < 60) continue;
      const q = ((y - y0) * bw + (x - x0)) * 4;
      o[q] = (src[p00] * w00 + src[p10] * w10 + src[p01] * w01 + src[p11] * w11) / wa;
      o[q + 1] = (src[p00 + 1] * w00 + src[p10 + 1] * w10 + src[p01 + 1] * w01 + src[p11 + 1] * w11) / wa;
      o[q + 2] = (src[p00 + 2] * w00 + src[p10 + 2] * w10 + src[p01 + 2] * w01 + src[p11 + 2] * w11) / wa;
      o[q + 3] = Math.min(255, ((wa - 60) * 255) / 150); // crisp but still anti-aliased edge
    }
  }
  octx.putImageData(img, x0, y0);
  return out;
}

// Gives the garment the body's volume: shade toward the sides, soft folds, light on the chest
function shadeGarment(layer, template, k) {
  const g = layer.getContext('2d');
  const W = layer.width, H = layer.height;
  g.save();
  g.globalCompositeOperation = 'source-atop';
  const across = g.createLinearGradient(150 * k, 0, 250 * k, 0);
  across.addColorStop(0, 'rgba(40,32,24,0.26)');
  across.addColorStop(0.22, 'rgba(40,32,24,0.04)');
  across.addColorStop(0.4, 'rgba(255,255,255,0.08)');
  across.addColorStop(0.7, 'rgba(40,32,24,0.03)');
  across.addColorStop(1, 'rgba(40,32,24,0.30)');
  g.fillStyle = across;
  g.fillRect(0, 0, W, H);
  // sleeves and trouser legs: shade along each limb
  for (const part of bodyParts(k).slice(0, 4)) {
    g.save();
    g.clip(part.path);
    g.fillStyle = gloss(g, part, k, 0.45);
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (['tshirt', 'shirt', 'dress'].includes(template)) {
    const chest = g.createRadialGradient(192 * k, 138 * k, 2 * k, 197 * k, 148 * k, 40 * k);
    chest.addColorStop(0, 'rgba(255,255,255,0.16)');
    chest.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = chest;
    g.fillRect(0, 0, W, H);
    // gentle drape folds from the bust down
    const bottom = template === 'dress' ? 350 : template === 'shirt' ? 262 : 240;
    for (const [x, w] of [[186, 4], [214, 4], [200, 3]]) {
      const f = g.createLinearGradient((x - w) * k, 0, (x + w) * k, 0);
      f.addColorStop(0, 'rgba(40,32,24,0)');
      f.addColorStop(0.5, 'rgba(40,32,24,0.08)');
      f.addColorStop(1, 'rgba(40,32,24,0)');
      g.fillStyle = f;
      g.fillRect((x - w) * k, 168 * k, 2 * w * k, (bottom - 168) * k);
    }
  }
  if (['pants', 'shorts', 'skirt'].includes(template)) {
    const top = template === 'skirt' ? 188 : 205;
    const wb = g.createLinearGradient(0, top * k, 0, (top + 14) * k);
    wb.addColorStop(0, 'rgba(40,32,24,0.12)');
    wb.addColorStop(1, 'rgba(40,32,24,0)');
    g.fillStyle = wb;
    g.fillRect(0, top * k, W, 14 * k);
  }
  g.restore();
}

/**
 * @param cutout   canvas with the garment on transparency, in photo-frame coordinates
 * @param template one of DRESSABLE
 * @returns JPEG data URL, 800×1000, framed for that kind of garment
 */
export function dressMannequin(cutout, template) {
  const k = K;
  const scene = document.createElement('canvas');
  scene.width = BOX_W * k;
  scene.height = BOX_H * k;
  const sctx = scene.getContext('2d');
  drawMannequin(sctx, k);
  if (RIGS[template]) {
    const layer = warpGarment(cutout, template, k);
    shadeGarment(layer, template, k);
    sctx.save();
    sctx.shadowColor = 'rgba(40,32,24,0.24)';
    sctx.shadowBlur = 5 * k;
    sctx.shadowOffsetX = 1 * k;
    sctx.shadowOffsetY = 2 * k;
    sctx.drawImage(layer, 0, 0);
    sctx.restore();
  }

  // frame it like a product shot
  const [cx, cy, fh] = FRAMES[RIGS[template] ? template : 'none'];
  const fw = fh * (OUT_W / OUT_H);
  const out = document.createElement('canvas');
  out.width = OUT_W;
  out.height = OUT_H;
  const ctx = out.getContext('2d');
  drawBackdrop(ctx, OUT_W, OUT_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scene, (cx - fw / 2) * k, (cy - fh / 2) * k, fw * k, fh * k, 0, 0, OUT_W, OUT_H);
  return out.toDataURL('image/jpeg', 0.92);
}

// The bare mannequin, whole figure (for previews)
export function mannequinPreview() {
  return dressMannequin(document.createElement('canvas'), 'none');
}
