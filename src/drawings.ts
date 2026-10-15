import type { ManifoldToplevel } from 'manifold-3d';
import type { Part, V2 } from './model';
import { m } from './paraglide/messages.js';
import { getLocale } from './paraglide/runtime.js';

type Rect = [number, number, number, number];
type Face = 'near' | 'far' | 'both';
export type Groove = { rect: Rect; depth: number; face: Face };
export type Sheet = {
  id: string; title: string; members: Part[]; mirrored: Part[]; material: Part['material']; thickness: number;
  width: number; height: number; outline: V2[][]; cuts: Rect[]; grooves: Groove[]; scale: number;
};
type Side = 'top' | 'bottom' | 'left' | 'right';
type Note = { at: V2; dir: V2; text: string; inner?: boolean };

const PAGE = { w: 297, h: 210, frame: 9, tableW: 120, tableH: 22 };
const AREA = { x: 9, y: 9, w: 279, h: 168 };
const SCALES = [2, 2.5, 4, 5, 6, 8, 10, 12];
const ROW = 7, FIRST_ROW = 8, TEXT = 3, NOTE_GAP = 6, MIRROR_GAP = 12;
const eps = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < eps;
const fmt = (value: number) => value.toLocaleString(getLocale(), { maximumFractionDigits: 2, useGrouping: false });
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
    const geometry = { width: t.w, height: t.h, cuts: cuts.map(rect), outer: outer.map(t.map), holes: holes.map(h => h.map(t.map)), grooves };
    const key = JSON.stringify([
      geometry.cuts.map(r => r.map(round).join(',')).sort(),
      pointsKey(geometry.outer), geometry.holes.map(pointsKey).sort(),
      grooves.map(g => [...g.rect.map(round), round(g.depth), g.face].join(',')).sort(),
    ]);
    return { geometry, key, score: grooves.filter(g => g.face !== 'far').length };
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
      outline: polygons, cuts: [...g.cuts, ...g.holes.map(bounds)], grooves: g.grooves, scale: SCALES.at(-1)!,
    };
    const extents = layout(sheet).extents;
    const copies = mirrored.length ? 2 : 1;
    sheet.scale = SCALES.find(s => g.width / s + extents.left + extents.right <= AREA.w
      && copies * g.height / s + (copies - 1) * MIRROR_GAP + extents.top + extents.bottom <= AREA.h) ?? SCALES.at(-1)!;
    return sheet;
  });
  const titles = sheets.map(s => s.title);
  sheets.forEach((sheet, i) => {
    const same = titles.flatMap((t, j) => t === titles[i] ? [j] : []);
    if (same.length > 1) sheet.title += ` ${String.fromCharCode(65 + same.indexOf(i))}`;
  });
  return sheets;
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
  const rowsExtent = (side: Side) => rows[side].length ? FIRST_ROW + (rows[side].length - 1) * ROW + TEXT + 1 : 0;
  const notesOn = (vertical: 'top' | 'bottom') => notes.filter(n => !n.inner && (n.dir[1] > 0) === (vertical === 'top')).length;
  const noteExtent = (side: 'top' | 'bottom') => notesOn(side) ? NOTE_GAP * notesOn(side) + TEXT + 2 : 0;
  const extents = {
    top: rowsExtent('top') + noteExtent('top'), bottom: rowsExtent('bottom') + noteExtent('bottom'),
    left: rowsExtent('left'), right: rowsExtent('right'),
  };
  return { rows, notes, local: localDims, extents, rowsExtent };
}

export function sheetSvg(sheet: Sheet, index: number, total: number): string {
  const { width: W, height: H, scale } = sheet;
  const { rows, notes, local, extents, rowsExtent } = layout(sheet);
  const pieceW = W / scale, pieceH = H / scale;
  const left = AREA.x + (AREA.w - pieceW - extents.left - extents.right) / 2 + extents.left;
  const mirrorH = sheet.mirrored.length ? MIRROR_GAP + pieceH : 0;
  const top = AREA.y + (AREA.h - pieceH - mirrorH - extents.top - extents.bottom) / 2 + extents.top;
  const X = (u: number) => left + u / scale;
  const Y = (v: number) => top + pieceH - v / scale;
  const out: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, width = 0.18, color = '#222') =>
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`);
  const text = (x: number, y: number, content: string, attrs = '', size = TEXT) =>
    out.push(`<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${xml(content)}</text>`);
  const dashed = (x1: number, y1: number, x2: number, y2: number) =>
    out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width="0.15" stroke-dasharray="1.2 0.8"/>`);
  const tick = (x: number, y: number) => line(x - 0.9, y + 0.9, x + 0.9, y - 0.9, 0.35);
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
  };
  piece(X, Y);
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
      let flipped = false, crowded = false;
      for (let i = 0; i + 1 < coords.length; i++) {
        if (!kept[i]) { flipped = crowded = false; continue; }
        const label = fmt(lengths[i]);
        const [s, e] = [pos(coords[i]), pos(coords[i + 1])];
        const fits = Math.abs(e - s) >= textWidth(label) + 2;
        flipped = !fits && crowded && !flipped;
        crowded = !fits;
        const along = (s + e) / 2;
        const across = flipped ? at + TEXT + 1 : at - 1;
        horizontal ? dimension(along, across, label) : dimension(across, along, label, true);
      }
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

  const stacked = { top: 0, bottom: 0 };
  for (const note of notes) {
    const vertical = note.dir[1] > 0 ? 'top' : 'bottom';
    const [px, py] = [X(note.at[0]), Y(note.at[1])];
    const edge = vertical === 'top' ? Y(H) - rowsExtent('top') : Y(0) + rowsExtent('bottom');
    const d = note.inner ? 7 : Math.max(8, Math.abs(edge - py) + NOTE_GAP * (1 + stacked[vertical]++) - 2);
    const width = textWidth(note.text) + 2;
    const reach = px + note.dir[0] * (d + width);
    const sx = reach > PAGE.w - PAGE.frame - 2 || reach < PAGE.frame + 2 ? -note.dir[0] : note.dir[0];
    const sy = vertical === 'top' ? -1 : 1;
    const [ex, ey] = [px + sx * d, py + sy * d];
    out.push(`<circle cx="${px}" cy="${py}" r="0.45" fill="#222"/>`);
    line(px, py, ex, ey);
    line(ex, ey, ex + sx * width, ey);
    text(ex + sx, ey - 1, note.text, `text-anchor="${sx > 0 ? 'start' : 'end'}"`);
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
