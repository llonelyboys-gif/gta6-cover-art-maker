// Neon Coast Cover Studio — poster render engine.
// Paints a GTA-style multi-panel poster onto any 2D canvas from editor state.
// Everything is local: photos come from the user's machine or the bundled
// samples, fonts are vendored, no network anywhere.

// ---------- export sizes ----------
const SIZE_TABLE = [
  ['1080x1080', 1080, 1080, 'Square · 1080 × 1080'],
  ['1080x1350', 1080, 1350, 'Story · 1080 × 1350'],
  ['1920x1080', 1920, 1080, 'Wide · 1920 × 1080'],
];
export const SIZES = {};
for (const [key, w, h, label] of SIZE_TABLE) SIZES[key] = { w, h, label };

// ---------- layouts ----------
// A cell is [x, y, w, h] in fractions of the art area, plus optional flags.
function cell(x, y, w, h, flags) {
  return { x, y, w, h, rot: 0, snap: false, bg: false, ...(flags || {}) };
}
const LAYOUT_TABLE = [
  {
    id: 'grid4', name: 'Four Panel', title: 'band',
    cells: [cell(0, 0, 0.5, 0.5), cell(0.5, 0, 0.5, 0.5), cell(0, 0.5, 0.5, 0.5), cell(0.5, 0.5, 0.5, 0.5)],
  },
  {
    id: 'hero3', name: 'Hero + Three', title: 'band',
    cells: [cell(0, 0, 0.62, 1), cell(0.62, 0, 0.38, 1 / 3), cell(0.62, 1 / 3, 0.38, 1 / 3), cell(0.62, 2 / 3, 0.38, 1 / 3)],
  },
  {
    id: 'collage', name: 'Nine Panel', title: 'band',
    cells: [
      cell(0, 0, 1 / 3, 1 / 3), cell(1 / 3, 0, 1 / 3, 1 / 3), cell(2 / 3, 0, 1 / 3, 1 / 3),
      cell(0, 1 / 3, 1 / 3, 1 / 3), cell(1 / 3, 1 / 3, 1 / 3, 1 / 3), cell(2 / 3, 1 / 3, 1 / 3, 1 / 3),
      cell(0, 2 / 3, 1 / 3, 1 / 3), cell(1 / 3, 2 / 3, 1 / 3, 1 / 3), cell(2 / 3, 2 / 3, 1 / 3, 1 / 3),
    ],
  },
  { id: 'fullbleed', name: 'Full Bleed', title: 'overlay', cells: [cell(0, 0, 1, 1)] },
  {
    id: 'tilted', name: 'Tilted Snaps', title: 'top',
    cells: [
      cell(0, 0, 1, 1, { bg: true }),
      cell(0.06, 0.30, 0.42, 0.46, { rot: -4, snap: true }),
      cell(0.52, 0.38, 0.42, 0.46, { rot: 3.5, snap: true }),
    ],
  },
];
export const LAYOUTS = {};
for (const def of LAYOUT_TABLE) {
  LAYOUTS[def.id] = { name: def.name, title: def.title, panels: def.cells };
}

