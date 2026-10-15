import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'manifold-3d';
import { defaults, makeParts } from '../src/model';
import { drawingSheets, holeKey, sheetSvg } from '../src/drawings';
import { makeSolid } from '../src/solids';
import { overwriteGetLocale, type Locale } from '../src/paraglide/runtime.js';

const api = await Module();
api.setup();
let locale: Locale = 'en';
overwriteGetLocale(() => locale);

test('sheets cover every instance and merge identical and mirrored boards', () => {
  const parts = makeParts(defaults);
  const sheets = drawingSheets(api, parts);
  assert.equal(sheets.length, 11);
  assert.deepEqual(sheets.flatMap(s => s.members.map(p => p.id)).sort(), parts.map(p => p.id).sort());
  const side = sheets.find(s => s.members.some(p => p.id === 'side-right'))!;
  assert.deepEqual(side.members.map(p => p.id), ['side-left', 'side-right']);
  assert.equal(side.mirrored.length, 1);
  assert.equal(sheets.find(s => s.title === 'Drawer front')!.members.length, 4);
  assert.equal(sheets.find(s => s.id === 'center')!.grooves[0].face, 'both');
  for (const sheet of sheets) {
    assert.ok(sheet.width >= sheet.height, sheet.title);
    assert.ok(sheet.grooves.every(g => g.face !== 'far'), sheet.title);
  }
});

test('outlines and groove depths reconstruct the volume of each solid', () => {
  for (const sheet of drawingSheets(api, makeParts(defaults))) {
    const area = sheet.outline.reduce((sum, polygon) => sum + polygon.reduce((a, [x, y], i) => {
      const [nx, ny] = polygon[(i + 1) % polygon.length];
      return a + (x * ny - nx * y) / 2;
    }, 0), 0);
    const grooveVolume = sheet.grooves.reduce((sum, { rect: [u0, v0, u1, v1], depth, face }) =>
      sum + (u1 - u0) * (v1 - v0) * depth * (face === 'both' ? 2 : 1), 0);
    // Overlapping holes make the volume ambiguous; hole coverage is checked separately.
    const solid = makeSolid(api, { ...sheet.members[0], holes: [] });
    try {
      assert.ok(Math.abs(Math.abs(area) * sheet.thickness - grooveVolume - solid.volume()) < 0.01, sheet.title);
    } finally { solid.delete(); }
  }
});

test('sheets follow applied dimensions and render to scale on A4', () => {
  const params = { ...defaults, Dl: 45, Dtol: 4, L: 1200 };
  const sheets = drawingSheets(api, makeParts(params));
  assert.equal(sheets.find(s => s.id === 'door-left')!.width, (params.L - 2 * params.T1 - 3 * params.Dtol) / 2);
  for (let i = 0; i < sheets.length; i++) {
    assert.ok([2, 2.5, 4, 5, 6, 8, 10, 12].includes(sheets[i].scale));
    assert.ok(sheets[i].width / sheets[i].scale < 277, sheets[i].title);
    const svg = sheetSvg(sheets[i], i, sheets.length);
    assert.ok(svg.includes('viewBox="0 0 297 210"'));
    assert.ok(svg.includes(`1:${sheets[i].scale}`));
    assert.ok(!svg.includes('NaN') && !svg.includes('Infinity'));
  }
});

test('sheets render in Catalan', () => {
  locale = 'ca';
  try {
    const sheets = drawingSheets(api, makeParts(defaults));
    const svg = sheetSvg(sheets.find(s => s.id === 'center')!, 0, sheets.length);
    for (const text of ['Panell central', 'Ranura de 3 d&apos;ample', 'a les dues cares', 'ESCALA', 'GRUIX']) assert.ok(svg.includes(text), text);
    assert.ok(sheets.some(s => s.title === 'Frontal de calaix'));
  } finally { locale = 'en'; }
});

test('every hole appears on its sheet and in a hole list row of its own colour', () => {
  for (const sheet of drawingSheets(api, makeParts(defaults))) {
    const holes = sheet.members[0].holes ?? [];
    assert.equal(sheet.faceHoles.length + sheet.edgeHoles.length, holes.length, sheet.title);
    for (const hole of [...sheet.faceHoles, ...sheet.edgeHoles]) assert.ok(sheet.holeColors[holeKey(hole)], sheet.title);
    assert.equal(new Set(Object.values(sheet.holeColors)).size, sheet.holeList.length, sheet.title);
  }
});

test('hole positions list one coordinate pair per hole', () => {
  const lines = drawingSheets(api, makeParts(defaults)).flatMap(s => s.holeList.map(r => r.lines.join(' ').replaceAll('\u00a0', ' ')));
  assert.ok(lines.some(l => l.endsWith('x,y: (60, 60) (60, 240) (471, 80) (471, 245) (881, 60) (881, 240)')));
  assert.ok(lines.some(l => l.endsWith('y,z: (80, 8) (220, 8)')));
  assert.ok(lines.some(l => l.endsWith('x,y,z: (15, 40, 14) (15, 205, 14)')));
});
