import type { ManifoldToplevel } from 'manifold-3d';
import type { Part, V2 } from './model';
import { m } from './paraglide/messages.js';

type Rect = [number, number, number, number];
type Face = 'near' | 'far' | 'both';
export type Groove = { rect: Rect; depth: number; face: Face };
type Side = 'top' | 'bottom' | 'left' | 'right';
// `face` is 'both' for through holes. Edge holes: `entry` is where the hole starts across the edge, `across` is from the near face.
export type FaceHole = { at: V2; diameter: number; depth: number; face: Face };
export type EdgeHole = { side: Side; along: number; entry: number; across: number; diameter: number; depth: number };
export type Sheet = {
  id: string; title: string; members: Part[]; mirrored: Part[]; material: Part['material']; thickness: number;
  width: number; height: number; outline: V2[][]; cuts: Rect[]; grooves: Groove[];
  faceHoles: FaceHole[]; edgeHoles: EdgeHole[]; holeList: { color: string; lines: string[] }[]; holeColors: Record<string, string>;
  scale: number;
};
type Note = { at: V2; dir: V2; text: string; inner?: boolean };

const PAGE = { w: 297, h: 210, frame: 9, tableW: 120, tableH: 22 };
const AREA = { x: 9, y: 9, w: 279, h: 168 };
const SCALES = [2, 2.5, 4, 5, 6, 8, 10, 12];
const ROW = 7, FIRST_ROW = 8, TEXT = 3, NOTE_GAP = 6, MIRROR_GAP = 10, STRIP_GAP = 6;
const ORIGIN = { d: 5, text: 2.6, main: '0,0', side: 'z 0' };
const originWidth = (label: string) => textWidth(label, ORIGIN.text) + 2;
const LIST = { text: 2.6, row: 4.2, w: PAGE.w - 2 * PAGE.frame - PAGE.tableW - 8 };
// High-contrast colours, one per hole-list row; blue is taken by grooves.
const HOLE_COLORS = ['#e6194b', '#3cb44b', '#f58231', '#911eb4', '#9a6324', '#f032e6', '#008080', '#808000', '#000000'];
export const holeKey = (h: FaceHole | EdgeHole) => 'side' in h ? `e|${h.diameter}|${h.depth}|${h.side}` : `f|${h.diameter}|${h.depth}|${h.face}`;
const eps = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < eps;
// Decimal point in every locale: a decimal comma is ambiguous in the comma-separated hole lists.
const fmt = (value: number) => value.toLocaleString('en', { maximumFractionDigits: 2, useGrouping: false });
const xml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
const textWidth = (text: string, size = TEXT) => text.length * size * 0.55;

function plane(part: Part) {
  if (part.category === 'sides' || part.id.startsWith('side-') || part.id === 'center') return [0, 1, 2];
  if (part.category === 'bottoms' || ['desk', 'top-board', 'bottom-board'].includes(part.id)) return [2, 0, 1];
  return [2, 1, 0];
}

const titles: Partial<Record<Part['category'], () => string>> = {
  backs: m.sheet_cabinet_back, doors: m.sheet_door, fronts: m.sheet_drawer_front, sides: m.sheet_drawer_side,
  drawerBacks: m.sheet_drawer_back, bottoms: m.sheet_drawer_bottom,
};
const title = (part: Part) => titles[part.category]?.() ?? (part.id.startsWith('side-') ? m.sheet_side_board() : part.name);

function transforms(W: number, H: number) {
  return [
    { map: ([u, v]: V2): V2 => [u, v], w: W, h: H, flip: false },
    { map: ([u, v]: V2): V2 => [W - u, v], w: W, h: H, flip: true },
    { map: ([u, v]: V2): V2 => [u, H - v], w: W, h: H, flip: true },
    { map: ([u, v]: V2): V2 => [W - u, H - v], w: W, h: H, flip: false },
    { map: ([u, v]: V2): V2 => [v, u], w: H, h: W, flip: true },
    { map: ([u, v]: V2): V2 => [H - v, u], w: H, h: W, flip: false },
    { map: ([u, v]: V2): V2 => [v, W - u], w: H, h: W, flip: false },
    { map: ([u, v]: V2): V2 => [H - v, W - u], w: H, h: W, flip: true },
  ];
}

