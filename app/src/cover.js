// Draws a GTA-style multi-panel cover onto the canvas: the photo cut into a hero
// panel plus smaller panels (each a different crop of the same photo), a colour
// grade over everything, white frame gutters, and a big bold sheared title.
// No Rockstar logo, artwork or font is used anywhere: the lettering is plain
// system sans-serif, drawn by this code.

const GRADES = {
  sunset: {
    sky: ['#ff9a3d', '#ff5e7a', '#7b2f8b'],
    tint: 'rgba(255, 90, 60, 0.26)',
    tint2: 'rgba(120, 40, 160, 0.28)',
    band: '#1a0b2e',
    title: '#ffffff',
    accent: '#ffb347',
  },
  neon: {
    sky: ['#0b1035', '#3b0f66', '#ff2e88'],
    tint: 'rgba(0, 229, 255, 0.20)',
    tint2: 'rgba(255, 46, 136, 0.30)',
    band: '#050514',
    title: '#7df9ff',
    accent: '#ff2e88',
  },
  noir: {
    sky: ['#16211f', '#1e3a3a', '#0b0f0e'],
    tint: 'rgba(120, 200, 190, 0.16)',
    tint2: 'rgba(0, 0, 0, 0.35)',
    band: '#0b0f0e',
    title: '#e8f0ee',
    accent: '#9fd8cf',
  },
};

/** Keeps `v` between `lo` and `hi`. */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Draws `img` into the rect (x, y, w, h) like CSS `background-size: cover`,
 * looking at the focus point (fx, fy in 0..1) and zoomed by `zoom`.
 */
