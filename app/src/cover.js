// Neon Coast Cover Studio — cover render engine.
// Draws the multi-panel GTA-style poster onto any 2D canvas, offline, from
// the editor state. No network, no external assets: photos come from the
// user's machine (or the bundled AI-made samples) and the fonts are vendored.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Story · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

// Panels are fractions of the canvas. `band` reserves a title band at the
// bottom; `overlay` draws the title over the art with a scrim.
export const LAYOUTS = {
  grid4: {
    name: 'Four Panel',
    title: 'band',
    panels: [
      { x: 0.0, y: 0.0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.0, w: 0.5, h: 0.5 },
      { x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero3: {
    name: 'Hero + Three',
    title: 'band',
    panels: [
      { x: 0.0, y: 0.0, w: 0.62, h: 1.0 },
      { x: 0.62, y: 0.0, w: 0.38, h: 0.3333 },
      { x: 0.62, y: 0.3333, w: 0.38, h: 0.3333 },
      { x: 0.62, y: 0.6667, w: 0.38, h: 0.3333 },
    ],
  },
  collage: {
    name: 'Nine Panel',
    title: 'band',
    panels: [
      { x: 0.0, y: 0.0, w: 0.3333, h: 0.3333 },
      { x: 0.3333, y: 0.0, w: 0.3333, h: 0.3333 },
      { x: 0.6667, y: 0.0, w: 0.3333, h: 0.3333 },
      { x: 0.0, y: 0.3333, w: 0.3333, h: 0.3333 },
      { x: 0.3333, y: 0.3333, w: 0.3333, h: 0.3333 },
      { x: 0.6667, y: 0.3333, w: 0.3333, h: 0.3333 },
      { x: 0.0, y: 0.6667, w: 0.3333, h: 0.3333 },
      { x: 0.3333, y: 0.6667, w: 0.3333, h: 0.3333 },
      { x: 0.6667, y: 0.6667, w: 0.3333, h: 0.3333 },
    ],
  },
  fullbleed: {
    name: 'Full Bleed',
    title: 'overlay',
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
  },
  tilted: {
    name: 'Tilted Snaps',
    title: 'top',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 1.0, bg: true },
      { x: 0.06, y: 0.30, w: 0.42, h: 0.46, rot: -4, snap: true },
      { x: 0.52, y: 0.38, w: 0.42, h: 0.46, rot: 3.5, snap: true },
    ],
  },
};

export const GRADES = {
  sunset: {
    name: 'Sunset',
    filter: 'saturate(1.35) contrast(1.08) sepia(0.16) brightness(1.03)',
    top: 'rgba(255,122,24,0.34)', bottom: 'rgba(255,46,136,0.38)', blend: 'screen',
    shadow: 'rgba(20,8,60,0.20)',
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.12) brightness(1.0)',
    top: 'rgba(255,46,136,0.34)', bottom: 'rgba(34,211,238,0.36)', blend: 'overlay',
    shadow: 'rgba(10,4,40,0.22)',
  },
  vice: {
    name: 'Vice Purple',
    filter: 'saturate(1.28) hue-rotate(-14deg) contrast(1.06)',
    top: 'rgba(168,85,247,0.30)', bottom: 'rgba(236,72,153,0.30)', blend: 'screen',
    shadow: 'rgba(30,8,60,0.22)',
  },
  gold: {
    name: 'Golden Hour',
    filter: 'saturate(1.3) sepia(0.34) contrast(1.05) brightness(1.05)',
    top: 'rgba(255,201,60,0.26)', bottom: 'rgba(255,122,24,0.26)', blend: 'screen',
    shadow: 'rgba(60,30,0,0.18)',
  },
  palm: {
    name: 'Palm Teal',
    filter: 'saturate(1.22) contrast(1.07) hue-rotate(6deg)',
    top: 'rgba(34,211,238,0.22)', bottom: 'rgba(255,140,40,0.24)', blend: 'soft-light',
    shadow: 'rgba(0,40,50,0.24)',
  },
  noir: {
    name: 'Noir',
    filter: 'saturate(0.12) contrast(1.28) brightness(0.94)',
    top: 'rgba(120,140,255,0.10)', bottom: 'rgba(0,0,0,0.26)', blend: 'multiply',
    shadow: 'rgba(0,0,0,0.20)',
  },
};

export const TITLE_STYLES = {
  sunset: { name: 'Sunset gradient' },
  white: { name: 'Solid white' },
  neon: { name: 'Neon outline' },
  black: { name: 'Black on white band' },
};

// A small deterministic grain tile, drawn as a repeating pattern.
let grainTile = null;
export function makeGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 160; t.height = 160;
  const c = t.getContext('2d');
  const img = c.createImageData(160, 160);
  let seed = 20261119;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

// Cover-fit a photo into a panel rect, with per-panel zoom and pan.
// zoom 1 = fit; ox/oy in [-1, 1] pan the photo inside the panel.
export function fitPhotoRect(img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxOx = Math.max(0, (dw - rect.w) / 2);
  const maxOy = Math.max(0, (dh - rect.h) / 2);
  return {
    x: rect.x + (rect.w - dw) / 2 - ox * maxOx,
    y: rect.y + (rect.h - dh) / 2 - oy * maxOy,
    w: dw, h: dh,
  };
}

