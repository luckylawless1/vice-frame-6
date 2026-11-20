// layouts.js — VICE FRAME 6 panel geometry.
// Every layout returns panels in normalised cover coordinates (0..1).
// A panel is { x, y, w, h } plus an optional `poly` list of [x,y] points
// used for diagonal-cut panels, and a `hero` flag for full-bleed art.

function rect(x, y, w, h, extra) {
  return Object.assign({ x, y, w, h, poly: null, hero: false }, extra || {});
}

function coverStar() {
  return [
    rect(0, 0, 0.62, 1),
    rect(0.62, 0, 0.38, 0.5),
    rect(0.62, 0.5, 0.38, 0.5),
  ];
}

function collageFour() {
  return [
    rect(0, 0, 0.5, 0.5), rect(0.5, 0, 0.5, 0.5),
    rect(0, 0.5, 0.5, 0.5), rect(0.5, 0.5, 0.5, 0.5),
  ];
}

function panelGrid() {
  const out = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    out.push(rect(c / 3, r / 2, 1 / 3, 0.5));
  }
  return out;
}

function crewWide() {
  return [
    rect(0, 0, 1, 0.58),
    rect(0, 0.58, 0.5, 0.42),
    rect(0.5, 0.58, 0.5, 0.42),
  ];
}

function coverCloseup() {
  return [
    rect(0, 0, 0.75, 1),
    rect(0.75, 0, 0.25, 0.5),
    rect(0.75, 0.5, 0.25, 0.5),
  ];
}

function angledGrid() {
  // Parallelogram panels: each rect is sheared by a diagonal cut.
  const shear = 0.09;
  const mk = (x, y, w, h) => ({
    x, y, w, h, hero: false,
    poly: [[x + shear, y], [x + w, y], [x + w - shear, y + h], [x, y + h]],
  });
  return [mk(0, 0, 0.52, 0.52), mk(0.48, 0, 0.52, 0.52), mk(0, 0.48, 0.52, 0.52), mk(0.48, 0.48, 0.52, 0.52)];
}

function mastheadHero() {
  return [
    rect(0, 0, 1, 1, { hero: true }),
    rect(0.04, 0.70, 0.27, 0.24),
    rect(0.69, 0.70, 0.27, 0.24),
  ];
}

function storyboardStrip() {
  const out = [];
  for (let i = 0; i < 4; i++) out.push(rect(i * 0.25, 0, 0.25, 1, { scene: i }));
  return out;
}

export const LAYOUTS = [
  { id: 'cover-star', name: 'Cover Star', make: coverStar },
  { id: 'collage-four', name: 'Collage Four', make: collageFour },
  { id: 'panel-grid', name: 'Panel Grid', make: panelGrid },
  { id: 'crew-wide', name: 'Crew Wide', make: crewWide },
  { id: 'cover-closeup', name: 'Cover Closeup', make: coverCloseup },
  { id: 'angled-grid', name: 'Angled Grid', make: angledGrid },
  { id: 'masthead-hero', name: 'Masthead Hero', make: mastheadHero },
  { id: 'storyboard', name: 'Storyboard Strip', make: storyboardStrip },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export const DEFAULT_ROLES = ['THE DRIVER', 'THE FIXER', 'THE SIREN', 'THE LOOKOUT', 'THE WHEELMAN', 'THE GHOST'];
export const DEFAULT_SCENES = ['THE MEET', 'THE CHASE', 'THE DOUBLE-CROSS', 'THE GETAWAY'];
