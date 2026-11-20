// main.js — VICE FRAME 6 editor wiring.
// Owns the cover state, loads the bundled sample photos, connects every
// control in the sidebar to the renderer, and handles the ?shot= scenes
// used for the entry screenshots.

import { LAYOUTS, layoutById, DEFAULT_ROLES, DEFAULT_SCENES } from './layouts.js';
import { GRADES } from './grades.js';
import { drawCover, panelAt } from './render.js';

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const SAMPLE_FILES = [
  'neon-marina.jpg', 'ocean-drive-sunset.jpg', 'casino-strip-night.jpg',
  'rooftop-crew.jpg', 'retro-diner-night.jpg', 'harbor-yacht-golden.jpg',
  'beach-duo-palms.jpg', 'pier-fisher-dawn.jpg', 'boardwalk-pastel-suit.jpg',
];

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

export const state = {
  layoutId: 'cover-star',
  layoutDef: layoutById('cover-star'),
  sizeId: 'square',
  title: 'VICE FRAME',
  tagline: 'Six stars over Las Lumen',
  caption: 'Sunset Heist',
  billing: 'Las Lumen Pictures presents a Vice Frame production — starring The Driver · The Fixer · The Siren',
  selected: 0,
  showSelection: true,
  panels: [],
  stickers: { palm: true, burst: true, sun: true, seal: true, grain: true },
};

const images = []; // HTMLImageElement list: samples first, then uploads.

function freshPanels(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      imgIndex: i % Math.max(1, images.length || 1),
      panX: 0, panY: 0, zoom: 1,
      grade: 'vice-sunset',
      role: DEFAULT_ROLES[i % DEFAULT_ROLES.length],
      scene: DEFAULT_SCENES[i % DEFAULT_SCENES.length],
    });
  }
  return out;
}

function syncPanelCount() {
  const count = state.layoutDef.make().length;
  while (state.panels.length < count) {
    const i = state.panels.length;
    state.panels.push({
      imgIndex: i % Math.max(1, images.length || 1),
      panX: 0, panY: 0, zoom: 1, grade: 'vice-sunset',
      role: DEFAULT_ROLES[i % DEFAULT_ROLES.length],
      scene: DEFAULT_SCENES[i % DEFAULT_SCENES.length],
    });
  }
  if (state.selected >= count) state.selected = 0;
}

export function render() {
  syncPanelCount();
  const size = SIZES[state.sizeId];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w; canvas.height = size.h;
  }
  drawCover(ctx, size.w, size.h, state, images);
  refreshControlStates();
}

// ---------- sidebar construction ----------
const thumbsEl = document.getElementById('thumbs');

function refreshThumbs() {
  thumbsEl.innerHTML = '';
  images.forEach((img, i) => {
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = `photo ${i + 1}`;
    el.title = 'Put this photo in the selected panel';
    if (state.panels.some((p) => p.imgIndex === i)) el.className = 'in-use';
    el.addEventListener('click', () => {
      state.panels[state.selected].imgIndex = i;
      render();
    });
    thumbsEl.appendChild(el);
  });
}

function buttonGrid(el, items, getActive, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.textContent = item.name || item.label;
    b.dataset.id = item.id;
    if (getActive(item)) b.classList.add('active');
    b.addEventListener('click', () => onPick(item));
    el.appendChild(b);
  }
}

function refreshControlStates() {
  buttonGrid(document.getElementById('layout-list'), LAYOUTS,
    (l) => l.id === state.layoutId,
    (l) => { state.layoutId = l.id; state.layoutDef = l; state.selected = 0; syncPanelFields(); render(); });
  buttonGrid(document.getElementById('grade-list'), GRADES,
    (g) => (state.panels[state.selected]?.grade || 'clean') === g.id,
    (g) => { state.panels[state.selected].grade = g.id; render(); });
  document.querySelectorAll('#size-list button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.sizeId);
  });
  const frame = state.panels[state.selected];
  if (frame) document.getElementById('in-zoom').value = String(frame.zoom);
  refreshThumbs();
}

function syncPanelFields() {
  const frame = state.panels[state.selected];
  if (!frame) return;
  document.getElementById('in-role').value = frame.role || '';
  document.getElementById('in-scene').value = frame.scene || '';
  document.getElementById('in-zoom').value = String(frame.zoom || 1);
}

// ---------- control events ----------
for (const [id, key] of [['in-title', 'title'], ['in-tagline', 'tagline'], ['in-caption', 'caption'], ['in-billing', 'billing']]) {
  document.getElementById(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
}
document.getElementById('in-role').addEventListener('input', (e) => {
  state.panels[state.selected].role = e.target.value; render();
});
document.getElementById('in-scene').addEventListener('input', (e) => {
  state.panels[state.selected].scene = e.target.value; render();
});
document.getElementById('in-zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value); render();
});
document.getElementById('reset-frame').addEventListener('click', () => {
  const f = state.panels[state.selected];
  f.panX = 0; f.panY = 0; f.zoom = 1; render();
});
document.getElementById('grade-all').addEventListener('click', () => {
  const g = state.panels[state.selected].grade;
  state.panels.forEach((p) => { p.grade = g; });
  render();
});
document.querySelectorAll('#size-list button').forEach((b) => {
  b.addEventListener('click', () => { state.sizeId = b.dataset.size; render(); });
});
for (const [id, key] of [['ck-palm', 'palm'], ['ck-burst', 'burst'], ['ck-sun', 'sun'], ['ck-seal', 'seal'], ['ck-grain', 'grain']]) {
  document.getElementById(id).addEventListener('change', (e) => { state.stickers[key] = e.target.checked; render(); });
}

