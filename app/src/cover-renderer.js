// The cover renderer: composes a full cover from the editor's state — graded photos clipped into the layout's
// angled panels, white keylines, the grade's washes, our drawn scenery, film grain and the lettering block.
// The editor's live preview and the exported PNG are the same render at the same size, so what you see is
// exactly what downloads. `options.highlightIndex` outlines one panel (the editor's selection) and is never
// passed for an export.

import { getPanelLayout, panelBounds, tracePanelPath } from './panel-layouts.js';
import { getGradePreset, paintGradeWashes, paintVignette, paintFilmGrain } from './neon-grade.js';
import { drawBirdFlock, drawPalmClusters, drawSkylineSilhouette, drawStripedSun, drawSunsetBackdrop } from './vector-scenery.js';
import { drawCoverLettering } from './cover-lettering.js';

/** A fresh crop record for one panel: which photo fills it, and how it is zoomed and panned. */
export function createPanelCrop() {
  return { photoId: null, zoom: 1, panX: 0, panY: 0 };
}

/** Draws one panel: the photo (graded, cover-fitted, user-cropped) or the drawn sunset scene when it is empty. */
function paintPanelPhoto(ctx, width, height, polygon, crop, photo, grade) {
  const bounds = panelBounds(polygon);
  const bx = bounds.minX * width;
  const by = bounds.minY * height;
  const bw = bounds.width * width;
  const bh = bounds.height * height;
  ctx.save();
  tracePanelPath(ctx, polygon, width, height);
  ctx.clip();
  if (!photo) {
    drawSunsetBackdrop(ctx, bx, by, bw, bh, grade);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const scale = Math.max(bw / iw, bh / ih) * crop.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = bx + bw / 2 + crop.panX * (dw - bw) / 2;
  const cy = by + bh / 2 + crop.panY * (dh - bh) / 2;
  ctx.filter = grade.photoFilter;
  ctx.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** Strokes every panel edge in white over a wider black under-stroke, plus the frame: the poster's keylines. */
function paintKeylines(ctx, width, height, layout) {
  const lineWidth = Math.min(20, Math.max(6, width * 0.0095));
  ctx.save();
  ctx.lineJoin = 'round';
  // Black under-stroke first, so every white keyline sits in a dark groove like the printed key art.
  ctx.strokeStyle = '#0a0512';
  ctx.lineWidth = lineWidth * 1.85;
  for (const polygon of layout.panels) {
    tracePanelPath(ctx, polygon, width, height);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lineWidth;
  for (const polygon of layout.panels) {
    tracePanelPath(ctx, polygon, width, height);
    ctx.stroke();
  }
  ctx.strokeStyle = '#0a0512';
  ctx.lineWidth = lineWidth * 1.85;
  ctx.strokeRect(lineWidth * 0.9, lineWidth * 0.9, width - lineWidth * 1.8, height - lineWidth * 1.8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(lineWidth / 2, lineWidth / 2, width - lineWidth, height - lineWidth);
  ctx.restore();
  return lineWidth;
}

/** A faint diagonal sheen sweeping the top-left of the cover, like light across a printed poster sleeve. */
function paintSheen(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width * 0.75, height * 0.9);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.13)');
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.03)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Renders the cover described by `state` onto `ctx` at `width` x `height`.
 * `photosById` maps photo ids to loaded images. State panels beyond the layout's count are ignored, and
 * missing ones render as empty panels.
 */
export function renderCoverArt(ctx, width, height, state, photosById, options = {}) {
  const layout = getPanelLayout(state.layoutId);
  const grade = getGradePreset(state.gradeId);

  ctx.fillStyle = grade.base;
  ctx.fillRect(0, 0, width, height);

  layout.panels.forEach((polygon, index) => {
    const crop = state.panels[index] ?? createPanelCrop();
    const photo = crop.photoId ? photosById.get(crop.photoId) : null;
    paintPanelPhoto(ctx, width, height, polygon, crop, photo ?? null, grade);
    // A whisper of alternating tint so neighbouring panels read as separate photographs in the collage.
    ctx.save();
    tracePanelPath(ctx, polygon, width, height);
    ctx.clip();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = index % 2 === 0 ? '#ff2e88' : '#19e3d2';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  });

  paintGradeWashes(ctx, width, height, grade);
  paintKeylines(ctx, width, height, layout);

  if (options.highlightIndex >= 0 && layout.panels[options.highlightIndex]) {
    ctx.save();
    ctx.strokeStyle = '#19e3d2';
    ctx.lineWidth = Math.max(3, width * 0.004);
    ctx.setLineDash([width * 0.012, width * 0.008]);
    tracePanelPath(ctx, layout.panels[options.highlightIndex], width, height);
    ctx.stroke();
    ctx.restore();
  }

  if (state.overlays.sun) drawStripedSun(ctx, width * 0.79, height * 0.42, Math.min(width, height) * 0.135, grade);
  if (state.overlays.skyline) drawSkylineSilhouette(ctx, width, height, grade);
  if (state.overlays.palms) drawPalmClusters(ctx, width, height, grade);
  if (state.overlays.birds) drawBirdFlock(ctx, width, height, grade);

  paintSheen(ctx, width, height);
  paintFilmGrain(ctx, width, height, grade);
  paintVignette(ctx, width, height, grade);
  drawCoverLettering(ctx, width, height, state, grade);
}
