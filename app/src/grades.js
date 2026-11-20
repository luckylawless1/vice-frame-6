// grades.js — VICE FRAME 6 colour grades.
// Each grade is applied to a panel's offscreen canvas. Cheap grades use
// composite overlays; the heavy ones (ink, duotone, newsprint, chrome)
// walk pixels once at a capped resolution.

export const GRADES = [
  { id: 'clean', name: 'Clean' },
  { id: 'vice-sunset', name: 'Vice Sunset' },
  { id: 'neon-night', name: 'Neon Night' },
  { id: 'ink-poster', name: 'Ink Poster' },
  { id: 'duotone-heat', name: 'Duotone Heat' },
  { id: 'split-tone', name: 'Split Tone' },
  { id: 'golden-hour', name: 'Golden Hour' },
  { id: 'newsprint', name: 'Newsprint' },
  { id: 'chrome-84', name: "Chrome '84" },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

function lum(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

function overlay(ctx, w, h, stops, alpha, mode) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, col] of stops) grad.addColorStop(at, col);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode || 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function pixelPass(canvas, fn) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  fn(d, w, h);
  ctx.putImageData(img, 0, 0);
  return ctx;
}

function halftoneDots(ctx, w, h, cell, dark) {
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(10,10,14,0.35)' : 'rgba(255,255,255,0.16)';
  for (let y = cell / 2; y < h; y += cell) {
    for (let x = cell / 2; x < w; x += cell) {
      ctx.beginPath(); ctx.arc(x, y, cell * 0.18, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

const PIXEL_GRADES = {
  'duotone-heat': (d) => {
    // Two-segment ramp: deep teal shadows -> hot pink mids -> cream highs.
    const shadow = [6, 52, 66], mid = [255, 62, 130], high = [255, 233, 168];
    for (let i = 0; i < d.length; i += 4) {
      const t = lum(d[i], d[i + 1], d[i + 2]) / 255;
      const a = t < 0.5 ? shadow : mid;
      const b = t < 0.5 ? mid : high;
      const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      d[i] = a[0] + (b[0] - a[0]) * k;
      d[i + 1] = a[1] + (b[1] - a[1]) * k;
      d[i + 2] = a[2] + (b[2] - a[2]) * k;
    }
  },
  'split-tone': (d) => {
    for (let i = 0; i < d.length; i += 4) {
      const t = lum(d[i], d[i + 1], d[i + 2]) / 255;
      const warm = t * t, cool = (1 - t) * (1 - t);
      d[i] = Math.min(255, d[i] + warm * 42 - cool * 8);
      d[i + 1] = Math.min(255, d[i + 1] + warm * 10 + cool * 14);
      d[i + 2] = Math.min(255, d[i + 2] - warm * 26 + cool * 44);
    }
  },
  'ink-poster': (d, w, h) => {
    // Posterize first, then darken Sobel edges into ink lines.
    const src = new Uint8ClampedArray(d);
    const levels = 5;
    for (let i = 0; i < d.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        d[i + c] = Math.round((src[i + c] / 255) * (levels - 1)) / (levels - 1) * 255;
        d[i + c] = Math.min(255, d[i + c] * 1.12 + 6);
      }
    }
    const gray = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) gray[p] = lum(src[p * 4], src[p * 4 + 1], src[p * 4 + 2]);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx = -gray[(y - 1) * w + x - 1] - 2 * gray[y * w + x - 1] - gray[(y + 1) * w + x - 1]
          + gray[(y - 1) * w + x + 1] + 2 * gray[y * w + x + 1] + gray[(y + 1) * w + x + 1];
        const gy = -gray[(y - 1) * w + x - 1] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + x + 1]
          + gray[(y + 1) * w + x - 1] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + x + 1];
        const edge = Math.min(1, Math.hypot(gx, gy) / 420);
        if (edge > 0.42) {
          const p = (y * w + x) * 4, k = 1 - (edge - 0.42) * 1.5;
          d[p] *= k; d[p + 1] *= k; d[p + 2] *= k;
        }
      }
    }
  },
  'newsprint': (d, w, h) => {
    // Ordered halftone: luminance quantised against a Bayer-ish threshold.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const t = lum(d[i], d[i + 1], d[i + 2]) / 255;
        const th = (((x % 4) * 4 + (y % 4)) / 16 - 0.5) * 0.36;
        const v = Math.max(0, Math.min(1, t + th));
        const ink = Math.round(v * 6) / 6;
        // paper cream to ink black, faint warm duotone
        d[i] = 26 + ink * (238 - 26);
        d[i + 1] = 24 + ink * (228 - 24);
        d[i + 2] = 30 + ink * (198 - 30);
      }
    }
  },
  'chrome-84': (d) => {
    for (let i = 0; i < d.length; i += 4) {
      const t = lum(d[i], d[i + 1], d[i + 2]) / 255;
      // lifted blacks + cyan/magenta split sheen
      d[i] = 22 + d[i] * 0.88 + (t > 0.6 ? (t - 0.6) * 60 : 0);
      d[i + 1] = 20 + d[i + 1] * 0.88 + (t < 0.45 ? (0.45 - t) * 46 : 8);
      d[i + 2] = 30 + d[i + 2] * 0.9 + (t < 0.45 ? (0.45 - t) * 30 : (t - 0.6) * 40);
    }
  },
};

// Applies `gradeId` to an offscreen canvas that already holds the photo.
export function applyGrade(canvas, gradeId) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  if (gradeId === 'clean') {
    ctx.save(); ctx.globalAlpha = 0.08; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.restore();
    return;
  }
  if (gradeId === 'vice-sunset') {
    overlay(ctx, w, h, [[0, '#ff9a3c'], [0.55, '#ff2e88'], [1, '#3b1d6e']], 0.55);
    overlay(ctx, w, h, [[0, '#ffd76e'], [1, '#12002e']], 0.22, 'soft-light');
    return;
  }
  if (gradeId === 'neon-night') {
    ctx.save(); ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#2a1450'; ctx.fillRect(0, 0, w, h); ctx.restore();
    overlay(ctx, w, h, [[0, '#00e5ff'], [0.5, '#ff2e88'], [1, '#12002e']], 0.5);
    return;
  }
  if (gradeId === 'golden-hour') {
    overlay(ctx, w, h, [[0, '#ffcf6e'], [0.6, '#ff8a3c'], [1, '#5e2a10']], 0.42);
    overlay(ctx, w, h, [[0, '#ffffff'], [1, '#ff9a3c']], 0.18, 'soft-light');
    return;
  }
  if (PIXEL_GRADES[gradeId]) {
    pixelPass(canvas, PIXEL_GRADES[gradeId]);
    if (gradeId === 'ink-poster') halftoneDots(canvas.getContext('2d'), w, h, 7, true);
    if (gradeId === 'chrome-84') {
      const c2 = canvas.getContext('2d');
      c2.save(); c2.fillStyle = 'rgba(0,0,0,0.13)';
      for (let y = 0; y < h; y += 4) c2.fillRect(0, y, w, 1);
      c2.restore();
    }
  }
}
