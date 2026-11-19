// Neon Coast Cover Studio — editor UI.
// Owns the app state, the preview canvas, panel editing (drag to pan, scroll
// to zoom), undo/redo, PNG export and the ?shot= staging used for screenshots.
import {
  SIZES, LAYOUTS, GRADES, TITLE_STYLES,
  drawCover, renderCoverCanvas, layoutRects,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// ---------- state ----------
const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
];

function defaultPanels(layoutId) {
  const n = (LAYOUTS[layoutId] || LAYOUTS.grid4).panels.length;
  return Array.from({ length: n }, (_, i) => ({
    photo: i === 0 ? 'boulevard' : i % 2 === 0 ? 'boulevard' : 'pier',
    zoom: 1, ox: 0, oy: 0,
  }));
}

function freshState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    size: '1080x1080',
    title: 'NEON COAST',
    subtitle: 'a sunset story',
    titleStyle: 'sunset',
    titleSize: 110,
    grain: true,
    vignette: true,
    frame: true,
    panels: defaultPanels('grid4'),
  };
}

let state = freshState();
let photos = [];            // {id, name, img}
let photoMap = {};           // id -> HTMLImageElement
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];
let activePhotoId = 'boulevard';

// ---------- history ----------
function snapshot() {
  return JSON.stringify(state);
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncHistoryButtons();
}
function applySnapshot(json) {
  state = JSON.parse(json);
  syncAllControls();
  render();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncHistoryButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncHistoryButtons();
}
function syncHistoryButtons() {
  $('undoBtn').disabled = undoStack.length === 0;
  $('redoBtn').disabled = redoStack.length === 0;
}

// ---------- photos ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(s.src);
      photos.push({ id: s.id, name: s.name, img });
      photoMap[s.id] = img;
    } catch (e) {
      console.warn(e.message);
    }
  }
  renderLibrary();
}

function addUserPhotos(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const id = `user-${Date.now()}-${added}`;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      photos.push({ id, name: file.name.replace(/\.[^.]+$/, ''), img });
      photoMap[id] = img;
      activePhotoId = id;
      renderLibrary();
      render();
    };
    img.src = url;
    added++;
  }
  if (added) pushHistory();
}

// ---------- rendering ----------
const preview = $('preview');
const previewCtx = preview.getContext('2d');

function currentSize() {
  return SIZES[state.size] || SIZES['1080x1080'];
}

function render() {
  const { w, h } = currentSize();
  preview.width = w;
  preview.height = h;
  drawCover(previewCtx, w, h, state, photoMap);
  // Scale the canvas element to fit the stage nicely.
  preview.style.aspectRatio = `${w} / ${h}`;
  $('stageHint').textContent =
    state.layout === 'tilted'
      ? 'Background + two tilted snapshots. Click a snapshot to select it — drag to move, scroll to zoom.'
      : `Layout: ${LAYOUTS[state.layout].name} · ${currentSize().label}. Click a panel to select it — drag to move the photo, scroll to zoom.`;
  syncPanelCard();
}

function renderLibrary() {
  const lib = $('photoLibrary');
  lib.innerHTML = '';
  for (const p of photos) {
    const b = document.createElement('button');
    b.className = 'photo-thumb' + (p.id === activePhotoId ? ' active' : '');
    b.title = p.name;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    const nm = document.createElement('span');
    nm.className = 'thumb-name';
    nm.textContent = p.name;
    b.append(img, nm);
    b.addEventListener('click', () => {
      activePhotoId = p.id;
      pushHistory();
      state.panels[selectedPanel].photo = p.id;
      renderLibrary();
      render();
    });
    lib.appendChild(b);
  }
  syncPanelPhotoSelect();
}

function renderLayouts() {
  const grid = $('layoutGrid');
  grid.innerHTML = '';
  // Tiny inline SVG thumbnails, one per layout.
  const minis = {
    grid4: '<svg class="mini" viewBox="0 0 40 40"><defs><linearGradient id="miniGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a18"/><stop offset="1" stop-color="#ff2e88"/></linearGradient></defs><rect x="2" y="2" width="17" height="17"/><rect x="21" y="2" width="17" height="17"/><rect x="2" y="21" width="17" height="17"/><rect x="21" y="21" width="17" height="17"/></svg>',
    hero3: '<svg class="mini" viewBox="0 0 40 40"><rect x="2" y="2" width="23" height="36"/><rect x="27" y="2" width="11" height="11"/><rect x="27" y="15" width="11" height="11"/><rect x="27" y="28" width="11" height="10"/></svg>',
    collage: '<svg class="mini" viewBox="0 0 40 40"><rect x="2" y="2" width="11" height="11"/><rect x="15" y="2" width="11" height="11"/><rect x="28" y="2" width="10" height="11"/><rect x="2" y="15" width="11" height="11"/><rect x="15" y="15" width="11" height="11"/><rect x="28" y="15" width="10" height="11"/><rect x="2" y="28" width="11" height="10"/><rect x="15" y="28" width="11" height="10"/><rect x="28" y="28" width="10" height="10"/></svg>',
    fullbleed: '<svg class="mini" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36"/></svg>',
    tilted: '<svg class="mini" viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" opacity="0.45"/><polygon points="6,16 22,12 24,28 8,30"/><polygon points="20,20 36,16 38,32 22,34"/></svg>',
  };
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.className = 'layout-btn' + (state.layout === id ? ' active' : '');
    b.innerHTML = minis[id] + `<span>${layout.name}</span>`;
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      pushHistory();
      const old = state.panels;
      state.layout = id;
      state.panels = defaultPanels(id).map((p, i) => ({
        ...p,
        photo: (old[i] && old[i].photo) || p.photo,
        zoom: (old[i] && old[i].zoom) || 1,
        ox: 0, oy: 0,
      }));
      selectedPanel = 0;
      renderLayouts();
      render();
    });
    grid.appendChild(b);
  }
}

