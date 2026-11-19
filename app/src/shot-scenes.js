// Deterministic scenes for screenshots, driven by the URL query (shots.json lists them):
//   ?shot=cover&layout=poster5&grade=leonida&photos=pier,boulevard&kicker=WELCOME%20TO&title=VICE%20CITY&badge=VI&size=1920x1080
//   ?shot=editor&... (same scene, shown inside the editor, `selected` picks the highlighted panel)
// `photos` names bundled samples (samples/<name>.jpg), assigned to panels in order, cycling when the layout has
// more panels than photos. `zooms` is an optional comma list of per-panel zoom factors, and `pans` an optional
// semicolon list of per-panel "panX,panY" pairs. The editor applies the scene, renders, and sets
// window.__shotReady once painted, so a screenshot never catches a half-loaded cover.

const DEFAULT_ZOOMS = [1.12, 1.32, 1.18, 1.45, 1.22, 1.28, 1.15, 1.38];
const SAMPLE_NAMES = { pier: 'Pier Fisher', boulevard: 'Boulevard Sunset' };

/** The friendly display name of a bundled sample photo. */
export function sampleDisplayName(sampleName) {
  return SAMPLE_NAMES[sampleName] ?? sampleName;
}

export function parseShotScene(params) {
  const sizeMatch = /^(\d+)x(\d+)$/.exec(params.get('size') ?? '1920x1080');
  const photoNames = (params.get('photos') ?? 'pier,boulevard')
    .split(',').map((name) => name.trim()).filter(Boolean);
  const zooms = (params.get('zooms') ?? '')
    .split(',').map((z) => Number.parseFloat(z)).filter((z) => Number.isFinite(z) && z > 0);
  const pans = (params.get('pans') ?? '')
    .split(';').map((pair) => pair.split(',').map((v) => Number.parseFloat(v)))
    .filter((pair) => pair.length === 2 && pair.every(Number.isFinite));
  const overlayNames = (params.get('overlays') ?? 'palms,skyline,sun').split(',').map((s) => s.trim());
  return {
    mode: params.get('shot') === 'editor' ? 'editor' : 'cover',
    layoutId: params.get('layout') ?? 'poster5',
    gradeId: params.get('grade') ?? 'leonida',
    photoNames,
    zooms: zooms.length ? zooms : DEFAULT_ZOOMS,
    pans,
    kicker: params.get('kicker') ?? 'WELCOME TO',
    title: params.get('title') ?? 'VICE CITY',
    badge: params.get('badge') ?? 'VI',
    sizeW: sizeMatch ? Number(sizeMatch[1]) : 1920,
    sizeH: sizeMatch ? Number(sizeMatch[2]) : 1080,
    selected: Math.max(0, Number.parseInt(params.get('selected') ?? '0', 10) || 0),
    overlays: {
      palms: overlayNames.includes('palms'),
      skyline: overlayNames.includes('skyline'),
      sun: overlayNames.includes('sun'),
      birds: overlayNames.includes('birds'),
    },
  };
}
