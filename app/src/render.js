// render.js — VICE FRAME 6 cover painter.
// Draws the whole cover onto any 2D context at any pixel size: graded
// photo panels, masthead, wanted stars, tagline, caption bar, role-tag
// chips, scene captions, billing block, barcode, seal and stickers.

import { applyGrade } from './grades.js';

// Small deterministic PRNG (mulberry32) so barcode + grain never change
// between renders of the same cover.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gradeCache = new Map();

function gradedPanelCanvas(img, pw, ph, gradeId) {
  const key = `${img.src}|${pw}x${ph}|${gradeId}`;
  if (gradeCache.has(key)) return gradeCache.get(key);
  const cap = 560;
  const scale = Math.min(1, cap / Math.max(pw, ph));
  const cw = Math.max(2, Math.round(pw * scale));
  const ch = Math.max(2, Math.round(ph * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const cx = c.getContext('2d');
  cx.drawImage(img, 0, 0, cw, ch);
  applyGrade(c, gradeId);
  if (gradeCache.size > 40) gradeCache.clear();
  gradeCache.set(key, c);
  return c;
}

function drawPanelPhoto(ctx, panel, frame, img, W, H) {
  const px = panel.x * W, py = panel.y * H, pw = panel.w * W, ph = panel.h * H;
  ctx.save();
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([nx, ny], i) => {
      const X = nx * W, Y = ny * H;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
  } else {
    ctx.rect(px, py, pw, ph);
  }
  ctx.clip();
  if (!img || !img.complete || !img.naturalWidth) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#233'); g.addColorStop(1, '#512');
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    return { px, py, pw, ph };
  }
  // Cover-fit with per-panel pan + zoom.
  const zoom = frame.zoom || 1;
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  const dw = img.naturalWidth * base * zoom, dh = img.naturalHeight * base * zoom;
  const cxp = px + pw / 2 + (frame.panX || 0) * pw;
  const cyp = py + ph / 2 + (frame.panY || 0) * ph;
  const graded = gradedPanelCanvas(img, Math.round(pw), Math.round(ph), frame.grade || 'clean');
  ctx.drawImage(graded, cxp - dw / 2, cyp - dh / 2, dw, dh);
  ctx.restore();
  // Panel keyline.
  ctx.save();
  ctx.strokeStyle = 'rgba(8,6,14,0.9)';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  ctx.restore();
  return { px, py, pw, ph };
}

function star(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const X = cx + Math.cos(a) * rad, Y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,0,0.85)'; ctx.lineWidth = r * 0.09; ctx.stroke();
}

