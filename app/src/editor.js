// Neon Coast Cover Studio — editor UI.
// Owns the app state, the preview canvas, panel editing (drag to pan, scroll
// to zoom), undo/redo, PNG export and the ?shot= staging used for screenshots.
import {
  SIZES, LAYOUTS, GRADES, TITLE_STYLES,
  drawCover, renderCoverCanvas, layoutRects,
} from './cover.js';

const SAMPLES = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
];

const query = new URLSearchParams(location.search);
const el = (id) => document.getElementById(id);

function blankPanels(layoutId) {
  const count = (LAYOUTS[layoutId] || LAYOUTS.grid4).panels.length;
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      photo: i === 0 ? 'boulevard' : (i % 2 ? 'pier' : 'boulevard'),
      zoom: 1, ox: 0, oy: 0,
    });
  }
  return rows;
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
    panels: blankPanels('grid4'),
  };
}

// Tiny inline SVG thumbnails for the layout picker (48x48 grid).
function miniSvg(id) {
  const shapes = {
    grid4: '<rect x="3" y="3" width="19" height="19"/><rect x="26" y="3" width="19" height="19"/><rect x="3" y="26" width="19" height="19"/><rect x="26" y="26" width="19" height="19"/>',
    hero3: '<rect x="3" y="3" width="27" height="42"/><rect x="33" y="3" width="12" height="13"/><rect x="33" y="18" width="12" height="13"/><rect x="33" y="33" width="12" height="12"/>',
    collage: '<rect x="3" y="3" width="13" height="13"/><rect x="18" y="3" width="13" height="13"/><rect x="33" y="3" width="12" height="13"/><rect x="3" y="18" width="13" height="13"/><rect x="18" y="18" width="13" height="13"/><rect x="33" y="18" width="12" height="13"/><rect x="3" y="33" width="13" height="12"/><rect x="18" y="33" width="13" height="12"/><rect x="33" y="33" width="12" height="12"/>',
    fullbleed: '<rect x="3" y="3" width="42" height="42"/>',
    tilted: '<rect x="3" y="3" width="42" height="42" opacity="0.45"/><polygon points="7,19 26,14 28,33 9,36"/><polygon points="23,24 43,19 45,38 25,41"/>',
  };
  return `<svg class="mini" viewBox="0 0 48 48" aria-hidden="true">${shapes[id] || ''}</svg>`;
}

class Studio {
  constructor() {
    this.state = freshState();
    this.photos = [];       // {id, name, img}
    this.photoMap = {};     // id -> HTMLImageElement
    this.selected = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.activePhoto = 'boulevard';
    this.drag = null;
    this.preview = el('preview');
    this.previewCtx = this.preview.getContext('2d');
  }

  // ---------- history ----------
  takeSnapshot() {
    return JSON.stringify(this.state);
  }

  remember() {
    this.undoStack.push(this.takeSnapshot());
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
    this.syncHistoryButtons();
  }