// Lays the board flat with its longest side horizontal and its grooves facing the viewer.
// Turning a board over is a 2D reflection, so identical boards always get the same drawing.
// `mirror` swaps the faces, which gives the drawing of the board's mirror image.
function canonical(part: Part, mirror = false) {
  const [u, v, n] = plane(part);
  const W = part.size[u], H = part.size[v];
  const viewedFace = ((v - u + 3) % 3 === 1) !== mirror ? 'B' : 'A';
  const rawGrooves: { rect: Rect; depth: number; face: 'A' | 'B' | 'AB' }[] = [];
  for (const cut of part.cuts.filter(c => c.groove)) {
    const rect: Rect = [cut.min[u], cut.min[v], cut.max[u], cut.max[v]];
    const depth = cut.max[n] - cut.min[n];
    const face = near(cut.min[n], 0) ? 'A' : 'B';
    const twin = rawGrooves.find(g => g.rect.every((x, i) => near(x, rect[i])) && near(g.depth, depth) && g.face !== face);
    if (twin) twin.face = 'AB';
    else rawGrooves.push({ rect, depth, face });
  }
  const cuts = part.cuts.filter(c => !c.groove).map(c => [c.min[u], c.min[v], c.max[u], c.max[v]] as Rect);
  const T = part.size[n];
  const rawHoles = (part.holes ?? []).map(h => ({
    at: [h.at[u], h.at[v]] as V2, step: (h.axis === u ? [h.dir, 0] : [0, h.dir]) as V2,
    edge: h.axis !== n, n: h.at[n], diameter: h.diameter, depth: h.depth,
    face: near(h.depth, T) ? 'AB' : near(h.at[n], 0) ? 'A' : 'B',
  }));
  const outer: V2[] = part.profile ? part.profile.points.map(([x, z]) => [z, x]) : [[0, 0], [W, 0], [W, H], [0, H]];
  const holes = part.profileCuts ?? [];
  const round = (x: number) => Math.round(x * 1000) / 1000 + 0;
  const pointsKey = (points: V2[]) => points.map(p => p.map(round).join(',')).sort().join(' ');
  const candidates = transforms(W, H).filter(t => t.w >= t.h - eps).map(t => {
    const rect = ([u0, v0, u1, v1]: Rect): Rect => {
      const [a, b] = [t.map([u0, v0]), t.map([u1, v1])];
      return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
    };
    const seen = (viewedFace === 'B') !== t.flip ? 'B' : 'A';
    const grooves = rawGrooves.map(g => ({ rect: rect(g.rect), depth: g.depth, face: (g.face === 'AB' ? 'both' : g.face === seen ? 'near' : 'far') as Face }));
    const faceHoles: FaceHole[] = rawHoles.filter(h => !h.edge).map(h => ({
      at: t.map(h.at), diameter: h.diameter, depth: h.depth,
      face: h.face === 'AB' ? 'both' : h.face === seen ? 'near' : 'far',
    }));
    const edgeHoles: EdgeHole[] = rawHoles.filter(h => h.edge).map(h => {
      const at = t.map(h.at), next = t.map([h.at[0] + h.step[0], h.at[1] + h.step[1]]);
      const [du, dv] = [next[0] - at[0], next[1] - at[1]];
      const side: Side = du > 0.5 ? 'left' : du < -0.5 ? 'right' : dv > 0.5 ? 'bottom' : 'top';
      const vertical = Math.abs(du) > 0.5;
      return { side, along: at[vertical ? 1 : 0], entry: at[vertical ? 0 : 1], across: seen === 'A' ? h.n : T - h.n, diameter: h.diameter, depth: h.depth };
    });
    const geometry = { width: t.w, height: t.h, cuts: cuts.map(rect), outer: outer.map(t.map), holes: holes.map(h => h.map(t.map)), grooves, faceHoles, edgeHoles };
    const key = JSON.stringify([
      geometry.cuts.map(r => r.map(round).join(',')).sort(),
      pointsKey(geometry.outer), geometry.holes.map(pointsKey).sort(),
      grooves.map(g => [...g.rect.map(round), round(g.depth), g.face].join(',')).sort(),
      faceHoles.map(h => [...h.at.map(round), h.diameter, round(h.depth), h.face].join(',')).sort(),
      edgeHoles.map(h => [h.side, round(h.along), round(h.entry), round(h.across), h.diameter, round(h.depth)].join(',')).sort(),
    ]);
    const nearHoles = faceHoles.filter(h => h.face === 'near').length;
    return { geometry, key, score: grooves.filter(g => g.face !== 'far').length * 1000 + nearHoles };
  });
  const best = Math.max(...candidates.map(c => c.score));
  return candidates.filter(c => c.score === best).sort((a, b) => a.key < b.key ? -1 : 1)[0];
}