function renderGrades() {
  const grid = $('gradeGrid');
  grid.innerHTML = '';
  const swatches = {
    sunset: 'linear-gradient(135deg,#ffc93c,#ff7a18 45%,#ff2e88)',
    neon: 'linear-gradient(135deg,#ff2e88,#7c3aed 50%,#22d3ee)',
    vice: 'linear-gradient(135deg,#a855f7,#ec4899 60%,#f472b6)',
    gold: 'linear-gradient(135deg,#ffe08a,#ffc93c 50%,#ff7a18)',
    palm: 'linear-gradient(135deg,#22d3ee,#0ea5a5 50%,#ff8c28)',
    noir: 'linear-gradient(135deg,#e5e7eb,#6b7280 55%,#111827)',
  };
  for (const [id, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (state.grade === id ? ' active' : '');
    b.innerHTML = `<span class="swatch" style="background:${swatches[id]}"></span><span class="grade-label">${grade.name}</span>`;
    b.addEventListener('click', () => {
      if (state.grade === id) return;
      pushHistory();
      state.grade = id;
      renderGrades();
      render();
    });
    grid.appendChild(b);
  }
}

// ---------- panel editing ----------
function syncPanelCard() {
  const n = state.panels.length;
  const p = state.panels[selectedPanel];
  const info = $('panelInfo');
  if (!p) { info.textContent = 'No panel selected.'; return; }
  const photo = photos.find((x) => x.id === p.photo);
  info.innerHTML =
    `Panel <b>${selectedPanel + 1} of ${n}</b> · ` +
    `photo <b>${photo ? photo.name : 'none'}</b> · zoom ${Math.round((p.zoom || 1) * 100)}%`;
  $('panelZoomRange').value = Math.round((p.zoom || 1) * 100);
  syncPanelPhotoSelect();
}

function syncPanelPhotoSelect() {
  const sel = $('panelPhotoSelect');
  const cur = state.panels[selectedPanel] ? state.panels[selectedPanel].photo : null;
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(empty gradient panel)';
  sel.appendChild(none);
  for (const p of photos) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    sel.appendChild(o);
  }
  sel.value = cur || '';
}

// Hit-test a point on the preview canvas -> panel index (or -1).
function panelAt(clientX, clientY) {
  const r = preview.getBoundingClientRect();
  const px = ((clientX - r.left) / r.width) * preview.width;
  const py = ((clientY - r.top) / r.height) * preview.height;
  const rects = layoutRects(state.layout, preview.width, preview.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const rc = rects[i];
    if (px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) return i;
  }
  return -1;
}

let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectedPanel = i;
  const p = state.panels[i];
  activePhotoId = p.photo || activePhotoId;
  drag = { x: e.clientX, y: e.clientY, ox: p.ox || 0, oy: p.oy || 0, moved: false };
  try { preview.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  preview.classList.add('dragging');
  renderLibrary();
  render();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = preview.getBoundingClientRect();
  const p = state.panels[selectedPanel];
  const dx = (e.clientX - drag.x) / r.width;
  const dy = (e.clientY - drag.y) / r.height;
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
  p.ox = Math.max(-1, Math.min(1, drag.ox - dx * 2));
  p.oy = Math.max(-1, Math.min(1, drag.oy - dy * 2));
  render();
});
preview.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
  preview.classList.remove('dragging');
});
preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selectedPanel];
  if (!p) return;
  const next = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93)));
  if (Math.abs(next - (p.zoom || 1)) > 0.005) {
    p.zoom = next;
    render();
  }
}, { passive: false });

// ---------- export ----------
function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

async function exportSize(sizeKey, { download = true } = {}) {
  const canvas = renderCoverCanvas(state, photoMap, sizeKey);
  const size = SIZES[sizeKey];
  if (download) {
    await downloadCanvas(canvas, `neon-coast-cover-${sizeKey}.png`);
    $('exportNote').textContent = `Exported ${size.label} — check your downloads.`;
  }
  return canvas;
}

async function exportAll() {
  $('exportNote').textContent = 'Exporting all 3 sizes…';
  for (const key of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportSize(key);
  }
  $('exportNote').textContent = 'Exported all 3 sizes as PNG.';
}