// ---------- photo intake ----------
function addImage(img) {
  images.push(img);
  refreshThumbs();
  render();
}

function loadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => addImage(img);
    img.src = url;
  }
}

document.getElementById('file-input').addEventListener('change', (e) => loadFiles(e.target.files));
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => { e.preventDefault(); loadFiles(e.dataTransfer.files); });

// ---------- canvas framing gestures ----------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.layoutDef, canvas.width, canvas.height, p.x, p.y);
  if (hit >= 0 && hit !== state.selected) { state.selected = hit; syncPanelFields(); }
  drag = { x: p.x, y: p.y };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const f = state.panels[state.selected];
  f.panX += (p.x - drag.x) / (state.layoutDef.make()[state.selected].w * canvas.width);
  f.panY += (p.y - drag.y) / (state.layoutDef.make()[state.selected].h * canvas.height);
  drag = p;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const f = state.panels[state.selected];
  f.zoom = Math.min(3, Math.max(1, f.zoom * (e.deltaY < 0 ? 1.06 : 0.94)));
  render();
}, { passive: false });
canvas.addEventListener('dblclick', () => {
  const f = state.panels[state.selected];
  f.panX = 0; f.panY = 0; f.zoom = 1; render();
});
window.addEventListener('keydown', (e) => {
  const step = (e.shiftKey ? 0.05 : 0.012);
  const f = state.panels[state.selected];
  if (!f) return;
  if (e.key === 'ArrowLeft') { f.panX -= step; render(); }
  if (e.key === 'ArrowRight') { f.panX += step; render(); }
  if (e.key === 'ArrowUp') { f.panY -= step; render(); }
  if (e.key === 'ArrowDown') { f.panY += step; render(); }
});

// ---------- export ----------
function exportPng(sizeId) {
  const size = SIZES[sizeId];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  const prev = state.showSelection;
  state.showSelection = false;
  drawCover(off.getContext('2d'), size.w, size.h, state, images);
  state.showSelection = prev;
  const a = document.createElement('a');
  a.download = `vice-frame-6-${sizeId}-${size.w}x${size.h}.png`;
  a.href = off.toDataURL('image/png');
  a.click();
}
document.getElementById('export-one').addEventListener('click', () => exportPng(state.sizeId));
document.getElementById('export-all').addEventListener('click', () => {
  exportPng('square'); exportPng('portrait'); exportPng('landscape');
});

// ---------- query-param scenes (screenshots) ----------
function applyParams() {
  if (params.get('layout')) {
    state.layoutId = params.get('layout');
    state.layoutDef = layoutById(state.layoutId);
  }
  if (params.get('size') && SIZES[params.get('size')]) state.sizeId = params.get('size');
  if (params.get('title')) { state.title = params.get('title'); document.getElementById('in-title').value = state.title; }
  if (params.get('tagline')) { state.tagline = params.get('tagline'); document.getElementById('in-tagline').value = state.tagline; }
  if (params.get('caption')) { state.caption = params.get('caption'); document.getElementById('in-caption').value = state.caption; }
  if (params.get('billing')) { state.billing = params.get('billing'); document.getElementById('in-billing').value = state.billing; }
  const grade = params.get('grade');
  const photo = params.get('photo');
  syncPanelCount();
  state.panels.forEach((p, i) => {
    if (grade) p.grade = grade;
    if (photo) {
      const idx = SAMPLE_FILES.findIndex((f) => f.replace('.jpg', '') === photo || f === photo);
      if (idx >= 0) p.imgIndex = idx;
    }
    const list = params.get('photos');
    if (list) {
      const names = list.split(',');
      const idx = SAMPLE_FILES.findIndex((f) => f.replace('.jpg', '') === (names[i] || ''));
      if (idx >= 0) p.imgIndex = idx;
    }
  });
  const shot = params.get('shot');
  if (shot === 'cover') { document.body.classList.add('shot-cover'); state.showSelection = false; }
  if (shot === 'editor') document.body.classList.add('shot-editor');
}

// ---------- boot ----------
async function boot() {
  await document.fonts.ready;
  const loads = SAMPLE_FILES.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `samples/${name}`;
  }));
  for (const img of await Promise.all(loads)) if (img) images.push(img);
  state.panels = freshPanels(state.layoutDef.make().length);
  applyParams();
  syncPanelFields();
  render();
  document.body.dataset.ready = '1';
}
boot();
