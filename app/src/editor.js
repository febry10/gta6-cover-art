// The Vice Panels editor: wires the page to the cover renderer. Photos load from the visitor's own files (or
// the bundled samples) and live only in this page; panels are selected by clicking the cover, cropped by
// dragging and the zoom slider, and swapped from the panel editor. A `?shot=` query loads a fixed scene from
// ./shot-scenes.js instead, for screenshots.

import { getPanelLayout, panelBounds, pointInPanel } from './panel-layouts.js';
import { createPanelCrop, renderCoverArt } from './cover-renderer.js';
import { parseShotScene, sampleDisplayName } from './shot-scenes.js';

const canvas = document.getElementById('cover-canvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const photoStrip = document.getElementById('photo-strip');
const zoomSlider = document.getElementById('panel-zoom');
const selectedLabel = document.getElementById('selected-panel-label');
const selectedPhotoName = document.getElementById('selected-panel-photo');

const photos = [];
const photosById = new Map();
let nextPhotoNumber = 1;
let brushPhotoId = null;
let selectedPanel = 0;
let shotMode = null;

const state = {
  layoutId: 'poster5',
  gradeId: 'leonida',
  overlays: { palms: true, skyline: true, sun: true, birds: false },
  kicker: 'WELCOME TO',
  title: 'VICE CITY',
  badge: 'VI',
  panels: [],
};

/** Loads an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Keeps the panel crop list the same length as the current layout's panel count. */
function syncPanelsToLayout() {
  const count = getPanelLayout(state.layoutId).panels.length;
  while (state.panels.length < count) state.panels.push(createPanelCrop());
  if (selectedPanel >= count) selectedPanel = 0;
}

let renderQueued = false;
/** Schedules a preview render on the next frame, coalescing bursts from sliders and drags. */
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

/** Renders the live preview, with the selected panel outlined (never in cover-shot mode). */
function renderPreview() {
  renderCoverArt(ctx, canvas.width, canvas.height, state, photosById, {
    highlightIndex: shotMode === 'cover' ? -1 : selectedPanel,
  });
  updatePanelEditor();
}

/** Renders the cover with no editor markings and downloads it as a PNG at the chosen size. */
function exportPng() {
  renderCoverArt(ctx, canvas.width, canvas.height, state, photosById, { highlightIndex: -1 });
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-cover-${canvas.width}x${canvas.height}.png`;
    a.click();
    status.textContent = `Saved vice-panels-cover-${canvas.width}x${canvas.height}.png`;
    requestRender();
  }, 'image/png');
}

/** Refreshes the panel editor strip: which panel is selected, what fills it, and its zoom. */
function updatePanelEditor() {
  const crop = state.panels[selectedPanel];
  selectedLabel.textContent = `Panel ${selectedPanel + 1} of ${state.panels.length}`;
  const photo = crop?.photoId ? photos.find((p) => p.id === crop.photoId) : null;
  selectedPhotoName.textContent = photo ? photo.name : 'Empty — shows the drawn sunset scene';
  if (crop && document.activeElement !== zoomSlider) zoomSlider.value = String(crop.zoom);
}

/** Registers a loaded image as a usable photo and offers it to the first empty panel. */
function registerPhoto(name, img, sampleName = null) {
  const existing = sampleName ? photos.find((p) => p.sampleName === sampleName) : null;
  if (existing) { brushPhotoId = existing.id; markBrushThumb(); return existing; }
  const photo = { id: `photo-${nextPhotoNumber++}`, name, img, sampleName };
  photos.push(photo);
  photosById.set(photo.id, img);
  const thumb = document.createElement('button');
  thumb.type = 'button';
  thumb.className = 'photo-thumb';
  thumb.title = `${name} — click to pick it up, then click a panel to place it`;
  thumb.dataset.photoId = photo.id;
  const thumbImg = document.createElement('img');
  thumbImg.src = img.src;
  thumbImg.alt = name;
  thumb.append(thumbImg);
  thumb.addEventListener('click', () => {
    brushPhotoId = photo.id;
    markBrushThumb();
    status.textContent = `Picked up “${name}” — now click a panel on the cover to place it.`;
  });
  photoStrip.append(thumb);
  const empty = state.panels.findIndex((crop) => !crop.photoId);
  if (empty >= 0) {
    state.panels[empty].photoId = photo.id;
    if (brushPhotoId === null) { brushPhotoId = photo.id; markBrushThumb(); }
  }
  requestRender();
  return photo;
}

function markBrushThumb() {
  photoStrip.querySelectorAll('.photo-thumb').forEach((thumb) => {
    thumb.classList.toggle('is-brush', thumb.dataset.photoId === brushPhotoId);
  });
}

/** Loads one of the bundled sample photos by name (samples/<name>.jpg). */
async function addSamplePhoto(sampleName, displayName) {
  const img = await loadImage(`samples/${sampleName}.jpg`);
  return registerPhoto(displayName, img, sampleName);
}

/** Cycles the loaded photos across every panel, in order. */
function fillEveryPanel() {
  if (!photos.length) { status.textContent = 'Add a photo first — or start with a sample.'; return; }
  state.panels.forEach((crop, index) => { crop.photoId = photos[index % photos.length].id; });
  requestRender();
}

/** The pixel metrics of the selected panel's photo, for turning drag distance into pan. */
function selectedPhotoMetrics() {
  const crop = state.panels[selectedPanel];
  if (!crop?.photoId) return null;
  const img = photosById.get(crop.photoId);
  const layout = getPanelLayout(state.layoutId);
  const bounds = panelBounds(layout.panels[selectedPanel]);
  const bw = bounds.width * canvas.width;
  const bh = bounds.height * canvas.height;
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * crop.zoom;
  return { crop, overflowX: img.naturalWidth * scale - bw, overflowY: img.naturalHeight * scale - bh };
}

function clampCrop(crop) {
  crop.zoom = Math.min(3, Math.max(1, crop.zoom));
  crop.panX = Math.min(1, Math.max(-1, crop.panX));
  crop.panY = Math.min(1, Math.max(-1, crop.panY));
}

/* ---- canvas interaction: select, assign, drag to pan, wheel to zoom ---- */

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const layout = getPanelLayout(state.layoutId);
  const hit = layout.panels.findIndex((polygon) => pointInPanel(polygon, x, y));
  if (hit < 0) return;
  selectedPanel = hit;
  if (brushPhotoId && state.panels[hit].photoId !== brushPhotoId) {
    state.panels[hit].photoId = brushPhotoId;
    status.textContent = `Placed the photo in Panel ${hit + 1}. Drag to pan it, or pick another panel.`;
  }
  drag = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  requestRender();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const metrics = selectedPhotoMetrics();
  if (!metrics) { drag = { x: event.clientX, y: event.clientY }; return; }
  const rect = canvas.getBoundingClientRect();
  const dx = (event.clientX - drag.x) * (canvas.width / rect.width);
  const dy = (event.clientY - drag.y) * (canvas.height / rect.height);
  if (metrics.overflowX > 0) metrics.crop.panX += (dx / (metrics.overflowX / 2));
  if (metrics.overflowY > 0) metrics.crop.panY += (dy / (metrics.overflowY / 2));
  clampCrop(metrics.crop);
  drag = { x: event.clientX, y: event.clientY };
  requestRender();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (event) => {
  const crop = state.panels[selectedPanel];
  if (!crop?.photoId) return;
  event.preventDefault();
  crop.zoom *= Math.exp(-event.deltaY * 0.0012);
  clampCrop(crop);
  requestRender();
}, { passive: false });

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'text') return;
  const count = state.panels.length;
  if (event.key === '[') selectedPanel = (selectedPanel + count - 1) % count;
  else if (event.key === ']') selectedPanel = (selectedPanel + 1) % count;
  else {
    const metrics = selectedPhotoMetrics();
    if (!metrics) return;
    if (event.key === 'ArrowLeft') metrics.crop.panX += 0.05;
    else if (event.key === 'ArrowRight') metrics.crop.panX -= 0.05;
    else if (event.key === 'ArrowUp') metrics.crop.panY += 0.05;
    else if (event.key === 'ArrowDown') metrics.crop.panY -= 0.05;
    else if (event.key === '+' || event.key === '=') metrics.crop.zoom *= 1.06;
    else if (event.key === '-' || event.key === '_') metrics.crop.zoom /= 1.06;
    else return;
    clampCrop(metrics.crop);
    event.preventDefault();
  }
  requestRender();
});

/* ---- control wiring ---- */

document.getElementById('photo-files').addEventListener('change', async (event) => {
  for (const file of event.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    registerPhoto(file.name, img);
  }
  event.target.value = '';
});
const dropzone = document.getElementById('dropzone');
for (const type of ['dragenter', 'dragover']) {
  dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
}
for (const type of ['dragleave', 'drop']) {
  dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); });
}
dropzone.addEventListener('drop', async (event) => {
  for (const file of event.dataTransfer.files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    registerPhoto(file.name, img);
  }
});
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => addSamplePhoto(button.dataset.sample, button.textContent.trim()));
});
document.getElementById('fill-panels').addEventListener('click', fillEveryPanel);
document.getElementById('clear-photos').addEventListener('click', () => {
  photos.length = 0;
  photosById.clear();
  photoStrip.replaceChildren();
  brushPhotoId = null;
  for (const crop of state.panels) crop.photoId = null;
  requestRender();
});

function wireRadioGroup(selector, apply) {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach((b) => {
        b.classList.toggle('is-active', b === button);
        b.setAttribute('aria-checked', String(b === button));
      });
      apply(button);
      requestRender();
    });
  });
}
wireRadioGroup('.layout-btn', (button) => { state.layoutId = button.dataset.layout; syncPanelsToLayout(); });
wireRadioGroup('.grade-btn', (button) => { state.gradeId = button.dataset.grade; });
wireRadioGroup('.size-btn', (button) => {
  const [w, h] = button.dataset.size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
});

for (const [id, key] of [['overlay-palms', 'palms'], ['overlay-skyline', 'skyline'], ['overlay-sun', 'sun'], ['overlay-birds', 'birds']]) {
  document.getElementById(id).addEventListener('change', (event) => {
    state.overlays[key] = event.target.checked;
    requestRender();
  });
}
for (const [id, key] of [['kicker', 'kicker'], ['title', 'title'], ['badge', 'badge']]) {
  document.getElementById(id).addEventListener('input', (event) => {
    state[key] = event.target.value;
    requestRender();
  });
}

zoomSlider.addEventListener('input', () => {
  const crop = state.panels[selectedPanel];
  if (!crop) return;
  crop.zoom = Number(zoomSlider.value);
  requestRender();
});
document.getElementById('panel-swap').addEventListener('click', () => {
  const next = (selectedPanel + 1) % state.panels.length;
  [state.panels[selectedPanel], state.panels[next]] = [state.panels[next], state.panels[selectedPanel]];
  status.textContent = `Swapped Panels ${selectedPanel + 1} and ${next + 1}.`;
  requestRender();
});
document.getElementById('panel-reset').addEventListener('click', () => {
  const crop = state.panels[selectedPanel];
  crop.zoom = 1; crop.panX = 0; crop.panY = 0;
  requestRender();
});
document.getElementById('panel-clear').addEventListener('click', () => {
  state.panels[selectedPanel].photoId = null;
  requestRender();
});
document.getElementById('export-png').addEventListener('click', exportPng);

/* ---- startup: a shot scene, or the default cover ---- */

async function loadDefaultCover() {
  const pier = await addSamplePhoto('pier', 'Pier Fisher');
  const boulevard = await addSamplePhoto('boulevard', 'Boulevard Sunset');
  const opening = [
    { photo: boulevard, zoom: 1.06, panX: 0, panY: 0.85 },
    { photo: pier, zoom: 1.3, panX: -0.5, panY: 0.8 },
    { photo: boulevard, zoom: 1.15, panX: 0, panY: 0.8 },
    { photo: pier, zoom: 1.2, panX: -0.9, panY: 0.8 },
    { photo: boulevard, zoom: 1.45, panX: -0.35, panY: 0.85 },
  ];
  opening.forEach((setup, index) => {
    if (!state.panels[index]) return;
    Object.assign(state.panels[index], { photoId: setup.photo.id, zoom: setup.zoom, panX: setup.panX, panY: setup.panY });
  });
  requestRender();
}

async function loadShotCover(params) {
  const scene = parseShotScene(params);
  shotMode = scene.mode;
  state.layoutId = scene.layoutId;
  state.gradeId = scene.gradeId;
  state.overlays = scene.overlays;
  state.kicker = scene.kicker;
  state.title = scene.title;
  state.badge = scene.badge;
  canvas.width = scene.sizeW;
  canvas.height = scene.sizeH;
  selectedPanel = scene.selected;
  syncPanelsToLayout();
  const loaded = [];
  for (const name of scene.photoNames) {
    loaded.push(await addSamplePhoto(name, sampleDisplayName(name)));
  }
  state.panels.forEach((crop, index) => {
    crop.photoId = loaded[index % loaded.length].id;
    crop.zoom = scene.zooms[index % scene.zooms.length];
    const pan = scene.pans[index];
    if (pan) { crop.panX = pan[0]; crop.panY = pan[1]; }
  });
  // Reflect the scene in the controls, for the editor screenshot.
  for (const [id, value] of [['kicker', scene.kicker], ['title', scene.title], ['badge', scene.badge]]) {
    document.getElementById(id).value = value;
  }
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.layout === scene.layoutId));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.grade === scene.gradeId));
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.size === `${scene.sizeW}x${scene.sizeH}`));
  for (const [id, key] of [['overlay-palms', 'palms'], ['overlay-skyline', 'skyline'], ['overlay-sun', 'sun'], ['overlay-birds', 'birds']]) {
    document.getElementById(id).checked = scene.overlays[key];
  }
  if (scene.mode === 'cover') document.body.classList.add('shot-cover');
  renderPreview();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

syncPanelsToLayout();
const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  loadShotCover(query);
} else {
  loadDefaultCover();
}