export function drawingSheets(api: ManifoldToplevel, parts: Part[]): Sheet[] {
  const groups = new Map<string, { members: Part[]; mirrored: Part[]; geometry: ReturnType<typeof canonical>['geometry'] }>();
  for (const part of parts) {
    const { geometry, key } = canonical(part);
    const prefix = `${part.material}|${[...part.size].sort().join(',')}|`;
    const mirrored = groups.get(prefix + canonical(part, true).key);
    if (!groups.has(prefix + key) && mirrored) {
      mirrored.members.push(part);
      mirrored.mirrored.push(part);
      continue;
    }
    const group = groups.get(prefix + key) ?? { members: [], mirrored: [], geometry };
    group.members.push(part);
    groups.set(prefix + key, group);
  }
  const sheets = [...groups.values()].map(({ members, mirrored, geometry: g }) => {
    const { CrossSection } = api;
    let outline = new CrossSection([g.outer], 'EvenOdd');
    for (const tool of [...g.holes, ...g.cuts.map(([u0, v0, u1, v1]): V2[] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]])]) {
      const section = new CrossSection([tool], 'EvenOdd');
      const next = outline.subtract(section);
      outline.delete(); section.delete();
      outline = next;
    }
    const polygons = outline.toPolygons() as V2[][];
    outline.delete();
    const part = members[0];
    const sheet: Sheet = {
      id: part.id, title: title(part), members, mirrored, material: part.material,
      thickness: part.size[plane(part)[2]], width: g.width, height: g.height,
      outline: polygons, cuts: [...g.cuts, ...g.holes.map(bounds)], grooves: g.grooves,
      faceHoles: g.faceHoles, edgeHoles: g.edgeHoles, holeList: [], holeColors: {}, scale: SCALES.at(-1)!,
    };
    holeList(sheet);
    const copies = mirrored.length ? 2 : 1;
    sheet.scale = SCALES.find(s => {
      const extents = layout({ ...sheet, scale: s }).extents;
      return g.width / s + extents.left + extents.right <= AREA.w
        && copies * g.height / s + (copies - 1) * MIRROR_GAP + extents.top + extents.bottom <= areaHeight(sheet);
    }) ?? SCALES.at(-1)!;
    return sheet;
  });
  const titles = sheets.map(s => s.title);
  sheets.forEach((sheet, i) => {
    const same = titles.flatMap((t, j) => t === titles[i] ? [j] : []);
    if (same.length > 1) sheet.title += ` ${String.fromCharCode(65 + same.indexOf(i))}`;
  });
  return sheets;
}

// Groups holes by size and face or edge, one colour per group. Positions are blank coordinates:
// x, y from the lower-left corner of the drawn blank, z from the visible face.
function holeList(sheet: Sheet) {
  const groups = new Map<string, (FaceHole | EdgeHole)[]>();
  for (const hole of [...sheet.faceHoles, ...sheet.edgeHoles]) groups.set(holeKey(hole), [...groups.get(holeKey(hole)) ?? [], hole]);
  const list = [...groups.entries()].map(([key, holes]) => {
    const first = holes[0];
    const size = 'face' in first && first.face === 'both' ? m.hole_through({ diameter: fmt(first.diameter) }) : `Ø${fmt(first.diameter)} × ${fmt(first.depth)}`;
    let where: string, positions: string;
    if ('face' in first) {
      where = first.face === 'far' ? m.hole_far_face() : first.face === 'near' ? m.hole_near_face() : '';
      positions = coordinates(['x', 'y'], (holes as FaceHole[]).map(h => h.at));
    } else {
      const edge = holes as EdgeHole[];
      const vertical = first.side === 'left' || first.side === 'right';
      where = { left: m.hole_left_edge(), right: m.hole_right_edge(), top: m.hole_top_edge(), bottom: m.hole_bottom_edge() }[first.side];
      const limit = vertical ? sheet.width : sheet.height;
      const entry = edge.some(h => !near(h.entry, 0) && !near(h.entry, limit));
      positions = entry
        ? coordinates(['x', 'y', 'z'], edge.map(h => vertical ? [h.entry, h.along, h.across] : [h.along, h.entry, h.across]))
        : coordinates([vertical ? 'y' : 'x', 'z'], edge.map(h => [h.along, h.across]));
    }
    return { key, count: holes.length, size, where, positions };
  });
  // Opposite edges with the same pattern share a row.
  const rows: { keys: string[]; count: number; text: string }[] = [];
  for (const item of list) {
    const twin = rows.find(r => r.text === `${item.size}|${item.positions}` && item.key.startsWith('e|'));
    if (twin) { twin.keys.push(item.key); twin.count += item.count; continue; }
    rows.push({ keys: [item.key], count: item.count, text: `${item.size}|${item.positions}` });
  }
  sheet.holeColors = {};
  sheet.holeList = rows.map((row, i) => {
    const color = HOLE_COLORS[i % HOLE_COLORS.length];
    row.keys.forEach(key => sheet.holeColors[key] = color);
    const items = row.keys.map(key => list.find(item => item.key === key)!);
    const where = items.length === 2 ? m.hole_both_edges({ first: items[0].where, second: items[1].where }) : items[0].where;
    const [size, positions] = row.text.split('|');
    const text = [`${row.count}× ${size}`, where, positions].filter(Boolean).join(' · ');
    return { color, lines: wrap(text, LIST.w - 4) };
  });
}

// One pair per hole, sorted. The non-breaking space keeps each pair on one line when the row wraps.
function coordinates(axes: string[], points: number[][]) {
  const rounded = [...new Map(points.map(p => p.map(v => Number(v.toFixed(3)))).map(p => [p.join(), p])).values()];
  rounded.sort((a, b) => a.map((v, k) => v - b[k]).find(d => d !== 0) ?? 0);
  return `${axes.join(',')}: ${rounded.map(p => `(${p.map(fmt).join(',\u00a0')})`).join(' ')}`;
}