function drawPanel(ctx, img, x, y, w, h, fx, fy, zoom) {
  if (!img) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = w / scale;
  const sh = h / scale;
  const sx = clamp(fx * iw - sw / 2, 0, Math.max(0, iw - sw));
  const sy = clamp(fy * ih - sh / 2, 0, Math.max(0, ih - sh));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Paints the grade's warm/cool wash over a panel rect. */
function gradeWash(ctx, grade, x, y, w, h, second) {
  ctx.fillStyle = second ? grade.tint2 : grade.tint;
  ctx.fillRect(x, y, w, h);
}

/**
 * Draws one line of big sheared display type, centred on `cx` at baseline `by`,
 * shrunk until it fits `maxWidth`. Returns the size used.
 */
function drawTitle(ctx, text, cx, by, maxWidth, startSize, fill) {
  const clean = text.trim().toUpperCase();
  if (!clean) return 0;
  let size = startSize;
  const font = (s) => `900 ${s}px 'Arial Black', Arial, Helvetica, sans-serif`;
  ctx.font = font(size);
  while (ctx.measureText(clean).width * 1.04 > maxWidth && size > 16) {
    size -= 2;
    ctx.font = font(size);
  }
  const width = ctx.measureText(clean).width;
  ctx.save();
  ctx.translate(cx - width / 2, by);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.strokeText(clean, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(clean, 0, 0);
  ctx.restore();
  return size;
}

/** A small rotated star badge, e.g. "NEW", pinned to a corner. */
function drawBadge(ctx, x, y, r, label, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.22);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(r * 0.42)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

/**
 * Draws the whole cover.
 * `opts`: { photo, title, tagline, layout ('poster' | 'split' | 'strip'),
 *   grade ('sunset' | 'neon' | 'noir') }. The canvas size is the export size.
 * A zero-size canvas draws nothing (the editor sizes it before the first draw).
 */
export function drawCover(canvas, opts) {
  if (canvas.width === 0 || canvas.height === 0) return;
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const grade = GRADES[opts.grade] ?? GRADES.sunset;
  const photo = opts.photo ?? null;
  const title = (opts.title ?? '').trim() || 'VICE CITY';
  const tagline = (opts.tagline ?? '').trim();

  // Sky: a vertical sunset/neon gradient behind everything.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // White frame and gutters, GTA box-art style.
  const frame = Math.round(W * 0.012);
  const gut = Math.round(W * 0.01);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = grade.band;
  ctx.fillRect(frame, frame, W - 2 * frame, H - 2 * frame);

  const innerX = frame;
  const innerY = frame;
  const innerW = W - 2 * frame;
  const innerH = H - 2 * frame;

  // Panel geometry per layout; each panel gets a focus point and zoom so the
  // same photo reads differently in every panel.
  let panels = [];
  let band = null;
  if (opts.layout === 'split') {
    const heroW = Math.round(innerW * 0.62);
    const colX = innerX + heroW + gut;
    const colW = innerX + innerW - colX;
    const halfH = Math.round((innerH - gut) / 2);
    panels = [
      { x: innerX, y: innerY, w: heroW, h: innerH, fx: 0.5, fy: 0.45, zoom: 1.0, hero: true },
      { x: colX, y: innerY, w: colW, h: halfH, fx: 0.12, fy: 0.3, zoom: 1.5 },
      { x: colX, y: innerY + halfH + gut, w: colW, h: halfH, fx: 0.88, fy: 0.7, zoom: 1.5 },
    ];
  } else if (opts.layout === 'strip') {
    const heroH = Math.round(innerH * 0.6);
    const stripY = innerY + heroH + gut;
    const stripH = Math.round(innerH * 0.15);
    const cellW = Math.round((innerW - 3 * gut) / 4);
    panels = [
      { x: innerX, y: innerY, w: innerW, h: heroH, fx: 0.5, fy: 0.4, zoom: 1.0, hero: true },
      { x: innerX, y: stripY, w: cellW, h: stripH, fx: 0.1, fy: 0.25, zoom: 1.6 },
      { x: innerX + cellW + gut, y: stripY, w: cellW, h: stripH, fx: 0.38, fy: 0.6, zoom: 1.6 },
      { x: innerX + 2 * (cellW + gut), y: stripY, w: cellW, h: stripH, fx: 0.65, fy: 0.3, zoom: 1.6 },
      { x: innerX + 3 * (cellW + gut), y: stripY, w: cellW, h: stripH, fx: 0.92, fy: 0.65, zoom: 1.6 },
    ];
    band = { x: innerX, y: stripY + stripH + gut, w: innerW, h: innerY + innerH - (stripY + stripH + gut) };
  } else {
    // poster: big hero, a row of three, title band at the foot.
    const heroH = Math.round(innerH * 0.54);
    const rowY = innerY + heroH + gut;
    const rowH = Math.round(innerH * 0.22);
    const cellW = Math.round((innerW - 2 * gut) / 3);
    panels = [
      { x: innerX, y: innerY, w: innerW, h: heroH, fx: 0.5, fy: 0.4, zoom: 1.0, hero: true },
      { x: innerX, y: rowY, w: cellW, h: rowH, fx: 0.12, fy: 0.3, zoom: 1.6 },
      { x: innerX + cellW + gut, y: rowY, w: cellW, h: rowH, fx: 0.5, fy: 0.62, zoom: 1.6 },
      { x: innerX + 2 * (cellW + gut), y: rowY, w: cellW, h: rowH, fx: 0.88, fy: 0.35, zoom: 1.6 },
    ];
    band = { x: innerX, y: rowY + rowH + gut, w: innerW, h: innerY + innerH - (rowY + rowH + gut) };
  }

  for (const [i, p] of panels.entries()) {
    drawPanel(ctx, photo, p.x, p.y, p.w, p.h, p.fx, p.fy, p.zoom);
    gradeWash(ctx, grade, p.x, p.y, p.w, p.h, i % 2 === 1);
    // Thin white edge on every panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, gut * 0.4);
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }

  // Vignette: darken the corners a touch so the title pops.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  if (band) {
    ctx.fillStyle = grade.band;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    // Accent rule above the title.
    ctx.fillStyle = grade.accent;
    ctx.fillRect(band.x + band.w * 0.08, band.y + band.h * 0.16, band.w * 0.1, Math.max(4, band.h * 0.06));
    const size = drawTitle(ctx, title, band.x + band.w / 2, band.y + band.h * 0.62, band.w * 0.92, band.h * 0.52, grade.title);
    if (tagline) {
      ctx.font = `700 ${Math.max(14, Math.round(size * 0.22))}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(tagline.toUpperCase(), band.x + band.w / 2, band.y + band.h * 0.88);
    }
  } else {
    // split layout: title overlaid on the hero's foot, on a scrim.
    const hero = panels[0];
    const scrim = ctx.createLinearGradient(0, hero.y + hero.h * 0.55, 0, hero.y + hero.h);
    scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(hero.x, hero.y + hero.h * 0.55, hero.w, hero.h * 0.45);
    const size = drawTitle(ctx, title, hero.x + hero.w / 2, hero.y + hero.h * 0.9, hero.w * 0.94, hero.h * 0.14, grade.title);
    if (tagline) {
      ctx.font = `700 ${Math.max(14, Math.round(size * 0.24))}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(tagline.toUpperCase(), hero.x + hero.w / 2, hero.y + hero.h * 0.97);
    }
  }

  // Star badge on the hero's top corner.
  const hero = panels[0];
  drawBadge(ctx, hero.x + hero.w - W * 0.055, hero.y + H * 0.045, Math.round(W * 0.042), 'NEW', grade.accent);
}
