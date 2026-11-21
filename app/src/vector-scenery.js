// Hand-drawn vector scenery, all canvas paths in our own art: palm silhouettes, a city skyline, a striped retro
// sun and a bird flock. The renderer stamps them over the panels as poster graphics, and the sunset backdrop is
// what an empty panel shows, so a cover still looks designed before any photo is added. Placement randomness
// comes from a seeded generator, so renders — and screenshots — are deterministic.

/** A tiny seeded random generator (mulberry32): same seed, same scenery, every render. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One palm frond as a tapered leaf: out along an arching curve, back along a fuller one, drooping at the tip. */
function drawPalmFrond(ctx, x, y, angle, length, width) {
  const tipX = x + Math.cos(angle) * length;
  const tipY = y + Math.sin(angle) * length + length * 0.34;
  const midX = x + Math.cos(angle) * length * 0.45;
  const midY = y + Math.sin(angle) * length * 0.45 - length * 0.20;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(midX, midY - width, tipX, tipY);
  ctx.quadraticCurveTo(midX + width * 0.4, midY + width * 1.5, x, y);
  ctx.fill();
}

/** A palm tree silhouette rooted at (x, y), `size` tall, leaning `lean` (-1..1). Fill colour is the caller's. */
export function drawPalmSilhouette(ctx, x, y, size, lean = 0.3) {
  const topX = x + lean * size * 0.32;
  const topY = y - size;
  const trunkHalf = size * 0.038;
  ctx.beginPath();
  ctx.moveTo(x - trunkHalf, y);
  ctx.quadraticCurveTo(x + lean * size * 0.16, y - size * 0.55, topX - trunkHalf * 0.7, topY);
  ctx.lineTo(topX + trunkHalf * 0.7, topY);
  ctx.quadraticCurveTo(x + lean * size * 0.20, y - size * 0.5, x + trunkHalf, y);
  ctx.closePath();
  ctx.fill();
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const angle = Math.PI * (0.92 + (i / (fronds - 1)) * 1.18);
    drawPalmFrond(ctx, topX, topY, angle, size * (0.34 + (i % 3) * 0.05), size * 0.030);
  }
  ctx.beginPath();
  ctx.arc(topX - size * 0.045, topY + size * 0.045, size * 0.042, 0, Math.PI * 2);
  ctx.arc(topX + size * 0.055, topY + size * 0.055, size * 0.034, 0, Math.PI * 2);
  ctx.fill();
}

/** Two palm clusters framing the bottom corners of the cover, sized off the cover's smaller dimension. */
export function drawPalmClusters(ctx, width, height, grade) {
  ctx.save();
  ctx.fillStyle = grade.silhouette;
  const unit = Math.min(width, height);
  const base = height * 1.005;
  drawPalmSilhouette(ctx, width * 0.02, base, unit * 0.44, 0.35);
  drawPalmSilhouette(ctx, width * 0.09, base, unit * 0.31, 0.5);
  drawPalmSilhouette(ctx, width * 0.98, base, unit * 0.47, -0.38);
  drawPalmSilhouette(ctx, width * 0.90, base, unit * 0.28, -0.55);
  ctx.restore();
}