function wrap(text: string, width: number) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${word}` : word;
    if (textWidth(next, LIST.text) > width && lines.at(-1)) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

const listHeight = (sheet: Sheet) => sheet.holeList.length ? (sheet.holeList.flatMap(r => r.lines).length + 1) * LIST.row + 2 : 0;
const areaHeight = (sheet: Sheet) => AREA.h - Math.max(0, listHeight(sheet) - PAGE.tableH - 2);

// Centres each chain label on its segment, moving it beside the line or along when it would overlap the previous one.
function placeLabels(spans: [number, number, number][]) {
  const ends = [-Infinity, -Infinity];
  return spans.map(([s, e, width]) => {
    const [center, half] = [(s + e) / 2, width / 2 + 0.6];
    const side = center - half >= ends[0] ? 0 : center - half >= ends[1] ? 1 : ends[0] <= ends[1] ? 0 : 1;
    const at = Math.max(center, ends[side] + half);
    ends[side] = at + half;
    return { at, flipped: side === 1 };
  });
}

function bounds(points: V2[]): Rect {
  const us = points.map(p => p[0]), vs = points.map(p => p[1]);
  return [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)];
}

function inside(polygons: V2[][], [x, y]: V2) {
  let count = 0;
  for (const polygon of polygons) {
    polygon.forEach(([x1, y1], i) => {
      const [x2, y2] = polygon[(i + 1) % polygon.length];
      if ((y1 > y) !== (y2 > y) && x < x1 + (y - y1) * (x2 - x1) / (y2 - y1)) count++;
    });
  }
  return count % 2 === 1;
}

function radii(polygons: V2[][]) {
  const arcs: { mid: V2; dir: V2; r: number; concave: boolean }[] = [];
  for (const polygon of polygons) {
    const count = polygon.length;
    const diagonal = polygon.map((p, i) => {
      const q = polygon[(i + 1) % count];
      return Math.abs(q[0] - p[0]) > eps && Math.abs(q[1] - p[1]) > eps;
    });
    const start = diagonal.findIndex((d, i) => !d && diagonal[(i + 1) % count]);
    if (start < 0) continue;
    for (let i = 1; i <= count; i++) {
      const first = (start + i) % count;
      if (!diagonal[first] || diagonal[(first - 1 + count) % count]) continue;
      let length = 0;
      while (diagonal[(first + length) % count]) length++;
      const a = polygon[first], b = polygon[(first + length) % count];
      const mid = polygon[(first + Math.floor(length / 2)) % count];
      const dir: V2 = [Math.sign(mid[0] - (a[0] + b[0]) / 2), Math.sign(mid[1] - (a[1] + b[1]) / 2)];
      const concave = inside(polygons, [mid[0] + dir[0] * 0.5, mid[1] + dir[1] * 0.5]);
      arcs.push({ mid, dir: concave ? [-dir[0], -dir[1]] : dir, r: Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.SQRT2, concave });
    }
  }
  return arcs;
}

// Outermost point where the line `axis = coord` meets the outline, in direction `sign` along the other axis.
function outlineReach(polygons: V2[][], coord: number, axis: 0 | 1, sign: 1 | -1) {
  const other = 1 - axis;
  const hits: number[] = [];
  for (const polygon of polygons) {
    polygon.forEach((p, i) => {
      const q = polygon[(i + 1) % polygon.length];
      if (near(p[axis], coord)) hits.push(p[other]);
      else if ((p[axis] - coord) * (q[axis] - coord) < 0) hits.push(p[other] + (coord - p[axis]) * (q[other] - p[other]) / (q[axis] - p[axis]));
    });
  }
  if (!hits.length) return NaN;
  return sign > 0 ? Math.max(...hits) : Math.min(...hits);
}

function layout(sheet: Sheet) {
  const { width: W, height: H } = sheet;
  const marks: Record<Side, Set<number>> = { top: new Set(), bottom: new Set(), left: new Set(), right: new Set() };
  const add = (side: Side, coord: number) => {
    const max = side === 'top' || side === 'bottom' ? W : H;
    const key = Number(coord.toFixed(6));
    const opposite = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[side];
    if (!near(coord, 0) && !near(coord, max) && !marks[opposite].has(key)) marks[side].add(key);
  };
  const local: { horizontal: boolean; from: V2; to: number; span: [number, number] }[] = [];
  for (const [u0, v0, u1, v1] of sheet.cuts) {
    const bottom = (v0 + v1) / 2 <= H / 2, left = (u0 + u1) / 2 <= W / 2;
    const [touchL, touchR, touchB, touchT] = [near(u0, 0), near(u1, W), near(v0, 0), near(v1, H)];
    const midU = !touchL && !touchR, midV = !touchB && !touchT;
    if (midU && touchB !== touchT) local.push({ horizontal: false, from: [u1, touchB ? 0 : H], to: touchB ? v1 : v0, span: [u0, u1] });
    else for (const v of [v0, v1]) add(left ? 'left' : 'right', v);
    if (midV && touchL !== touchR) local.push({ horizontal: true, from: [touchL ? 0 : W, v1], to: touchL ? u1 : u0, span: [v0, v1] });
    else for (const u of [u0, u1]) add(bottom ? 'bottom' : 'top', u);
  }
  const covered = (horizontal: boolean, coord: number) => [...(horizontal ? ['top', 'bottom'] : ['left', 'right']) as Side[]].some(side => marks[side].has(Number(coord.toFixed(6))));
  const localDims = local.filter(d => !covered(d.horizontal, d.to));
  const notes: Note[] = [];
  const grooveGroups = new Map<string, Groove[]>();
  for (const groove of sheet.grooves) {
    const [u0, v0, u1, v1] = groove.rect;
    const alongU = u1 - u0 >= v1 - v0;
    const [a0, a1, c0, c1, length] = alongU ? [u0, u1, v0, v1, H] : [v0, v1, u0, u1, W];
    const low = (c0 + c1) / 2 <= length / 2;
    const side: Side = alongU ? low ? 'bottom' : 'top' : low ? 'left' : 'right';
    for (const a of [a0, a1]) add(side, a);
    const key = [alongU, fmt(c1 - c0), fmt(groove.depth), fmt(low ? c0 : length - c1), groove.face].join('|');
    grooveGroups.set(key, [...grooveGroups.get(key) ?? [], groove]);
  }
  for (const [key, grooves] of grooveGroups) {
    const [alongU, width, depth, offset, face] = key.split('|');
    const [u0, v0, u1, v1] = grooves.reduce((a, b) => (b.rect[2] - b.rect[0]) + (b.rect[3] - b.rect[1]) > (a.rect[2] - a.rect[0]) + (a.rect[3] - a.rect[1]) ? b : a).rect;
    const at: V2 = alongU === 'true' ? [u0 + (u1 - u0) * 0.3, (v0 + v1) / 2] : [(u0 + u1) / 2, v0 + (v1 - v0) * 0.3];
    const dir: V2 = [at[0] < W / 2 ? -1 : 1, at[1] < H / 2 ? -1 : 1];
    const faces = face === 'both' ? m.groove_both_faces() : face === 'far' ? m.groove_far_face() : '';
    notes.push({ at, dir, text: m.groove_note({ width, depth, offset }) + faces });
  }
  const arcs = radii(sheet.outline);
  for (const r of [...new Set(arcs.map(a => fmt(a.r)))]) {
    const same = arcs.filter(a => fmt(a.r) === r);
    notes.push({ at: same[0].mid, dir: same[0].dir, inner: same[0].concave, text: `${same.length > 1 ? `${same.length}× ` : ''}R${r}` });
  }
  const rows: Record<Side, number[][]> = { top: [], bottom: [], left: [], right: [] };
  for (const side of Object.keys(marks) as Side[]) {
    if (marks[side].size) rows[side].push([0, ...[...marks[side]].sort((a, b) => a - b), side === 'top' || side === 'bottom' ? W : H]);
  }
  rows[rows.top.length <= rows.bottom.length ? 'top' : 'bottom'].push([0, W]);
  rows[rows.right.length <= rows.left.length ? 'right' : 'left'].push([0, H]);
  const hasHoles = sheet.faceHoles.length + sheet.edgeHoles.length > 0;
  // With a left side view the main origin label sits one step lower, below the side view's.
  const originDrop = sheet.edgeHoles.some(h => h.side === 'left') ? 2 * ORIGIN.d : ORIGIN.d;
  // Bottom notes stack below the main origin label.
  const rowsExtent = (side: Side) => Math.max(rows[side].length ? FIRST_ROW + (rows[side].length - 1) * ROW + TEXT + 2 : 0,
    side === 'bottom' && hasHoles ? originDrop + 1 : 0);
  const notesOn = (vertical: 'top' | 'bottom') => notes.filter(n => !n.inner && (n.dir[1] > 0) === (vertical === 'top')).length;
  const noteExtent = (side: 'top' | 'bottom') => notesOn(side) ? NOTE_GAP * notesOn(side) + TEXT + 2 : 0;
  // Side views of the edges that have holes, projected next to the main view.
  const strips = (['left', 'right', 'top', 'bottom'] as Side[]).flatMap(side => {
    const holes = sheet.edgeHoles.filter(h => h.side === side);
    return holes.length ? [{ side, holes, extent: STRIP_GAP + sheet.thickness / sheet.scale + 1 }] : [];
  });
  const strip = (side: Side) => strips.find(s => s.side === side)?.extent ?? 0;
  // Room the origin labels would like; it only uses spare width and never changes the scale. A side view's label points back into the dimension rows' gap when there is one, outward otherwise.
  const outward = (side: 'left' | 'right') => strip(side) && !rows[side].length ? STRIP_GAP + ORIGIN.d + originWidth(ORIGIN.side) : 0;
  const originLeft = Math.max(
    hasHoles ? originDrop + originWidth(ORIGIN.main) : 0,
    outward('left'), strip('top') || strip('bottom') ? ORIGIN.d + originWidth(ORIGIN.side) : 0);
  const originRight = outward('right');
  const extents = {
    top: rowsExtent('top') + noteExtent('top') + strip('top'), bottom: rowsExtent('bottom') + noteExtent('bottom') + strip('bottom'),
    left: rowsExtent('left') + strip('left'), right: rowsExtent('right') + strip('right'),
  };
  const originRoom = { left: Math.max(0, originLeft - extents.left), right: Math.max(0, originRight - extents.right) };
  return { rows, notes, local: localDims, extents, originRoom, originDrop, rowsExtent, noteExtent, strips };
}

export function sheetSvg(sheet: Sheet, index: number, total: number): string {
  const { width: W, height: H, scale } = sheet;
  const { rows, notes, local, extents, originRoom, originDrop, rowsExtent, noteExtent, strips } = layout(sheet);
  const pieceW = W / scale, pieceH = H / scale;
  const spare = AREA.w - pieceW - extents.left - extents.right;
  const wanted = originRoom.left + originRoom.right;
  const shift = wanted <= spare ? originRoom.left + (spare - wanted) / 2 : wanted ? spare * originRoom.left / wanted : spare / 2;
  const left = AREA.x + shift + extents.left;
  const mirrorH = sheet.mirrored.length ? MIRROR_GAP + pieceH : 0;
  const top = AREA.y + (areaHeight(sheet) - pieceH - mirrorH - extents.top - extents.bottom) / 2 + extents.top;
  const X = (u: number) => left + u / scale;
  const Y = (v: number) => top + pieceH - v / scale;
  const out: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, width = 0.18, color = '#222') =>
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`);
  const text = (x: number, y: number, content: string, attrs = '', size = TEXT) =>
    out.push(`<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${xml(content)}</text>`);
  const dashed = (x1: number, y1: number, x2: number, y2: number) =>
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width="0.15" stroke-dasharray="1.2 0.8"/>`);
  const tick = (x: number, y: number, color?: string) => line(x - 0.9, y + 0.9, x + 0.9, y - 0.9, 0.35, color);
  const labels: string[] = [];
  const dimension = (x: number, y: number, content: string, vertical = false) => {
    const w = textWidth(content) + 0.8;
    labels.push(`<g transform="translate(${x} ${y})${vertical ? ' rotate(-90)' : ''}"><rect x="${-w / 2}" y="${-TEXT * 0.8}" width="${w}" height="${TEXT * 0.85}" fill="white"/><text font-size="${TEXT}" text-anchor="middle">${content}</text></g>`);
  };

  const piece = (X: (u: number) => number, Y: (v: number) => number) => {
    out.push(`<path d="${sheet.outline.map(p => `M${p.map(([u, v]) => `${X(u)},${Y(v)}`).join(' L')} Z`).join(' ')}" fill="#f1f1ec" fill-rule="evenodd" stroke="#111" stroke-width="0.45" stroke-linejoin="round"/>`);
    for (const { rect: [u0, v0, u1, v1] } of sheet.grooves) {
      const alongU = u1 - u0 >= v1 - v0;
      const [x1, y1, x2, y2] = alongU ? [X(u0), Y((v0 + v1) / 2), X(u1), Y((v0 + v1) / 2)] : [X((u0 + u1) / 2), Y(v0), X((u0 + u1) / 2), Y(v1)];
      line(x1, y1, x2, y2, (alongU ? v1 - v0 : u1 - u0) / scale, '#1f5f9e');
    }
    for (const hole of [...sheet.faceHoles].sort((a, b) => b.diameter - a.diameter)) circle(X(hole.at[0]), Y(hole.at[1]), hole);
  };
  const circle = (x: number, y: number, hole: FaceHole | EdgeHole) => {
    const color = sheet.holeColors[holeKey(hole)];
    out.push(`<circle cx="${x}" cy="${y}" r="${Math.max(hole.diameter / 2 / scale, 0.7)}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="0.35"/>`);
  };
  piece(X, Y);
  const origins: { at: V2; sx: number; sy: number; d: number; label: string }[] = [];
  if (mirrorH) {
    const mirrorTop = Y(0) + extents.bottom + MIRROR_GAP;
    piece(u => X(W - u), v => mirrorTop + pieceH - v / scale);
    text(X(0), mirrorTop - 3, m.mirrored_view(), 'fill="#555"');
  }

  for (const side of Object.keys(rows) as Side[]) {
    rows[side].forEach((coords, row) => {
      const horizontal = side === 'top' || side === 'bottom';
      const sign = side === 'top' || side === 'left' ? -1 : 1;
      const edge = side === 'top' ? Y(H) : side === 'bottom' ? Y(0) : side === 'left' ? X(0) : X(W);
      const at = edge + sign * (FIRST_ROW + row * ROW);
      const pos = (c: number) => horizontal ? X(c) : Y(c);
      const overall = coords.length === 2;
      const lengths = coords.slice(1).map((c, i) => c - coords[i]);
      // Open chain: the longest segment follows from the overall dimension.
      const omitted = overall ? -1 : lengths.indexOf(Math.max(...lengths));
      const kept = lengths.map((_, i) => i !== omitted);
      coords.forEach((c, i) => {
        if (!kept[i - 1] && !kept[i]) return;
        const reach = horizontal ? Y(outlineReach(sheet.outline, c, 0, side === 'top' ? 1 : -1)) : X(outlineReach(sheet.outline, c, 1, side === 'right' ? 1 : -1));
        const [a, b] = [edge + sign * 1, at + sign * 1.5];
        horizontal ? line(pos(c), a, pos(c), b) : line(a, pos(c), b, pos(c));
        if (Math.abs(reach - edge) > 2) horizontal ? dashed(pos(c), reach + sign, pos(c), a) : dashed(reach + sign, pos(c), a, pos(c));
        horizontal ? tick(pos(c), at) : tick(at, pos(c));
      });
      for (const run of [coords.slice(0, Math.max(omitted, 0) + 1), coords.slice(omitted + 1)]) {
        if (run.length < 2) continue;
        const [p0, p1] = [pos(run[0]), pos(run.at(-1)!)];
        horizontal ? line(Math.min(p0, p1) - 1.5, at, Math.max(p0, p1) + 1.5, at) : line(at, Math.min(p0, p1) - 1.5, at, Math.max(p0, p1) + 1.5);
      }
      const toward = horizontal ? 1 : -1;
      const segments = lengths.flatMap((length, i) => kept[i] ? [{ i, label: fmt(length) }] : []);
      placeLabels(segments.map(({ i, label }) => [toward * pos(coords[i]), toward * pos(coords[i + 1]), textWidth(label)])).forEach(({ at: along, flipped }, k) => {
        const across = flipped ? at + TEXT + 1 : at - 1;
        horizontal ? dimension(along, across, segments[k].label) : dimension(across, -along, segments[k].label, true);
      });
    });
  }

  for (const { horizontal, from: [fu, fv], to, span: [s0, s1] } of local) {
    const label = fmt(Math.abs(to - (horizontal ? fu : fv)));
    const inner = (s1 - s0) / scale >= 12;
    if (horizontal) {
      const [x1, x2, y] = [X(fu), X(to), inner ? Y((s0 + s1) / 2) : Y(fv) - 5];
      if (!inner) { line(x2, Y(fv) - 1, x2, y - 1.5); line(x1, Y(fv), x1, y - 1.5); }
      line(Math.min(x1, x2) - 1.5, y, Math.max(x1, x2) + 1.5, y); tick(x1, y); tick(x2, y);
      const tx = Math.abs(x1 - x2) >= textWidth(label) + 2 ? (x1 + x2) / 2 : Math.max(x1, x2) + 2 + textWidth(label) / 2;
      dimension(tx, y - 1, label);
    } else {
      const [y1, y2, x] = [Y(fv), Y(to), inner ? X((s0 + s1) / 2) : X(fu) + 5];
      if (!inner) { line(X(fu) + 1, y2, x + 1.5, y2); line(X(fu), y1, x + 1.5, y1); }
      line(x, Math.min(y1, y2) - 1.5, x, Math.max(y1, y2) + 1.5); tick(x, y1); tick(x, y2);
      const ty = Math.abs(y1 - y2) >= textWidth(label) + 2 ? (y1 + y2) / 2 : Math.min(y1, y2) - 2 - textWidth(label) / 2;
      dimension(x + TEXT + 0.5, ty, label, true);
    }
  }

  // The anchor furthest along its note's direction takes the innermost row, so leaders never cross.
  const placed = notes.map(note => {
    const vertical: 'top' | 'bottom' = note.dir[1] > 0 ? 'top' : 'bottom';
    const [px, py] = [X(note.at[0]), Y(note.at[1])];
    const edge = vertical === 'top' ? Y(H) - rowsExtent('top') : Y(0) + rowsExtent('bottom');
    const width = textWidth(note.text) + 2;
    const nearest = note.inner ? 7 : Math.max(8, Math.abs(edge - py) + NOTE_GAP - 2);
    const reach = px + note.dir[0] * (nearest + width);
    const sx = reach > PAGE.w - PAGE.frame - 2 || reach < PAGE.frame + 2 ? -note.dir[0] : note.dir[0];
    return { note, vertical, px, py, edge, width, sx };
  }).sort((a, b) => b.sx * b.px - a.sx * a.px);
  const stacked = { top: 0, bottom: 0 };
  for (const { note, vertical, px, py, edge, width, sx } of placed) {
    const d = note.inner ? 7 : Math.max(8, Math.abs(edge - py) + NOTE_GAP * (1 + stacked[vertical]++) - 2);
    const sy = vertical === 'top' ? -1 : 1;
    const [ex, ey] = [px + sx * d, py + sy * d];
    out.push(`<circle cx="${px}" cy="${py}" r="0.45" fill="#222"/>`);
    line(px, py, ex, ey);
    line(ex, ey, ex + sx * width, ey);
    text(ex + sx, ey - 1, note.text, `text-anchor="${sx > 0 ? 'start' : 'end'}"`);
  }

  for (const { side, holes } of strips) {
    const vertical = side === 'left' || side === 'right';
    const sign = side === 'right' || side === 'bottom' ? 1 : -1;
    const offset = vertical ? rowsExtent(side) : rowsExtent(side) + noteExtent(side);
    const inner = { right: X(W), left: X(0), top: Y(H), bottom: Y(0) }[side] + sign * (offset + STRIP_GAP);
    // The near face sits next to the main view; `across` grows away from it.
    const P = (along: number, across: number): V2 => vertical ? [inner + sign * across / scale, Y(along)] : [X(along), inner + sign * across / scale];
    const T = sheet.thickness, length = vertical ? H : W;
    out.push(`<path d="M${[P(0, 0), P(length, 0), P(length, T), P(0, T)].map(p => p.join(',')).join(' L')} Z" fill="#f1f1ec" stroke="#111" stroke-width="0.45"/>`);
    // Outline edges parallel to the view direction, where the nearest face seen from this side changes depth.
    const axis = vertical ? 1 : 0;
    const reach = (c: number) => outlineReach(sheet.outline, c, axis, side === 'right' || side === 'top' ? 1 : -1);
    const steps = new Set(sheet.outline.flatMap(polygon => polygon.filter((p, i) => near(p[axis], polygon[(i + 1) % polygon.length][axis])).map(p => p[axis])));
    for (const c of steps) if (c > eps && c < length - eps && !near(reach(c - 0.5), reach(c + 0.5))) line(...P(c, 0), ...P(c, T), 0.35, '#111');
    for (const hole of [...holes].sort((h, k) => k.diameter - h.diameter)) circle(...P(hole.along, hole.across), hole);
    const sx = !vertical ? -1 : (side === 'right') === !rows[side].length ? 1 : -1;
    origins.push({ at: P(0, 0), sx, sy: side === 'top' ? -1 : 1, d: ORIGIN.d, label: ORIGIN.side });
  }

  if (sheet.faceHoles.length || sheet.edgeHoles.length) origins.unshift({ at: [X(0), Y(0)], sx: -1, sy: 1, d: originDrop, label: ORIGIN.main });
  for (const { at: [x, y], sx: preferred, sy, d, label } of origins) {
    const reach = x + preferred * (d + originWidth(label));
    const sx = reach < PAGE.frame + 1 || reach > PAGE.w - PAGE.frame - 1 ? -preferred : preferred;
    const [ex, ey] = [x + sx * d, y + sy * d];
    out.push(`<circle cx="${x}" cy="${y}" r="0.6" fill="#222"/>`);
    line(x, y, ex, ey);
    line(ex, ey, ex + sx * originWidth(label), ey);
    text(ex + sx, ey - 1, label, `text-anchor="${sx > 0 ? 'start' : 'end'}"`, ORIGIN.text);
  }

  let ly = PAGE.h - PAGE.frame - listHeight(sheet) + LIST.row;
  if (sheet.holeList.length) text(PAGE.frame + 3, ly, m.hole_list_title(), 'fill="#555"', 2.2);
  for (const { color, lines } of sheet.holeList) {
    ly += LIST.row;
    out.push(`<circle cx="${PAGE.frame + 4.2}" cy="${ly - 0.9}" r="1.2" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="0.35"/>`);
    lines.forEach((content, k) => { if (k) ly += LIST.row; text(PAGE.frame + 7, ly, content, `fill="${color}"`, LIST.text); });
  }

  out.push(...labels);

  const tx = PAGE.w - PAGE.frame - PAGE.tableW, ty = PAGE.h - PAGE.frame - PAGE.tableH;
  const count = sheet.members.length - sheet.mirrored.length;
  const cells: [string, string][] = [
    [m.table_qty(), sheet.mirrored.length ? m.qty_mirrored({ count, mirrored: sheet.mirrored.length }) : String(count)],
    [m.table_thickness(), `${fmt(sheet.thickness)} (${sheet.material})`],
    [m.table_blank(), `${fmt(W)} × ${fmt(H)}`],
    [m.table_scale(), `1:${fmt(scale)}`],
    [m.table_sheet(), `${index + 1} / ${total}`],
  ];
  const widths = [32, 22, 30, 14, 22];
  out.push(`<rect x="${tx}" y="${ty}" width="${PAGE.tableW}" height="${PAGE.tableH}" fill="white" stroke="#111" stroke-width="0.35"/>`);
  line(tx, ty + 10, tx + PAGE.tableW, ty + 10, 0.25);
  text(tx + 2.5, ty + 6.8, sheet.title, 'font-weight="bold"', 4.5);
  text(tx + PAGE.tableW - 2.5, ty + 6.5, m.table_project(), 'text-anchor="end" fill="#555"', 2.4);
  let cx = tx;
  cells.forEach(([label, value], i) => {
    if (i) line(cx, ty + 10, cx, ty + PAGE.tableH, 0.25);
    text(cx + 2, ty + 13.5, label, 'fill="#666"', 2);
    text(cx + 2, ty + 19.5, value, '', 3.4);
    cx += widths[i];
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1188" height="840" viewBox="0 0 ${PAGE.w} ${PAGE.h}" role="img" aria-label="${xml(m.sheet_label({ title: sheet.title }))}">
  <rect width="${PAGE.w}" height="${PAGE.h}" fill="white"/>
  <rect x="${PAGE.frame}" y="${PAGE.frame}" width="${PAGE.w - 2 * PAGE.frame}" height="${PAGE.h - 2 * PAGE.frame}" fill="none" stroke="#111" stroke-width="0.35"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="#111">${out.join('')}</g>
</svg>`;
}