function drawPhotoInto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.filter = grade.filter;
  const d = fitPhotoRect(img, rect, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
  ctx.drawImage(img, d.x, d.y, d.w, d.h);
  ctx.restore();
  // Colour grade overlays, clipped to the panel.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grade.shadow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawPanelFrame(ctx, rect, W, opts) {
  const lw = Math.max(2, W * 0.004);
  ctx.save();
  ctx.strokeStyle = opts.frame ? '#ffffff' : 'rgba(255,255,255,0.85)';
  ctx.lineWidth = lw;
  ctx.strokeRect(rect.x + lw / 2, rect.y + lw / 2, rect.w - lw, rect.h - lw);
  ctx.restore();
}

// The title block: big Anton capitals, Pacifico subtitle, small badge line.
export function drawTitleBlock(ctx, W, H, state, area) {
  const { x, y, w, h } = area;
  const title = (state.title || 'NEON COAST').toUpperCase();
  const sub = state.subtitle || '';
  const style = state.titleStyle || 'sunset';
  const baseSize = (state.titleSize || 110) * (w / 1080);
  const cx = x + w / 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (style === 'black') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
  }

  // Badge line above the title.
  const badgeSize = Math.max(13, w * 0.016);
  ctx.font = `700 ${badgeSize}px system-ui, sans-serif`;
  ctx.fillStyle = style === 'black' ? '#111111' : 'rgba(255,255,255,0.92)';
  try { ctx.letterSpacing = `${Math.max(4, w * 0.006)}px`; } catch { /* older canvas */ }
  ctx.fillText('★  A  POSTER  MADE  BY  YOU  ★', cx, y + h * 0.14);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

  // Main title — shrink until it fits the band, and never taller than the band.
  let size = Math.min(baseSize, h * 0.58);
  ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  const maxW = w * 0.94;
  while (ctx.measureText(title).width > maxW && size > 24) {
    size *= 0.92;
    ctx.font = `${size}px Anton, "Arial Black", sans-serif`;
  }
  const titleY = y + h * 0.50;
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
  // Draw the capitals with an alphabetic baseline so they sit centred on
  // titleY: canvas 'middle' centres the em box, which sits high for display
  // fonts like Anton and would push the title into the badge line.
  const capH = size * 0.72;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, cx, titleY + capH / 2);
  if (style === 'neon') ctx.strokeText(title, cx, titleY + capH / 2);
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Subtitle in script, with a thin rule either side.
  if (sub) {
    const subSize = Math.max(16, size * 0.30);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = style === 'black' ? '#333333' : '#ffe9f3';
    const tw = ctx.measureText(sub).width;
    const ruleY = y + h * 0.80;
    ctx.strokeStyle = style === 'black' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1, w * 0.0012);
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 - w * 0.05, ruleY);
    ctx.lineTo(cx - tw / 2 - w * 0.015, ruleY);
    ctx.moveTo(cx + tw / 2 + w * 0.015, ruleY);
    ctx.lineTo(cx + tw / 2 + w * 0.05, ruleY);
    ctx.stroke();
    ctx.fillText(sub, cx, ruleY);
  }
  ctx.restore();
}

// Panel rects in pixels for a layout at W x H.
export function layoutRects(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.grid4;
  const bandH = layout.title === 'band' ? H * 0.23 : 0;
  const artH = H - bandH;
  return layout.panels.map((p) => {
    const rect = {
      x: p.x * W,
      y: p.y * artH,
      w: p.w * W,
      h: p.h * artH,
      rot: p.rot || 0,
      snap: !!p.snap,
      bg: !!p.bg,
    };
    return rect;
  });
}

export function titleArea(layoutId, W, H) {
  const layout = LAYOUTS[layoutId] || LAYOUTS.grid4;
  if (layout.title === 'band') {
    const bandH = H * 0.23;
    return { x: 0, y: H - bandH, w: W, h: bandH, mode: 'band' };
  }
  if (layout.title === 'top') {
    return { x: 0, y: 0, w: W, h: H * 0.24, mode: 'top' };
  }
  return { x: 0, y: H * 0.72, w: W, h: H * 0.26, mode: 'overlay' };
}

// Draw the whole cover. `photos` maps photo id -> HTMLImageElement.
// `state.panels[i]` = { photo, zoom, ox, oy } aligned with layout panels.
export function drawCover(ctx, W, H, state, photos) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.grid4;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const rects = layoutRects(state.layout, W, H);
  const gutter = Math.max(3, W * 0.006);

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, W, H);

  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const img = panel.photo ? photos[panel.photo] : null;
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
      drawPhotoInto(ctx, img, inset, panel, grade);
    } else {
      // Empty panel: a sunset gradient placeholder so the grid never looks broken.
      const g = ctx.createLinearGradient(inset.x, inset.y, inset.x + inset.w, inset.y + inset.h);
      g.addColorStop(0, '#ff7a18');
      g.addColorStop(0.5, '#ff2e88');
      g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g;
      ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(14, inset.w * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('＋ add a photo', inset.x + inset.w / 2, inset.y + inset.h / 2);
    }
    ctx.restore();
    if (!rect.bg) drawPanelFrame(ctx, inset, W, { frame: state.frame !== false });
  });

  // Title block.
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
  } else if (layout.title === 'top') {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, area.y + area.h);
    g.addColorStop(0, 'rgba(10,4,20,0.72)');
    g.addColorStop(1, 'rgba(10,4,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, area.y + area.h);
    ctx.restore();
    drawTitleBlock(ctx, W, H, state, area);
  } else {
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

  // Grain + vignette over everything.
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.globalCompositeOperation = 'overlay';
    const tile = makeGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
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

  // Outer poster frame.
  if (state.frame !== false) {
    const fw = Math.max(3, W * 0.008);
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
    ctx.restore();
  }
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
