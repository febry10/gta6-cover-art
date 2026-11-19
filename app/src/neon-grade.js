// The colour grades: each preset is a photo filter (applied as the photo is drawn), a stack of full-cover washes
// (gradients blended over the panels), a sky palette for empty panels, and grain / vignette strengths. Everything
// is drawn with canvas gradients and composite modes — no pixel loops — so even a 1920 x 1080 export grades in
// milliseconds.

export const GRADE_PRESETS = [
  {
    id: 'leonida',
    name: 'Leonida Sunset',
    photoFilter: 'saturate(1.38) contrast(1.09) brightness(1.03)',
    base: '#2a1140',
    sky: ['#2e1a8f', '#b42a9e', '#ff5e62', '#ff9a3d', '#ffd23d'],
    sea: '#123a5e',
    silhouette: '#1c0b30',
    washes: [
      { op: 'soft-light', alpha: 0.55, from: [0, 0], to: [0, 1], stops: [[0, '#4a1d9e'], [0.45, '#ff2e88'], [0.75, '#ff7a3d'], [1, '#3d0a4e']] },
      { op: 'screen', alpha: 0.30, from: [0.15, 1], to: [0.9, 0.1], stops: [[0, '#ff2e88'], [0.55, '#ff9a3d'], [1, 'rgba(255, 210, 61, 0)']] },
      { op: 'multiply', alpha: 0.22, from: [0, 0], to: [0, 0.4], stops: [[0, '#1a0b38'], [1, 'rgba(26, 11, 56, 0)']] },
    ],
    sunCore: '#ffe9a8', sunRim: '#ff7a3d',
    letterTop: '#ffffff', letterMid: '#ffd9a0', letterLow: '#ff5e62',
    grain: 0.05, vignette: 0.32,
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    photoFilter: 'saturate(1.5) contrast(1.16) brightness(0.98)',
    base: '#04060f',
    sky: ['#02030c', '#0a2a6e', '#7a1fa2', '#ff2ee6', '#19e3d2'],
    sea: '#06283d',
    silhouette: '#02020a',
    washes: [
      { op: 'soft-light', alpha: 0.6, from: [0, 0], to: [1, 1], stops: [[0, '#19e3d2'], [0.5, '#141452'], [1, '#ff2ee6']] },
      { op: 'screen', alpha: 0.22, from: [0, 1], to: [0.4, 0], stops: [[0, '#19e3d2'], [1, 'rgba(25, 227, 210, 0)']] },
      { op: 'multiply', alpha: 0.3, from: [0, 0], to: [0, 0.5], stops: [[0, '#01020a'], [1, 'rgba(1, 2, 10, 0)']] },
    ],
    sunCore: '#d8fbff', sunRim: '#19e3d2',
    letterTop: '#ffffff', letterMid: '#a5f3ff', letterLow: '#ff2ee6',
    grain: 0.06, vignette: 0.42,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    photoFilter: 'saturate(1.22) contrast(1.05) brightness(1.06) sepia(0.18)',
    base: '#33160a',
    sky: ['#5e2a10', '#b3541e', '#ff9a3d', '#ffc46b', '#fff0b3'],
    sea: '#274b4f',
    silhouette: '#2a1206',
    washes: [
      { op: 'soft-light', alpha: 0.5, from: [0, 0], to: [0, 1], stops: [[0, '#8a4b12'], [0.6, '#ff9a3d'], [1, '#5e2408']] },
      { op: 'screen', alpha: 0.26, from: [0.3, 1], to: [0.75, 0.15], stops: [[0, '#ffb35c'], [1, 'rgba(255, 179, 92, 0)']] },
    ],
    sunCore: '#fff3c4', sunRim: '#ff9a3d',
    letterTop: '#ffffff', letterMid: '#ffe3ae', letterLow: '#ff9a3d',
    grain: 0.045, vignette: 0.28,
  },
  {
    id: 'noir',
    name: 'Midnight Noir',
    photoFilter: 'grayscale(1) contrast(1.28) brightness(1.02)',
    base: '#0a0a0e',
    sky: ['#060608', '#23232e', '#55555f', '#9a9aa5', '#e8e8f0'],
    sea: '#17171f',
    silhouette: '#050507',
    washes: [
      { op: 'soft-light', alpha: 0.45, from: [0, 0], to: [1, 0], stops: [[0, '#8fa3c7'], [1, '#3d3d4a']] },
      { op: 'multiply', alpha: 0.25, from: [0, 0.6], to: [0, 1], stops: [[0, 'rgba(0, 0, 0, 0)'], [1, '#000000']] },
    ],
    sunCore: '#f2f2f5', sunRim: '#9a9aa5',
    letterTop: '#ffffff', letterMid: '#d7d7de', letterLow: '#6d6d78',
    grain: 0.09, vignette: 0.5,
  },
];

/** Returns the grade preset with this id, falling back to Leonida Sunset. */
export function getGradePreset(gradeId) {
  return GRADE_PRESETS.find((grade) => grade.id === gradeId) ?? GRADE_PRESETS[0];
}

/** Blends the preset's washes over the whole cover, in order. `stops` are [offset, colour] pairs. */
export function paintGradeWashes(ctx, width, height, grade) {
  for (const wash of grade.washes) {
    const gradient = ctx.createLinearGradient(
      wash.from[0] * width, wash.from[1] * height,
      wash.to[0] * width, wash.to[1] * height,
    );
    for (const [offset, colour] of wash.stops) gradient.addColorStop(offset, colour);
    ctx.save();
    ctx.globalCompositeOperation = wash.op;
    ctx.globalAlpha = wash.alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

/** A soft dark vignette that pulls the eye to the middle of the cover. */
export function paintVignette(ctx, width, height, grade) {
  const radius = Math.hypot(width, height) * 0.62;
  const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * 0.45, width / 2, height / 2, radius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

let grainPattern = null;

/** Deterministic film grain: one seeded noise tile, pattern-filled over the cover at the preset's strength. */
export function paintFilmGrain(ctx, width, height, grade) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tileCtx = tile.getContext('2d');
    const image = tileCtx.createImageData(140, 140);
    let seed = 987654321;
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.floor(next() * 255);
      image.data[i] = v; image.data[i + 1] = v; image.data[i + 2] = v; image.data[i + 3] = 255;
    }
    tileCtx.putImageData(image, 0, 0);
    grainPattern = tile;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grade.grain;
  ctx.fillStyle = ctx.createPattern(grainPattern, 'repeat');
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
