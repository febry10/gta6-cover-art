// The genre lettering: a stacked title block at the top of the cover — a letterspaced kicker over a huge
// condensed title, with an optional roman-numeral badge standing behind the title. Letters are drawn one by one
// so the tracking is exact, under a horizontal squeeze that condenses any bold system font into poster lettering.
// Every word wears the genre's uniform: a hard black drop shadow, a thick black outline, a white-to-sunset
// gradient fill and a thin bright keyline. All type is set in system fonts — no font files, nothing borrowed.

const COVER_FONT_STACK = '"Archivo Narrow", "Arial Narrow", "Liberation Sans", "DejaVu Sans", sans-serif';
const CONDENSE = 0.82;

/** Sets the context's font for cover lettering at `size` pixels. */
function setLetteringFont(ctx, size, weight = 900) {
  ctx.font = `${weight} ${size}px ${COVER_FONT_STACK}`;
}

/** The width of `text` drawn letter by letter with `tracking` pixels between letters (before condensing). */
function trackedTextWidth(ctx, text, tracking) {
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width;
  return width + tracking * Math.max(0, text.length - 1);
}

/** Shrinks the font from `startSize` until the tracked, condensed text fits `maxWidth`. Returns the size used. */
function fitLetteringSize(ctx, text, maxWidth, startSize, trackingEm) {
  let size = startSize;
  setLetteringFont(ctx, size);
  while (size > 10 && trackedTextWidth(ctx, text, trackingEm * size) * CONDENSE > maxWidth) {
    size *= 0.94;
    setLetteringFont(ctx, size);
  }
  return size;
}

/** Draws `text` centred on `cx` at `baselineY`, letter by letter, in the current fill or stroke style. */
function drawTrackedText(ctx, text, cx, baselineY, tracking, mode) {
  const total = trackedTextWidth(ctx, text, tracking);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const ch of text) {
    if (mode === 'stroke') ctx.strokeText(ch, x, baselineY);
    else ctx.fillText(ch, x, baselineY);
    x += ctx.measureText(ch).width + tracking;
  }
}

/** One fully dressed word: hard shadow, thick black outline, gradient fill, bright keyline. */
function drawDressedWord(ctx, text, cx, baselineY, size, trackingEm, grade) {
  const tracking = trackingEm * size;
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(CONDENSE, 1);
  setLetteringFont(ctx, size);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // Hard drop shadow.
  ctx.fillStyle = 'rgba(5, 2, 12, 0.9)';
  drawTrackedText(ctx, text, size * 0.045, baselineY + size * 0.055, tracking, 'fill');
  // Thick black outline.
  ctx.strokeStyle = '#0a0512';
  ctx.lineWidth = size * 0.17;
  drawTrackedText(ctx, text, 0, baselineY, tracking, 'stroke');
  // Gradient fill, white at the top melting into the grade's sunset.
  const gradient = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.12);
  gradient.addColorStop(0, grade.letterTop);
  gradient.addColorStop(0.55, grade.letterMid);
  gradient.addColorStop(1, grade.letterLow);
  ctx.fillStyle = gradient;
  drawTrackedText(ctx, text, 0, baselineY, tracking, 'fill');
  // Thin bright keyline.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1, size * 0.022);
  drawTrackedText(ctx, text, 0, baselineY, tracking, 'stroke');
  ctx.restore();
}

/**
 * Draws the whole title block: badge numeral behind, title across it, kicker above.
 * `words` is { kicker, title, badge } — any may be empty. The block lives in the top third of the cover.
 */
export function drawCoverLettering(ctx, width, height, words, grade) {
  const title = (words.title ?? '').trim().toUpperCase();
  const kicker = (words.kicker ?? '').trim().toUpperCase();
  const badge = (words.badge ?? '').trim().toUpperCase();
  if (!title && !kicker && !badge) return;

  const hasBadge = badge.length > 0;
  const titleBaseline = height * (hasBadge ? 0.315 : 0.27);

  if (hasBadge) {
    const badgeSize = fitLetteringSize(ctx, badge, width * 0.58, Math.min(height * 0.43, width * 0.5), 0.02);
    ctx.save();
    ctx.translate(width / 2, 0);
    ctx.scale(CONDENSE, 1);
    setLetteringFont(ctx, badgeSize);
    ctx.lineJoin = 'round';
    const badgeBaseline = height * 0.42;
    ctx.strokeStyle = '#0a0512';
    ctx.lineWidth = badgeSize * 0.15;
    drawTrackedText(ctx, badge, 0, badgeBaseline, badgeSize * 0.02, 'stroke');
    const gradient = ctx.createLinearGradient(0, badgeBaseline - badgeSize, 0, badgeBaseline);
    gradient.addColorStop(0, grade.letterTop);
    gradient.addColorStop(0.45, grade.letterMid);
    gradient.addColorStop(1, grade.letterLow);
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(5, 2, 12, 0.55)';
    ctx.shadowBlur = badgeSize * 0.05;
    ctx.shadowOffsetY = badgeSize * 0.02;
    drawTrackedText(ctx, badge, 0, badgeBaseline, badgeSize * 0.02, 'fill');
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(1.2, badgeSize * 0.02);
    drawTrackedText(ctx, badge, 0, badgeBaseline, badgeSize * 0.02, 'stroke');
    ctx.restore();
  }

  if (title) {
    const titleSize = fitLetteringSize(ctx, title, width * 0.94, height * 0.185, 0.012);
    drawDressedWord(ctx, title, width / 2, titleBaseline, titleSize, 0.012, grade);
    if (kicker) {
      const kickerSize = fitLetteringSize(ctx, kicker, width * 0.8, height * 0.037, 0.34);
      drawDressedWord(ctx, kicker, width / 2, titleBaseline - titleSize * 1.22, kickerSize, 0.34, grade);
    }
  } else if (kicker) {
    const kickerSize = fitLetteringSize(ctx, kicker, width * 0.8, height * 0.05, 0.34);
    drawDressedWord(ctx, kicker, width / 2, height * 0.16, kickerSize, 0.34, grade);
  }
}