// ---------- colour grades ----------
const GRADE_TABLE = [
  { id: 'sunset', name: 'Sunset', filter: 'saturate(1.35) contrast(1.08) sepia(0.16) brightness(1.03)', top: 'rgba(255,122,24,0.34)', bottom: 'rgba(255,46,136,0.38)', blend: 'screen', shadow: 'rgba(20,8,60,0.20)' },
  { id: 'neon', name: 'Neon Nights', filter: 'saturate(1.55) contrast(1.12) brightness(1.0)', top: 'rgba(255,46,136,0.34)', bottom: 'rgba(34,211,238,0.36)', blend: 'overlay', shadow: 'rgba(10,4,40,0.22)' },
  { id: 'vice', name: 'Vice Purple', filter: 'saturate(1.28) hue-rotate(-14deg) contrast(1.06)', top: 'rgba(168,85,247,0.30)', bottom: 'rgba(236,72,153,0.30)', blend: 'screen', shadow: 'rgba(30,8,60,0.22)' },
  { id: 'gold', name: 'Golden Hour', filter: 'saturate(1.3) sepia(0.34) contrast(1.05) brightness(1.05)', top: 'rgba(255,201,60,0.26)', bottom: 'rgba(255,122,24,0.26)', blend: 'screen', shadow: 'rgba(60,30,0,0.18)' },
  { id: 'palm', name: 'Palm Teal', filter: 'saturate(1.22) contrast(1.07) hue-rotate(6deg)', top: 'rgba(34,211,238,0.22)', bottom: 'rgba(255,140,40,0.24)', blend: 'soft-light', shadow: 'rgba(0,40,50,0.24)' },
  { id: 'noir', name: 'Noir', filter: 'saturate(0.12) contrast(1.28) brightness(0.94)', top: 'rgba(120,140,255,0.10)', bottom: 'rgba(0,0,0,0.26)', blend: 'multiply', shadow: 'rgba(0,0,0,0.20)' },
];
export const GRADES = {};
for (const g of GRADE_TABLE) {
  GRADES[g.id] = { name: g.name, filter: g.filter, top: g.top, bottom: g.bottom, blend: g.blend, shadow: g.shadow };
}

// ---------- title styles ----------
export const TITLE_STYLES = {
  sunset: { name: 'Sunset gradient' },
  white: { name: 'Solid white' },
  neon: { name: 'Neon outline' },
  black: { name: 'Black on white band' },
};

// ---------- film grain ----------
// A deterministic noise tile, built once and reused as a repeating pattern.
let grainCanvas = null;
export function makeGrainTile() {
  if (grainCanvas) return grainCanvas;
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const g = tile.getContext('2d');
  const pixels = g.createImageData(size, size);
  let seed = 0x9e3779b9;
  const next = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < pixels.data.length; i += 4) {
    const v = (next() * 255) | 0;
    pixels.data[i] = v;
    pixels.data[i + 1] = v;
    pixels.data[i + 2] = v;
    pixels.data[i + 3] = 255;
  }
  g.putImageData(pixels, 0, 0);
  grainCanvas = tile;
  return tile;
}

// ---------- geometry ----------
// Cover-fit a photo into a panel rect. zoom 1 = fit; ox/oy in [-1, 1] pan it.
export function fitPhotoRect(img, rect, zoom, ox, oy) {
  const cover = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = cover * (zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, (dw - rect.w) / 2);
  const slackY = Math.max(0, (dh - rect.h) / 2);
  return {
    x: rect.x + (rect.w - dw) / 2 - (ox || 0) * slackX,
    y: rect.y + (rect.h - dh) / 2 - (oy || 0) * slackY,
    w: dw,
    h: dh,
  };
}

function bandHeight(layout, H) {
  return layout.title === 'band' ? H * 0.23 : 0;
}

// Panel rects in pixels for a layout at W x H.
export function layoutRects(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.grid4;
  const artH = H - bandHeight(layout, H);
  return layout.panels.map((p) => ({
    x: p.x * W,
    y: p.y * artH,
    w: p.w * W,
    h: p.h * artH,
    rot: p.rot || 0,
    snap: !!p.snap,
    bg: !!p.bg,
  }));
}

export function titleArea(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.grid4;
  if (layout.title === 'band') {
    const h = bandHeight(layout, H);
    return { x: 0, y: H - h, w: W, h, mode: 'band' };
  }
  if (layout.title === 'top') {
    return { x: 0, y: 0, w: W, h: H * 0.24, mode: 'top' };
  }
  return { x: 0, y: H * 0.72, w: W, h: H * 0.26, mode: 'overlay' };
}