function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function drawMasthead(ctx, state, W, H) {
  const title = (state.title || '').trim() || 'VICE FRAME';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  let size = H * 0.115;
  let lines = [];
  let lineHeight = 0;
  for (; size > H * 0.03; size *= 0.94) {
    ctx.font = `${size}px Anton, sans-serif`;
    lines = wrapTitle(ctx, title.toUpperCase(), W * 0.92);
    lineHeight = size * 1.04;
    if (lines.length * lineHeight <= H * 0.30) break;
  }
  const grad = ctx.createLinearGradient(0, 0, W, lineHeight * lines.length);
  grad.addColorStop(0, '#ff2e88'); grad.addColorStop(0.5, '#8a2be2'); grad.addColorStop(1, '#00d8c8');
  let y = H * 0.028;
  ctx.lineJoin = 'round';
  for (const line of lines) {
    ctx.strokeStyle = '#0b0616'; ctx.lineWidth = size * 0.16;
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = grad;
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }
  const titleBottom = y;
  // Wanted stars: laid out from the measured bottom edge of the title.
  const starR = H * 0.021, gap = starR * 2.7;
  const totalW = gap * 4 + starR * 2;
  let sx = W / 2 - totalW / 2 + starR;
  const sy = titleBottom + starR * 1.15;
  for (let i = 0; i < 5; i++) { star(ctx, sx, sy, starR, '#ffc21f'); sx += gap; }
  // Tagline under the stars, neon glow + slight shear.
  const tag = (state.tagline || '').trim();
  let bottom = sy + starR * 1.3;
  if (tag) {
    ctx.font = `${H * 0.032}px Anton, sans-serif`;
    ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = H * 0.02;
    ctx.fillStyle = '#ffd7ef';
    ctx.transform(1, 0, -0.08, 1, 0, 0);
    ctx.fillText(tag.toUpperCase(), (W / 2) / 1 + H * 0.01, bottom);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;
    bottom += H * 0.045;
  }
  ctx.restore();
  return bottom;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoleChip(ctx, text, px, py, W, H) {
  if (!text || !text.trim()) return;
  ctx.save();
  const fs = Math.max(11, H * 0.02);
  ctx.font = `${fs}px "Archivo Black", sans-serif`;
  const tw = ctx.measureText(text.trim().toUpperCase()).width;
  const cw = tw + fs * 1.1, ch = fs * 1.7;
  ctx.translate(px + cw / 2, py + ch / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#0d0a18';
  roundRect(ctx, -cw / 2, -ch / 2, cw, ch, ch * 0.3); ctx.fill();
  ctx.strokeStyle = '#ffc21f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text.trim().toUpperCase(), 0, 1);
  ctx.restore();
}

function drawSceneCaption(ctx, text, num, px, py, pw, ph, H) {
  const label = `SCENE ${num + 1} — ${(text || '').trim().toUpperCase()}`;
  ctx.save();
  const barH = Math.max(20, H * 0.038);
  ctx.fillStyle = 'rgba(8,6,16,0.88)';
  ctx.fillRect(px, py + ph - barH, pw, barH);
  ctx.fillStyle = '#00e5c8';
  ctx.fillRect(px, py + ph - barH, pw, 3);
  ctx.font = `${Math.max(10, H * 0.02)}px "Archivo Black", sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // shrink to fit narrow storyboard panels
  let fs = Math.max(10, H * 0.02);
  while (ctx.measureText(label).width > pw * 0.94 && fs > 8) {
    fs -= 1; ctx.font = `${fs}px "Archivo Black", sans-serif`;
  }
  ctx.fillText(label, px + pw / 2, py + ph - barH / 2 + 1);
  ctx.restore();
}

function drawPalm(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#19f2c8'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.shadowColor = '#19f2c8'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(6, 10, 2, -34); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -0.4 - i * 0.42;
    ctx.beginPath(); ctx.moveTo(2, -34);
    ctx.quadraticCurveTo(2 + Math.cos(a) * 30, -34 + Math.sin(a) * 26 - 12, 2 + Math.cos(a) * 52, -34 + Math.sin(a) * 44 + 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBurst(ctx, x, y, s, label) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.18);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? s : s * 0.72;
    const a = (i * Math.PI) / spikes;
    const X = Math.cos(a) * r, Y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ff2e63'; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${s * 0.52}px "Archivo Black", sans-serif`;
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawSunBadge(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -s, 0, s);
  g.addColorStop(0, '#ffd76e'); g.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(20,8,30,0.85)';
  for (let i = 0; i < 3; i++) ctx.fillRect(-s, -s * 0.1 + i * s * 0.34, s * 2, s * 0.13);
  ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawSeal(ctx, x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(13,10,24,0.88)'; ctx.fill();
  ctx.strokeStyle = '#ffc21f'; ctx.lineWidth = Math.max(2, r * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,194,31,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  star(ctx, 0, r * 0.1, r * 0.3, '#ffc21f');
  const ring = 'LAS LUMEN · COVER OF THE MONTH · ';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `${r * 0.17}px "Archivo Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = ring.split('');
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h, seed) {
  const rnd = seededRandom(seed);
  ctx.save();
  ctx.fillStyle = '#f4f1e8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#111';
  let bx = x + w * 0.07;
  while (bx < x + w * 0.9) {
    const bw = 1 + rnd() * 3.4;
    if (rnd() > 0.42) ctx.fillRect(bx, y + h * 0.1, bw, h * 0.66);
    bx += bw + 1 + rnd() * 2.6;
  }
  ctx.font = `${h * 0.17}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('9 771234 560068', x + w / 2, y + h * 0.93);
  ctx.restore();
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const cx = c.getContext('2d');
  const img = cx.createImageData(128, 128);
  const rnd = seededRandom(20260606);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

// Main entry: paint the full cover described by `state`.
export function drawCover(ctx, W, H, state, images) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d0a18'; ctx.fillRect(0, 0, W, H);
  const layout = state.layoutDef;
  const panels = layout.make();
  panels.forEach((panel, i) => {
    const frame = state.panels[i] || {};
    const img = images[frame.imgIndex ?? i % Math.max(1, images.length)];
    const box = drawPanelPhoto(ctx, panel, frame, img, W, H);
    if (state.layoutId === 'storyboard') {
      drawSceneCaption(ctx, frame.scene || '', i, box.px, box.py, box.pw, box.ph, H);
    } else if (!panel.hero) {
      drawRoleChip(ctx, frame.role || '', box.px + W * 0.012, box.py + H * 0.012, W, H);
    }
    if (state.selected === i && state.showSelection) {
      ctx.save();
      ctx.strokeStyle = '#00e5c8'; ctx.lineWidth = 4; ctx.setLineDash([14, 8]);
      ctx.strokeRect(box.px + 3, box.py + 3, box.pw - 6, box.ph - 6);
      ctx.restore();
    }
  });

  drawMasthead(ctx, state, W, H);

  // Dressing stickers, always inset so nothing clips off-canvas.
  // The palm path is drawn in a ~94-unit tall space, so its scale is
  // tied to the cover height: about 17% of H tall in total.
  const m = Math.min(W, H);
  if (state.stickers.palm) drawPalm(ctx, W * 0.135, H * 0.42, H * 0.0018);
  if (state.stickers.sun) drawSunBadge(ctx, W * 0.925, H * 0.335, m * 0.052);
  if (state.stickers.burst) drawBurst(ctx, W * 0.90, H * 0.115, m * 0.062, 'NEW!');

  // Billing block: tiny condensed credits line above the caption bar.
  // Storyboard covers skip the billing/editorial/barcode/caption stack:
  // their per-panel scene captions already carry the bottom of the cover,
  // and stacking both would bury the scene lines.
  const isStoryboard = state.layoutId === 'storyboard';
  const billing = (state.billing || '').trim();
  if (billing && !isStoryboard) {
    ctx.save();
    ctx.font = `${Math.max(9, H * 0.016)}px Anton, sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    let text = billing.toUpperCase();
    while (ctx.measureText(text).width > W * 0.94 && text.length > 4) text = text.slice(0, -2);
    ctx.fillText(text, W / 2, H * 0.845);
    ctx.restore();
  }

  // Editorial line + barcode, bottom-right above the caption bar.
  if (!isStoryboard) {
    ctx.save();
    ctx.font = `${Math.max(10, H * 0.017)}px "Archivo Black", sans-serif`;
    ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'right';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText('ISSUE 06 · LAS LUMEN · $6.99', W * 0.975, H * 0.878);
    ctx.restore();
    drawBarcode(ctx, W * 0.845, H * 0.888, W * 0.13, H * 0.038, 60606);
  }
  if (state.stickers.seal) drawSeal(ctx, W * 0.075, H * 0.885, m * 0.058);

  // Caption bar near the bottom with a pink-to-teal accent strip.
  const cap = (state.caption || '').trim();
  if (cap && !isStoryboard) {
    const barW = W * 0.86, barH = H * 0.062, barX = (W - barW) / 2, barY = H * 0.918;
    ctx.save();
    ctx.fillStyle = 'rgba(10,7,20,0.92)';
    roundRect(ctx, barX, barY, barW, barH, barH * 0.32); ctx.fill();
    const strip = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    strip.addColorStop(0, '#ff2e88'); strip.addColorStop(1, '#00d8c8');
    ctx.fillStyle = strip;
    roundRect(ctx, barX, barY, barW, barH * 0.14, barH * 0.07); ctx.fill();
    ctx.font = `${barH * 0.42}px "Archivo Black", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    let text = cap.toUpperCase();
    while (ctx.measureText(text).width > barW * 0.92 && text.length > 4) text = text.slice(0, -2);
    ctx.fillText(text, W / 2, barY + barH * 0.58);
    ctx.restore();
  }

  if (state.stickers.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay';
    const tile = getGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

export function panelAt(layoutDef, W, H, x, y) {
  const panels = layoutDef.make();
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x * W && x <= (p.x + p.w) * W && y >= p.y * H && y <= (p.y + p.h) * H) return i;
  }
  return -1;
}
