import { m } from './paraglide/messages.js';
import { makeJoinery, type Hole } from './joinery';

export type V3 = [number, number, number];
export type V2 = [number, number];
export const defaults = {
  H: 950, D: 300, L: 999, T1: 29, T2: 15, T3: 3, Ts: 20,
  Tg: 3, R: 20, Hs: 90, Hl: 190, Dl: 40, Hd: 100, Oh: 10,
  Dtol: 3, Rc: 13, Bc: 5,
};
export type Params = typeof defaults;
export const parameterLabels: Record<keyof Params, string> = {
  H: m.param_H(), D: m.param_D(), L: m.param_L(),
  T1: m.param_T1(), T2: m.param_T2(), T3: m.param_T3(),
  Ts: m.param_Ts(), Tg: m.param_Tg(), R: m.param_R(),
  Hs: m.param_Hs(), Hl: m.param_Hl(), Dl: m.param_Dl(),
  Hd: m.param_Hd(), Oh: m.param_Oh(), Dtol: m.param_Dtol(),
  Rc: m.param_Rc(), Bc: m.param_Bc(),
};
export const categories = {
  frame: m.category_frame(), backs: m.category_backs(), doors: m.category_doors(),
  fronts: m.category_fronts(), sides: m.category_sides(),
  drawerBacks: m.category_drawer_backs(), bottoms: m.category_bottoms(),
};
export type Category = keyof typeof categories;
export type Cut = { min: V3; max: V3; label: string; groove?: boolean };
export type Part = {
  id: string; name: string; category: Category; material: 'T1' | 'T2' | 'T3';
  size: V3; origin: V3; cuts: Cut[]; explode: V3;
  profile?: { plane: 'xy' | 'xz'; points: V2[] };
  profileCuts?: V2[][];
  holes?: Hole[];
  motion?: string;
  note?: string;
};

export function dimensions(p: Params) {
  return {
    Wdf: (p.L - 2 * p.T1 - 3 * p.Dtol) / 2,
    Wdb: (p.L - 3 * p.T1) / 2 - 2 * p.Rc,
    Ddb: p.D - p.T2 - 2 * p.T3 - p.Bc,
    centerHeight: p.H - p.Hl - p.T1,
    drawerHeight: p.Hd - p.Dtol,
    doorHeight: p.H - p.Hl - p.T1 - p.T2 - 2 * p.Hd - 2 * p.Dtol,
  };
}

export function validate(p: Params): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(defaults) as (keyof Params)[]) {
    if (!Number.isFinite(p[key]) || p[key] < 0) errors.push(m.error_number({ key }));
  }
  if (errors.length) return errors;
  const d = dimensions(p);
  if (Math.min(p.T1, p.T2, p.T3, p.Tg, p.Hd, p.Dl) <= 0) errors.push(m.error_positive());
  if (2 * p.Tg >= p.T1 || p.Tg >= p.T2) errors.push(m.error_groove_material());
  if (2 * p.T3 >= p.Dl / 2) errors.push(m.error_back_groove());
  if (p.T2 > p.Hl || p.Hs > p.Hl || p.Ts >= p.Dl) errors.push(m.error_skirting());
  if (p.R > p.Hl || 2 * p.R >= p.D - 2 * p.Dl) errors.push(m.error_leg_radius());
  if (2 * p.R > Math.min(p.D + p.Oh, p.L + 2 * p.Oh)) errors.push(m.error_desk_radius());
  if (d.doorHeight <= 0 || d.drawerHeight <= 2 * p.T3) errors.push(m.error_height());
  if (d.Wdb <= 2 * p.T2 || d.Ddb <= p.T2) errors.push(m.error_drawer_space());
  if (p.Rc < p.Dtol || d.Wdf < d.Wdb + p.Rc - p.Dtol) errors.push(m.error_drawer_fit());
  if (d.centerHeight - p.T2 - 2 * p.Hd <= p.T2) errors.push(m.error_center_space());
  return errors;
}