// ---------- photo painting ----------
function paintPhoto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.filter = grade.filter;
  const d = fitPhotoRect(img, rect, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
  ctx.drawImage(img, d.x, d.y, d.w, d.h);
  ctx.restore();
  // Grade overlays, clipped to the panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grade.shadow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function paintPlaceholder(ctx, rect) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#ff7a18');
  g.addColorStop(0.5, '#ff2e88');
  g.addColorStop(1, '#7c3aed');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `${Math.max(14, rect.w * 0.05)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('＋ add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function strokePanel(ctx, rect, W, framed) {
  const lw = Math.max(2, W * 0.004);
  ctx.save();
  ctx.strokeStyle = framed ? '#ffffff' : 'rgba(255,255,255,0.85)';
  ctx.lineWidth = lw;
  ctx.strokeRect(rect.x + lw / 2, rect.y + lw / 2, rect.w - lw, rect.h - lw);
  ctx.restore();
}

function paintOnePanel(ctx, rect, panel, img, grade, W, framed, gutter) {
  const inset = {
    x: rect.x + (rect.bg || rect.snap ? 0 : gutter / 2),
    y: rect.y + (rect.bg || rect.snap ? 0 : gutter / 2),
    w: rect.w - (rect.bg || rect.snap ? 0 : gutter),
    h: rect.h - (rect.bg || rect.snap ? 0 : gutter),
  };
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
  }
  if (rect.snap) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.008;
    ctx.fillStyle = '#ffffff';
    const pad = W * 0.012;
    ctx.fillRect(rect.x - pad, rect.y - pad, rect.w + pad * 2, rect.h + pad * 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.beginPath();
  ctx.rect(inset.x, inset.y, inset.w, inset.h);
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    paintPhoto(ctx, img, inset, panel, grade);
  } else {
    paintPlaceholder(ctx, inset);
  }
  ctx.restore();
  if (!rect.bg) strokePanel(ctx, inset, W, framed);
}

function paintPanels(ctx, W, H, state, photos, grade) {
  const rects = layoutRects(state.layout, W, H);
  const gutter = Math.max(3, W * 0.006);
  for (let i = 0; i < rects.length; i++) {
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const img = panel.photo ? photos[panel.photo] : null;
    paintOnePanel(ctx, rects[i], panel, img, grade, W, state.frame !== false, gutter);
  }
}

// ---------- title block ----------
function paintBadgeLine(ctx, cx, y, w, dark) {
  const size = Math.max(13, w * 0.016);
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = dark ? '#111111' : 'rgba(255,255,255,0.92)';
  try { ctx.letterSpacing = `${Math.max(4, w * 0.006)}px`; } catch { /* older canvas */ }
  ctx.fillText('★  A  POSTER  MADE  BY  YOU  ★', cx, y);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

function paintMainTitle(ctx, cx, title, titleY, maxW, h, w, style, baseSize) {
  // Shrink the font until the title fits, and never taller than the band.
  let size = Math.min((baseSize || 110) * (w / 1080), h * 0.58);
  const setFont = () => { ctx.font = `${size}px Anton, "Arial Black", sans-serif`; };
  setFont();
  while (ctx.measureText(title).width > maxW && size > 24) {
    size *= 0.92;
    setFont();
  }
  // Draw with an alphabetic baseline so the capitals sit centred on titleY:
  // canvas 'middle' centres the em box, which sits high for display fonts
  // like Anton and would push the title into the badge line.
  const capH = size * 0.72;
  if (style === 'sunset') {
    const g = ctx.createLinearGradient(cx - maxW / 2, titleY - size / 2, cx + maxW / 2, titleY + size / 2);
    g.addColorStop(0, '#ffc93c');
    g.addColorStop(0.45, '#ff7a18');
    g.addColorStop(1, '#ff2e88');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.08;
    ctx.shadowOffsetY = size * 0.03;
  } else if (style === 'neon') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.28;
  } else if (style === 'black') {
    ctx.fillStyle = '#111111';
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.025;
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, cx, titleY + capH / 2);
  if (style === 'neon') ctx.strokeText(title, cx, titleY + capH / 2);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return size;
}

function paintSubtitle(ctx, cx, sub, size, w, y, dark) {
  if (!sub) return;
  const subSize = Math.max(16, size * 0.30);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = dark ? '#333333' : '#ffe9f3';
  const tw = ctx.measureText(sub).width;
  ctx.strokeStyle = dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)';
  ctx.lineWidth = Math.max(1, w * 0.0012);
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 - w * 0.05, y);
  ctx.lineTo(cx - tw / 2 - w * 0.015, y);
  ctx.moveTo(cx + tw / 2 + w * 0.015, y);
  ctx.lineTo(cx + tw / 2 + w * 0.05, y);
  ctx.stroke();
  ctx.fillText(sub, cx, y);
}

// The title block: big Anton capitals, Pacifico subtitle, small badge line.
export function drawTitleBlock(ctx, W, H, state, area) {
  const { x, y, w, h } = area;
  const title = (state.title || 'NEON COAST').toUpperCase();
  const sub = state.subtitle || '';
  const style = state.titleStyle || 'sunset';
  const cx = x + w / 2;
  const dark = style === 'black';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (dark) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
  }

  paintBadgeLine(ctx, cx, y + h * 0.14, w, dark);
  const titleSize = paintMainTitle(
    ctx, cx, title, y + h * 0.50, w * 0.94, h, w, style, state.titleSize || 110,
  );
  paintSubtitle(ctx, cx, sub, titleSize, w, y + h * 0.80, dark);
  ctx.restore();
}

function paintTitleZone(ctx, W, H, state) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.grid4;
  const area = titleArea(state.layout, W, H);
  if (layout.title === 'band') {
    const g = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
    g.addColorStop(0, '#2a0a3d');
    g.addColorStop(0.55, '#4a1040');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(area.x, area.y, area.w, area.h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(area.x, area.y, area.w, Math.max(2, W * 0.003));
    drawTitleBlock(ctx, W, H, state, area);
    return;
  }
  if (layout.title === 'top') {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, area.y + area.h);
    g.addColorStop(0, 'rgba(10,4,20,0.72)');
    g.addColorStop(1, 'rgba(10,4,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, area.y + area.h);
    ctx.restore();
    drawTitleBlock(ctx, W, H, state, area);
    return;
  }
  ctx.save();
  const g = ctx.createLinearGradient(0, area.y - area.h * 0.25, 0, H);
  g.addColorStop(0, 'rgba(10,4,20,0)');
  g.addColorStop(0.45, 'rgba(10,4,20,0.55)');
  g.addColorStop(1, 'rgba(10,4,20,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(0, area.y - area.h * 0.25, W, H - area.y + area.h * 0.25);
  ctx.restore();
  drawTitleBlock(ctx, W, H, state, area);
}

// ---------- finish: grain, vignette, outer frame ----------
function paintFinish(ctx, W, H, state) {
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    const tile = makeGrainTile();
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette !== false) {
    ctx.save();
    const v = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.frame !== false) {
    const fw = Math.max(3, W * 0.008);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
    ctx.restore();
  }
}

// Draw the whole cover. `photos` maps photo id -> HTMLImageElement.
// `state.panels[i]` = { photo, zoom, ox, oy } aligned with layout panels.
export function drawCover(ctx, W, H, state, photos) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);
  paintPanels(ctx, W, H, state, photos, grade);
  paintTitleZone(ctx, W, H, state);
  paintFinish(ctx, W, H, state);
  ctx.restore();
}

// Render the cover at export size and return the canvas.
export function renderCoverCanvas(state, photos, sizeKey) {
  const size = SIZES[sizeKey] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas.getContext('2d'), size.w, size.h, state, photos);
  return canvas;
}
