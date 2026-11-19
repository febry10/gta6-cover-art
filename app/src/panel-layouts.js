// The multi-panel poster layouts. Each layout is a set of polygons in unit space (0..1 on both axes) that tile the
// whole frame with slanted shared edges, in the genre's collage style. The renderer scales the polygons to whatever
// export size is chosen, so one layout reflows across landscape, square, portrait and story covers: panels keep
// their slant, photos re-crop inside them.

export const PANEL_LAYOUTS = [
  {
    id: 'poster5',
    name: 'Poster Five',
    panels: [
      [[0, 0], [0.46, 0], [0.445, 0.52], [0, 0.58]],
      [[0, 0.58], [0.445, 0.52], [0.38, 1], [0, 1]],
      [[0.46, 0], [1, 0], [1, 0.30], [0.435, 0.36]],
      [[0.435, 0.36], [1, 0.30], [1, 0.64], [0.41, 0.68]],
      [[0.41, 0.68], [1, 0.64], [1, 1], [0.38, 1]],
    ],
  },
  {
    id: 'trio3',
    name: 'Trio',
    panels: [
      [[0, 0], [0.58, 0], [0.50, 1], [0, 1]],
      [[0.58, 0], [1, 0], [1, 0.52], [0.535, 0.58]],
      [[0.535, 0.58], [1, 0.52], [1, 1], [0.50, 1]],
    ],
  },
  {
    id: 'quad4',
    name: 'Quad',
    panels: [
      [[0, 0], [0.52, 0], [0.48, 0.46], [0, 0.52]],
      [[0.52, 0], [1, 0], [1, 0.54], [0.48, 0.46]],
      [[0, 0.52], [0.48, 0.46], [0.44, 1], [0, 1]],
      [[0.48, 0.46], [1, 0.54], [1, 1], [0.44, 1]],
    ],
  },
  {
    id: 'hero1',
    name: 'Solo Hero',
    panels: [
      [[0, 0], [1, 0], [1, 1], [0, 1]],
    ],
  },
];

/** Returns the layout with this id, falling back to Poster Five. */
export function getPanelLayout(layoutId) {
  return PANEL_LAYOUTS.find((layout) => layout.id === layoutId) ?? PANEL_LAYOUTS[0];
}

/** The axis-aligned bounding box of a unit-space polygon, in unit space. */
export function panelBounds(polygon) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** The centroid of a unit-space polygon: where its photo is centred before the user's pan is applied. */
export function panelCentroid(polygon) {
  let x = 0, y = 0;
  for (const [px, py] of polygon) { x += px; y += py; }
  return { x: x / polygon.length, y: y / polygon.length };
}

/** True when the unit-space point (x, y) falls inside the polygon: the editor's panel hit test. */
export function pointInPanel(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Traces a unit-space polygon onto a context already scaled to the cover's pixel size. */
export function tracePanelPath(ctx, polygon, width, height) {
  ctx.beginPath();
  polygon.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x * width, y * height);
    else ctx.lineTo(x * width, y * height);
  });
  ctx.closePath();
}