function arc(cx: number, cy: number, r: number, start: number, end: number): V2[] {
  return Array.from({ length: 25 }, (_, i) => {
    const a = start + (end - start) * i / 24;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

export function makeParts(p: Params): Part[] {
  const errors = validate(p);
  if (errors.length) throw new Error(errors.join('\n'));
  const { H, D, L, T1, T2, T3, Ts, Tg, R, Hs, Hl, Dl, Hd, Oh, Dtol, Rc, Bc } = p;
  const { Wdf, Wdb, Ddb, centerHeight: C, drawerHeight: h, doorHeight } = dimensions(p);
  const parts: Part[] = [];
  const a = (L - 3 * T1) / 2;
  const b = (L - T1) / 2;
  const cut = (min: V3, max: V3, label: string, groove = false): Cut => ({ min, max, label, groove });
  const opening: V2[] = [
    [Dl, 0], [D - Dl, 0],
    ...arc(D - Dl - R, Hl - R, R, 0, Math.PI / 2),
    ...arc(Dl + R, Hl - R, R, Math.PI / 2, Math.PI),
  ];

  for (const right of [false, true]) {
    const side = right ? 'right' : 'left';
    parts.push({
      id: `side-${side}`, name: right ? m.part_side_right() : m.part_side_left(), category: 'frame', material: 'T1',
      size: [D, H - T1, T1], origin: [0, 0, right ? L - T1 : 0],
      explode: [0, 0, right ? 220 : -220], profileCuts: [opening],
      cuts: [
        cut([0, 0, 0], [Ts, Hs, T1], m.cut_skirting_notch()),
        cut([T3, Ts >= 2 * T3 ? Hs : 0, right ? 0 : T1 - Tg],
          [2 * T3, H - T1 - T2 + Tg, right ? Tg : T1], m.cut_back_groove(), true),
      ],
    });
  }
  for (const top of [false, true]) {
    parts.push({
      id: top ? 'top-board' : 'bottom-board', name: top ? m.part_top_board() : m.part_bottom_board(),
      category: 'frame', material: 'T2', size: [top ? D : D - T2, T2, L - 2 * T1],
      origin: [0, top ? H - T1 - T2 : Hl, T1], explode: [0, top ? 160 : -100, 0],
      cuts: [
        cut([0, 0, a], [top ? Dl : Dl / 2, T2, b], m.cut_center_notch()),
        ...[[0, a], [b, L - 2 * T1]].map(([z0, z1]) => cut(
          [T3, top ? 0 : T2 - Tg, z0], [2 * T3, top ? Tg : T2, z1], m.cut_back_groove(), true)),
      ],
    });
  }
  const deskD = D + Oh;
  const deskL = L + 2 * Oh;
  parts.push({
    id: 'desk', name: m.part_desk(), category: 'frame', material: 'T1',
    size: [deskD, T1, deskL], origin: [0, H - T1, -Oh], explode: [0, 310, 0], cuts: [],
    profile: { plane: 'xz', points: [
      [0, 0], ...arc(deskD - R, R, R, -Math.PI / 2, 0),
      ...arc(deskD - R, deskL - R, R, 0, Math.PI / 2), [0, deskL],
    ] },
    note: m.note_desk(),
  });
  parts.push({
    id: 'center', name: m.part_center(), category: 'frame', material: 'T1',
    size: [D - T2, C, T1], origin: [0, Hl, b], explode: [80, 50, 0],
    cuts: [
      cut([Dl / 2, 0, 0], [D - T2, T2, T1], m.cut_bottom_tab()),
      cut([Dl, T2, 0], [D - T2, C - T2 - 2 * Hd, T1], m.cut_narrow_section()),
      cut([Dl, C - T2, 0], [D - T2, C, T1], m.cut_top_tab()),
      cut([T3, 0, 0], [2 * T3, C - T2 + Tg, Tg], m.cut_left_back_groove(), true),
      cut([T3, 0, T1 - Tg], [2 * T3, C - T2 + Tg, T1], m.cut_right_back_groove(), true),
    ],
  });
  for (let column = 0; column < 2; column++) {
    const side = column ? 'right' : 'left';
    const bayZ = column ? b + T1 : T1;
    const frontZ = column ? (L + Dtol) / 2 : T1 + Dtol;
    const bodyZ = bayZ + Rc;
    const bodyX = 2 * T3 + Bc;
    parts.push({
      id: `back-${side}`, name: column ? m.part_back_right() : m.part_back_left(),
      category: 'backs', material: 'T3', size: [T3, C - 2 * T2 + 2 * Tg, a + 2 * Tg],
      origin: [T3, Hl + T2 - Tg, bayZ - Tg], explode: [-150, 0, column ? 40 : -40], cuts: [],
    });
    parts.push({
      id: `door-${side}`, name: column ? m.part_door_right() : m.part_door_left(), category: 'doors', material: 'T2',
      size: [T2, doorHeight, Wdf], origin: [D - T2, Hl + Dtol, frontZ],
      cuts: [], explode: [180, -60, column ? 90 : -90], motion: `door-${side}`,
      note: m.note_door(),
    });
    for (let row = 0; row < 2; row++) {
      const id = `drawer-${side}-${row ? 'lower' : 'upper'}`;
      const y = H - T1 - T2 - (row + 1) * Hd;
      const drawer = [[m.drawer_left_upper, m.drawer_left_lower], [m.drawer_right_upper, m.drawer_right_lower]][column][row]();
      const common = { motion: id, explode: [220 + row * 100, row ? -30 : 100, column ? 90 : -90] as V3 };
      const offset = bodyZ - frontZ;
      parts.push({
        ...common, id: `${id}-front`, name: m.drawer_front({ drawer }), category: 'fronts', material: 'T2',
        size: [T2, h, Wdf], origin: [D - T2, y, frontZ],
        cuts: [cut([0, T3, offset + T2 - Tg], [Tg, 2 * T3, offset + Wdb - T2 + Tg], m.cut_bottom_groove(), true)],
      });
      for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
        parts.push({
          ...common, id: `${id}-side-${sideIndex}`, name: (sideIndex ? m.drawer_side_end : m.drawer_side_start)({ drawer }),
          category: 'sides', material: 'T2', size: [Ddb, h, T2],
          origin: [bodyX, y, bodyZ + (sideIndex ? Wdb - T2 : 0)],
          explode: [common.explode[0], common.explode[1], common.explode[2] + (sideIndex ? 40 : -40)],
          cuts: [cut([T2 - Tg, T3, sideIndex ? 0 : T2 - Tg],
            [Ddb, 2 * T3, sideIndex ? Tg : T2], m.cut_bottom_groove(), true)],
        });
      }
      parts.push({
        ...common, id: `${id}-back`, name: m.drawer_back({ drawer }), category: 'drawerBacks', material: 'T2',
        size: [T2, h, Wdb - 2 * T2], origin: [bodyX, y, bodyZ + T2],
        explode: [common.explode[0] - 45, common.explode[1], common.explode[2]],
        cuts: [cut([T2 - Tg, T3, 0], [T2, 2 * T3, Wdb - 2 * T2], m.cut_bottom_groove(), true)],
      });
      parts.push({
        ...common, id: `${id}-bottom`, name: m.drawer_bottom({ drawer }), category: 'bottoms', material: 'T3',
        size: [Ddb - T2 + 2 * Tg, T3, Wdb - 2 * T2 + 2 * Tg],
        origin: [bodyX + T2 - Tg, y + T3, bodyZ + T2 - Tg],
        explode: [common.explode[0], common.explode[1] - 65, common.explode[2]], cuts: [],
      });
    }
  }
  for (const hole of makeJoinery(p).holes) {
    const part = parts.find(candidate => candidate.id === hole.part)!;
    (part.holes ??= []).push({ ...hole, at: hole.at.map((v, i) => v - part.origin[i]) as V3 });
  }
  return parts;
}