async function showExportPreview() {
  const canvas = renderCoverCanvas(state, photoMap, state.size);
  const dataUrl = canvas.toDataURL('image/png');
  $('modalImg').src = dataUrl;
  $('modalSizeLabel').textContent = SIZES[state.size].label;
  $('exportModal').hidden = false;
  $('modalDownloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `neon-coast-cover-${state.size}.png`;
    a.click();
  };
  $('modalAllBtn').onclick = exportAll;
}

// ---------- controls ----------
function syncAllControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('titleStyleSelect').value = state.titleStyle;
  $('titleSizeRange').value = state.titleSize;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  $('frameToggle').checked = state.frame;
  document.querySelectorAll('.size-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  renderLayouts();
  renderGrades();
  renderLibrary();
}

function bindControls() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('titleStyleSelect').addEventListener('change', (e) => { pushHistory(); state.titleStyle = e.target.value; render(); });
  $('titleSizeRange').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); render(); });
  $('titleSizeRange').addEventListener('change', pushHistory);
  $('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; render(); });
  $('vignetteToggle').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; render(); });
  $('frameToggle').addEventListener('change', (e) => { pushHistory(); state.frame = e.target.checked; render(); });

  document.querySelectorAll('.size-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.size === b.dataset.size) return;
      pushHistory();
      state.size = b.dataset.size;
      document.querySelectorAll('.size-btn').forEach((x) => x.classList.toggle('active', x === b));
      render();
    });
  });

  $('photoInput').addEventListener('change', (e) => {
    addUserPhotos([...e.target.files]);
    e.target.value = '';
  });
  $('fillAllBtn').addEventListener('click', () => {
    pushHistory();
    for (const p of state.panels) p.photo = activePhotoId;
    render();
  });

  $('panelPhotoSelect').addEventListener('change', (e) => {
    pushHistory();
    state.panels[selectedPanel].photo = e.target.value || null;
    render();
  });
  $('panelZoomRange').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value) / 100;
    render();
  });
  $('panelZoomRange').addEventListener('change', pushHistory);
  $('panelResetBtn').addEventListener('click', () => {
    pushHistory();
    Object.assign(state.panels[selectedPanel], { zoom: 1, ox: 0, oy: 0 });
    render();
  });
  $('panelFillBtn').addEventListener('click', () => {
    pushHistory();
    const photo = state.panels[selectedPanel].photo;
    for (const p of state.panels) p.photo = photo;
    render();
  });

  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  $('shuffleBtn').addEventListener('click', () => {
    pushHistory();
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    const old = state.panels;
    state.panels = defaultPanels(state.layout).map((p, i) => ({
      ...p, photo: (old[i] && old[i].photo) || p.photo,
    }));
    selectedPanel = 0;
    syncAllControls();
    render();
  });

  $('exportBtn').addEventListener('click', () => exportSize(state.size));
  $('exportAllBtn').addEventListener('click', exportAll);
  $('previewBtn').addEventListener('click', showExportPreview);
  $('modalCloseBtn').addEventListener('click', () => { $('exportModal').hidden = true; });
  $('exportModal').addEventListener('click', (e) => {
    if (e.target === $('exportModal')) $('exportModal').hidden = true;
  });
}

// ---------- shot staging (?shot=...) ----------
// The app stages a scene from the URL so screenshots can be taken headless:
//   ?shot=editor  the editor with a photo loaded (default)
//   ?shot=cover   the editor with the export preview open
//   ?shot=story   the app itself drawing the 1080x1350 export full-frame
//   ?shot=wide    the app itself drawing the 1920x1080 export full-frame
// Params: layout, grade, title, subtitle, size, photo (boulevard|pier).
function applyShotParams() {
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  if (params.get('title')) state.title = params.get('title');
  if (params.get('subtitle') !== null) state.subtitle = params.get('subtitle') || '';
  const size = params.get('size');
  if (size && SIZES[size]) state.size = size;
  const photo = params.get('photo');
  if (photo && photoMap[photo]) {
    for (const p of state.panels) p.photo = photo;
    activePhotoId = photo;
  }
  state.panels = defaultPanels(state.layout).map((p, i) => ({
    ...p,
    photo: photo && photoMap[photo] ? photo : p.photo,
  }));
}

async function stageShotMode() {
  const shot = params.get('shot');
  if (shot !== 'story' && shot !== 'wide') return false;
  // Solo view: hide the editor, show only the cover the app itself drew.
  document.body.classList.add('solo');
  const stage = document.createElement('div');
  stage.id = 'soloStage';
  const canvas = renderCoverCanvas(state, photoMap, shot === 'story' ? '1080x1350' : '1920x1080');
  stage.appendChild(canvas);
  document.body.appendChild(stage);
  return true;
}

// ---------- boot ----------
async function boot() {
  bindControls();
  renderLayouts();
  renderGrades();
  await loadSamples();
  // Fonts must be ready before the first canvas draw uses them.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  applyShotParams();
  syncAllControls();
  const solo = await stageShotMode();
  if (!solo) {
    render();
    if (params.get('shot') === 'cover') await showExportPreview();
  }
  window.__shotReady = true;
  window.__neonCoast = { getState: () => state, exportSize, exportAll };
}

boot();