  restore(json) {
    this.state = JSON.parse(json);
    this.syncControls();
    this.render();
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.takeSnapshot());
    this.restore(this.undoStack.pop());
    this.syncHistoryButtons();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.takeSnapshot());
    this.restore(this.redoStack.pop());
    this.syncHistoryButtons();
  }

  syncHistoryButtons() {
    el('undoBtn').disabled = this.undoStack.length === 0;
    el('redoBtn').disabled = this.redoStack.length === 0;
  }

  // ---------- photos ----------
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load ${src}`));
      img.src = src;
    });
  }

  async loadSamples() {
    for (const s of SAMPLES) {
      try {
        const img = await this.loadImage(s.src);
        this.photos.push({ id: s.id, name: s.name, img });
        this.photoMap[s.id] = img;
      } catch (e) {
        console.warn(e.message);
      }
    }
    this.renderLibrary();
  }

  addUserPhotos(files) {
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const id = `user-${Date.now()}-${added}`;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        this.photos.push({ id, name: file.name.replace(/\.[^.]+$/, ''), img });
        this.photoMap[id] = img;
        this.activePhoto = id;
        this.renderLibrary();
        this.render();
      };
      img.src = url;
      added++;
    }
    if (added) this.remember();
  }

  // ---------- rendering ----------
  currentSize() {
    return SIZES[this.state.size] || SIZES['1080x1080'];
  }

  render() {
    const { w, h } = this.currentSize();
    this.preview.width = w;
    this.preview.height = h;
    drawCover(this.previewCtx, w, h, this.state, this.photoMap);
    this.preview.style.aspectRatio = `${w} / ${h}`;
    el('stageHint').textContent = this.state.layout === 'tilted'
      ? 'Background + two tilted snapshots. Click a snapshot to select it — drag to move, scroll to zoom.'
      : `Layout: ${LAYOUTS[this.state.layout].name} · ${this.currentSize().label}. Click a panel to select it — drag to move the photo, scroll to zoom.`;
    this.syncPanelCard();
  }

  renderLibrary() {
    const lib = el('photoLibrary');
    lib.innerHTML = '';
    for (const p of this.photos) {
      const b = document.createElement('button');
      b.className = 'photo-thumb' + (p.id === this.activePhoto ? ' active' : '');
      b.title = p.name;
      const img = document.createElement('img');
      img.src = p.img.src;
      img.alt = p.name;
      const nm = document.createElement('span');
      nm.className = 'thumb-name';
      nm.textContent = p.name;
      b.append(img, nm);
      b.addEventListener('click', () => {
        this.activePhoto = p.id;
        this.remember();
        this.state.panels[this.selected].photo = p.id;
        this.renderLibrary();
        this.render();
      });
      lib.appendChild(b);
    }
    this.syncPhotoSelect();
  }

  renderLayouts() {
    const grid = el('layoutGrid');
    grid.innerHTML = '';
    // One shared gradient for all the thumbnails.
    grid.insertAdjacentHTML('beforeend',
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<linearGradient id="thumbGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#ff7a18"/><stop offset="1" stop-color="#ff2e88"/>' +
      '</linearGradient></defs></svg>');
    for (const [id, layout] of Object.entries(LAYOUTS)) {
      const b = document.createElement('button');
      b.className = 'layout-btn' + (this.state.layout === id ? ' active' : '');
      b.innerHTML = miniSvg(id) + `<span>${layout.name}</span>`;
      b.addEventListener('click', () => this.chooseLayout(id));
      grid.appendChild(b);
    }
  }

  chooseLayout(id) {
    if (this.state.layout === id) return;
    this.remember();
    const old = this.state.panels;
    this.state.layout = id;
    this.state.panels = blankPanels(id).map((p, i) => ({
      ...p,
      photo: (old[i] && old[i].photo) || p.photo,
      zoom: (old[i] && old[i].zoom) || 1,
      ox: 0, oy: 0,
    }));
    this.selected = 0;
    this.renderLayouts();
    this.render();
  }

  renderGrades() {
    const grid = el('gradeGrid');
    grid.innerHTML = '';
    for (const [id, grade] of Object.entries(GRADES)) {
      const b = document.createElement('button');
      b.className = 'grade-btn' + (this.state.grade === id ? ' active' : '');
      const wash = `linear-gradient(135deg, ${grade.top}, ${grade.bottom})`;
      b.innerHTML = `<span class="swatch" style="background:${wash}"></span><span class="grade-label">${grade.name}</span>`;
      b.addEventListener('click', () => {
        if (this.state.grade === id) return;
        this.remember();
        this.state.grade = id;
        this.renderGrades();
        this.render();
      });
      grid.appendChild(b);
    }
  }

  // ---------- panel editing ----------
  syncPanelCard() {
    const n = this.state.panels.length;
    const p = this.state.panels[this.selected];
    const info = el('panelInfo');
    if (!p) { info.textContent = 'No panel selected.'; return; }
    const photo = this.photos.find((x) => x.id === p.photo);
    info.innerHTML =
      `Panel <b>${this.selected + 1} of ${n}</b> · ` +
      `photo <b>${photo ? photo.name : 'none'}</b> · zoom ${Math.round((p.zoom || 1) * 100)}%`;
    el('panelZoomRange').value = Math.round((p.zoom || 1) * 100);
    this.syncPhotoSelect();
  }

  syncPhotoSelect() {
    const sel = el('panelPhotoSelect');
    const cur = this.state.panels[this.selected] ? this.state.panels[this.selected].photo : null;
    sel.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '(empty gradient panel)';
    sel.appendChild(none);
    for (const p of this.photos) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      sel.appendChild(o);
    }
    sel.value = cur || '';
  }

  // Hit-test a point on the preview canvas -> panel index (or -1).
  panelAt(clientX, clientY) {
    const r = this.preview.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * this.preview.width;
    const py = ((clientY - r.top) / r.height) * this.preview.height;
    const rects = layoutRects(this.state.layout, this.preview.width, this.preview.height);
    for (let i = rects.length - 1; i >= 0; i--) {
      const rc = rects[i];
      if (px >= rc.x && px <= rc.x + rc.w && py >= rc.y && py <= rc.y + rc.h) return i;
    }
    return -1;
  }

  bindGestures() {
    const canvas = this.preview;
    canvas.addEventListener('pointerdown', (e) => {
      const i = this.panelAt(e.clientX, e.clientY);
      if (i < 0) return;
      this.selected = i;
      const p = this.state.panels[i];
      this.activePhoto = p.photo || this.activePhoto;
      this.drag = { x: e.clientX, y: e.clientY, ox: p.ox || 0, oy: p.oy || 0, moved: false };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      canvas.classList.add('dragging');
      this.renderLibrary();
      this.render();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const r = canvas.getBoundingClientRect();
      const p = this.state.panels[this.selected];
      const dx = (e.clientX - this.drag.x) / r.width;
      const dy = (e.clientY - this.drag.y) / r.height;
      if (Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y) > 3) this.drag.moved = true;
      p.ox = Math.max(-1, Math.min(1, this.drag.ox - dx * 2));
      p.oy = Math.max(-1, Math.min(1, this.drag.oy - dy * 2));
      this.render();
    });
    canvas.addEventListener('pointerup', () => {
      if (this.drag && this.drag.moved) this.remember();
      this.drag = null;
      canvas.classList.remove('dragging');
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this.state.panels[this.selected];
      if (!p) return;
      const next = Math.max(1, Math.min(3, (p.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93)));
      if (Math.abs(next - (p.zoom || 1)) > 0.005) {
        p.zoom = next;
        this.render();
      }
    }, { passive: false });
  }

  // ---------- export ----------
  downloadCanvas(canvas, filename) {
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

  async exportSize(sizeKey, { download = true } = {}) {
    const canvas = renderCoverCanvas(this.state, this.photoMap, sizeKey);
    const size = SIZES[sizeKey];
    if (download) {
      await this.downloadCanvas(canvas, `neon-coast-cover-${sizeKey}.png`);
      el('exportNote').textContent = `Exported ${size.label} — check your downloads.`;
    }
    return canvas;
  }

  async exportAll() {
    el('exportNote').textContent = 'Exporting all 3 sizes…';
    for (const key of Object.keys(SIZES)) {
      // eslint-disable-next-line no-await-in-loop
      await this.exportSize(key);
    }
    el('exportNote').textContent = 'Exported all 3 sizes as PNG.';
  }

  async showExportPreview() {
    const canvas = renderCoverCanvas(this.state, this.photoMap, this.state.size);
    const dataUrl = canvas.toDataURL('image/png');
    el('modalImg').src = dataUrl;
    el('modalSizeLabel').textContent = SIZES[this.state.size].label;
    el('exportModal').hidden = false;
    el('modalDownloadBtn').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `neon-coast-cover-${this.state.size}.png`;
      a.click();
    };
    el('modalAllBtn').onclick = () => this.exportAll();
  }

  // ---------- controls ----------
  syncControls() {
    el('titleInput').value = this.state.title;
    el('subtitleInput').value = this.state.subtitle;
    el('titleStyleSelect').value = this.state.titleStyle;
    el('titleSizeRange').value = this.state.titleSize;
    el('grainToggle').checked = this.state.grain;
    el('vignetteToggle').checked = this.state.vignette;
    el('frameToggle').checked = this.state.frame;
    document.querySelectorAll('.size-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.size === this.state.size);
    });
    this.renderLayouts();
    this.renderGrades();
    this.renderLibrary();
  }

  bindControls() {
    el('titleInput').addEventListener('input', (e) => { this.state.title = e.target.value; this.render(); });
    el('titleInput').addEventListener('change', () => this.remember());
    el('subtitleInput').addEventListener('input', (e) => { this.state.subtitle = e.target.value; this.render(); });
    el('subtitleInput').addEventListener('change', () => this.remember());
    el('titleStyleSelect').addEventListener('change', (e) => { this.remember(); this.state.titleStyle = e.target.value; this.render(); });
    el('titleSizeRange').addEventListener('input', (e) => { this.state.titleSize = Number(e.target.value); this.render(); });
    el('titleSizeRange').addEventListener('change', () => this.remember());
    el('grainToggle').addEventListener('change', (e) => { this.remember(); this.state.grain = e.target.checked; this.render(); });
    el('vignetteToggle').addEventListener('change', (e) => { this.remember(); this.state.vignette = e.target.checked; this.render(); });
    el('frameToggle').addEventListener('change', (e) => { this.remember(); this.state.frame = e.target.checked; this.render(); });

    document.querySelectorAll('.size-btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.state.size === b.dataset.size) return;
        this.remember();
        this.state.size = b.dataset.size;
        document.querySelectorAll('.size-btn').forEach((x) => x.classList.toggle('active', x === b));
        this.render();
      });
    });

    el('photoInput').addEventListener('change', (e) => {
      this.addUserPhotos([...e.target.files]);
      e.target.value = '';
    });
    el('fillAllBtn').addEventListener('click', () => {
      this.remember();
      for (const p of this.state.panels) p.photo = this.activePhoto;
      this.render();
    });

    el('panelPhotoSelect').addEventListener('change', (e) => {
      this.remember();
      this.state.panels[this.selected].photo = e.target.value || null;
      this.render();
    });
    el('panelZoomRange').addEventListener('input', (e) => {
      this.state.panels[this.selected].zoom = Number(e.target.value) / 100;
      this.render();
    });
    el('panelZoomRange').addEventListener('change', () => this.remember());
    el('panelResetBtn').addEventListener('click', () => {
      this.remember();
      Object.assign(this.state.panels[this.selected], { zoom: 1, ox: 0, oy: 0 });
      this.render();
    });
    el('panelFillBtn').addEventListener('click', () => {
      this.remember();
      const photo = this.state.panels[this.selected].photo;
      for (const p of this.state.panels) p.photo = photo;
      this.render();
    });

    el('undoBtn').addEventListener('click', () => this.undo());
    el('redoBtn').addEventListener('click', () => this.redo());
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
    });
    el('shuffleBtn').addEventListener('click', () => {
      this.remember();
      const layouts = Object.keys(LAYOUTS);
      const grades = Object.keys(GRADES);
      this.state.layout = layouts[Math.floor(Math.random() * layouts.length)];
      this.state.grade = grades[Math.floor(Math.random() * grades.length)];
      const old = this.state.panels;
      this.state.panels = blankPanels(this.state.layout).map((p, i) => ({
        ...p, photo: (old[i] && old[i].photo) || p.photo,
      }));
      this.selected = 0;
      this.syncControls();
      this.render();
    });

    el('exportBtn').addEventListener('click', () => this.exportSize(this.state.size));
    el('exportAllBtn').addEventListener('click', () => this.exportAll());
    el('previewBtn').addEventListener('click', () => this.showExportPreview());
    el('modalCloseBtn').addEventListener('click', () => { el('exportModal').hidden = true; });
    el('exportModal').addEventListener('click', (e) => {
      if (e.target === el('exportModal')) el('exportModal').hidden = true;
    });
  }

  // ---------- shot staging (?shot=...) ----------
  // The app stages a scene from the URL so screenshots can be taken headless:
  //   ?shot=editor  the editor with a photo loaded (default)
  //   ?shot=cover   the editor with the export preview open
  //   ?shot=story   the app itself drawing the 1080x1350 export full-frame
  //   ?shot=wide    the app itself drawing the 1920x1080 export full-frame
  // Params: layout, grade, title, subtitle, size, photo (boulevard|pier).
  applyQuery() {
    const layout = query.get('layout');
    if (layout && LAYOUTS[layout]) this.state.layout = layout;
    const grade = query.get('grade');
    if (grade && GRADES[grade]) this.state.grade = grade;
    if (query.get('title')) this.state.title = query.get('title');
    if (query.get('subtitle') !== null) this.state.subtitle = query.get('subtitle') || '';
    const size = query.get('size');
    if (size && SIZES[size]) this.state.size = size;
    const photo = query.get('photo');
    if (photo && this.photoMap[photo]) {
      for (const p of this.state.panels) p.photo = photo;
      this.activePhoto = photo;
    }
    this.state.panels = blankPanels(this.state.layout).map((p, i) => ({
      ...p,
      photo: photo && this.photoMap[photo] ? photo : p.photo,
    }));
  }

  async stageSolo() {
    const shot = query.get('shot');
    if (shot !== 'story' && shot !== 'wide') return false;
    // Solo view: hide the editor, show only the cover the app itself drew.
    document.body.classList.add('solo');
    const stage = document.createElement('div');
    stage.id = 'soloStage';
    const canvas = renderCoverCanvas(this.state, this.photoMap, shot === 'story' ? '1080x1350' : '1920x1080');
    stage.appendChild(canvas);
    document.body.appendChild(stage);
    return true;
  }

  // ---------- boot ----------
  async boot() {
    this.bindControls();
    this.bindGestures();
    this.renderLayouts();
    this.renderGrades();
    await this.loadSamples();
    // Fonts must be ready before the first canvas draw uses them.
    try {
      await Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('40px Pacifico'),
        document.fonts.ready,
      ]);
    } catch { /* fall back to system fonts */ }
    this.applyQuery();
    this.syncControls();
    const solo = await this.stageSolo();
    if (!solo) {
      this.render();
      if (query.get('shot') === 'cover') await this.showExportPreview();
    }
    window.__shotReady = true;
    window.__neonCoast = {
      getState: () => this.state,
      exportSize: (key, opts) => this.exportSize(key, opts),
      exportAll: () => this.exportAll(),
    };
  }
}

const studio = new Studio();
studio.boot();