/** A skyline silhouette along the bottom edge, with a few lit windows. Seeded, so it never changes between renders. */
export function drawSkylineSilhouette(ctx, width, height, grade) {
  const rand = seededRandom(20261119);
  const baseY = height;
  const unit = Math.min(width, height);
  ctx.save();
  ctx.fillStyle = grade.silhouette;
  let x = -width * 0.01;
  const windows = [];
  while (x < width * 1.01) {
    const bw = width * (0.026 + rand() * 0.046);
    const bh = unit * (0.05 + rand() * 0.13);
    ctx.fillRect(x, baseY - bh, bw, bh);
    const capRoll = rand();
    if (capRoll > 0.78) {
      // Antenna spire with a blinking-beacon dot, drawn later in window gold.
      const ax = x + bw * 0.5;
      ctx.fillRect(ax - Math.max(1, width * 0.0012), baseY - bh - unit * 0.045, Math.max(2, width * 0.0024), unit * 0.045);
      windows.push([ax - Math.max(1.5, width * 0.0028), baseY - bh - unit * 0.052]);
    } else if (capRoll > 0.5) {
      ctx.fillRect(x + bw * 0.3, baseY - bh - unit * 0.016, bw * 0.4, unit * 0.016);
    } else if (capRoll > 0.34) {
      // Water-tower cap: a small trapezoid tank on legs.
      ctx.fillRect(x + bw * 0.22, baseY - bh - unit * 0.03, bw * 0.56, unit * 0.026);
      ctx.fillRect(x + bw * 0.34, baseY - bh - unit * 0.004, bw * 0.1, unit * 0.006);
      ctx.fillRect(x + bw * 0.56, baseY - bh - unit * 0.004, bw * 0.1, unit * 0.006);
    }
    for (let wy = baseY - bh + unit * 0.014; wy < baseY - unit * 0.012; wy += unit * 0.019) {
      for (let wx = x + bw * 0.16; wx < x + bw * 0.8; wx += bw * 0.2) {
        if (rand() > 0.68) windows.push([wx, wy]);
      }
    }
    x += bw + width * (0.004 + rand() * 0.012);
  }
  ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
  const winW = Math.max(2, width * 0.004);
  const winH = Math.max(2, unit * 0.007);
  for (const [wx, wy] of windows) ctx.fillRect(wx, wy, winW, winH);
  ctx.restore();
}

/** The striped retro sun: a gradient disc with dark slices across its lower half, all clipped inside the disc. */
export function drawStripedSun(ctx, cx, cy, radius, grade) {
  ctx.save();
  // A warm halo first, so the sun glows against whatever panel it lands on.
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 2.3);
  halo.addColorStop(0, grade.sunRim);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 2.3, cy - radius * 2.3, radius * 4.6, radius * 4.6);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  gradient.addColorStop(0, grade.sunCore);
  gradient.addColorStop(1, grade.sunRim);
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.fillStyle = grade.silhouette;
  let y = cy + radius * 0.10;
  let gap = radius * 0.05;
  while (y < cy + radius) {
    ctx.fillRect(cx - radius, y, radius * 2, gap);
    y += gap + radius * 0.17;
    gap *= 1.45;
  }
  ctx.restore();
}

/** A loose flock of small birds clustered in the upper-left sky, clear of the lettering and faces. Seeded. */
export function drawBirdFlock(ctx, width, height, grade) {
  const rand = seededRandom(61119);
  ctx.save();
  ctx.strokeStyle = grade.silhouette;
  ctx.lineWidth = Math.max(1.4, height * 0.003);
  ctx.lineCap = 'round';
  const birds = 7;
  for (let i = 0; i < birds; i++) {
    const bx = width * (0.05 + rand() * 0.3);
    const by = height * (0.05 + rand() * 0.11);
    const s = height * (0.006 + rand() * 0.007);
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.8, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.8, bx + s, by);
    ctx.stroke();
  }
  ctx.restore();
}

/** The drawn sunset scene an empty panel shows: graded sky, striped sun, sea band and one palm. */
export function drawSunsetBackdrop(ctx, x, y, width, height, grade) {
  const sky = ctx.createLinearGradient(0, y, 0, y + height);
  const stops = grade.sky;
  stops.forEach((colour, i) => sky.addColorStop(i / (stops.length - 1), colour));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, width, height);
  const horizon = y + height * 0.62;
  drawStripedSun(ctx, x + width * 0.68, horizon - height * 0.05, Math.min(width, height) * 0.30, grade);
  ctx.fillStyle = grade.sea;
  ctx.fillRect(x, horizon, width, height - (horizon - y));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
  const rand = seededRandom(Math.floor(x + y + width));
  for (let i = 0; i < 12; i++) {
    const wy = horizon + rand() * (height - (horizon - y)) * 0.9;
    ctx.fillRect(x + rand() * width * 0.9, wy, width * (0.03 + rand() * 0.07), Math.max(1.5, height * 0.004));
  }
  ctx.fillStyle = grade.silhouette;
  drawPalmSilhouette(ctx, x + width * 0.10, y + height * 1.0, height * 0.52, 0.4);
}
