import { dimensions, type Params, type V3 } from './model';
import { m } from './paraglide/messages.js';

export const cam = { Cbd: 12, Cbh: 10.5, Cb: 28, Ca: 7, Ced: 8, Ceh: 28, Cnd: 10, Cnh: 12, Cnf: 11 };
export const dowel = { Wd: 8, Wh: 21, Wf: 11 };
export const insert = { Id: 8.5, Ih: 18, Ibd: 7, Icd: 12, Ich: 4 };
export const hinge = { Hcd: 35, Hch: 11.5, Hce: 23, Hy: 80, Hwl: 65, Hss: 52, Hsx: 9, Hml: 54, Hps: 32, Hpx: 37, Hpd: 3, Hph: 10 };
export const rail = { Rl: 250, Rh: 45, Rt: 12.7, Rk: [35, 67, 163], Rd: [24.5, 120.5, 216.5], Ry: -10, Rks: 12, Rpd: 3, Rph: 10 };

export type Axis = 0 | 1 | 2;
export type Hole = { part: string; at: V3; axis: Axis; dir: number; diameter: number; depth: number; label: string };
export type Kind = keyof typeof shapes;
export type Segment = { diameter: number; from: number; to: number };
export type JointItem = { part: string; kind: Kind; at: V3; axis: Axis; dir: number };

// Coaxial cylinders, positioned along the item's direction from its reference point.
export const shapes = {
  cam: [{ diameter: 11.8, from: 0, to: 9.6 }],
  camNut: [{ diameter: 10.8, from: 0, to: 10.5 }],
  camBolt: [
    { diameter: 6, from: -8, to: 0 }, { diameter: 8, from: 0, to: 22 },
    { diameter: 5, from: 22, to: 24 }, { diameter: 7, from: 24, to: 27 },
  ],
  dowel: [{ diameter: 8, from: -20, to: 20 }],
  drawerDowel: [{ diameter: 8, from: -20, to: 10 }],
  insert: [{ diameter: 10.5, from: 0, to: 15 }],
  bolt: [{ diameter: 10.5, from: insert.Ich - 3.3, to: insert.Ich }, { diameter: 6, from: insert.Ich, to: insert.Ich + 25 }],
} satisfies Record<string, Segment[]>;

export const kindNames = (): Record<Kind, string> => ({
  cam: m.hw_cam(), camNut: m.hw_cam_nut(), camBolt: m.hw_cam_bolt(),
  dowel: m.hw_dowel(), drawerDowel: m.hw_dowel(), insert: m.hw_insert(), bolt: m.hw_bolt(),
});

export function makeJoinery(p: Params) {
  const { H, D, L, T1, T2, T3, Hl, Dl, Hd, Rc, Bc, Dtol } = p;
  const { Wdb, Ddb, drawerHeight: h, doorHeight } = dimensions(p);
  const holes: Hole[] = [];
  const items: JointItem[] = [];
  const hole = (part: string, at: V3, axis: Axis, dir: number, diameter: number, depth: number, label: string) =>
    holes.push({ part, at, axis, dir, diameter, depth, label });
  const item = (part: string, kind: Kind, at: V3, axis: Axis, dir: number) => items.push({ part, kind, at, axis, dir });
  // Centred holes snap to whole millimetres; half a millimetre off-centre keeps the hardware constraints.
  const half = (size: number) => Math.floor(size / 2);

  for (const top of [false, true]) {
    const board = top ? 'top-board' : 'bottom-board';
    const y0 = top ? H - T1 - T2 : Hl;
    const d = top ? D : D - T2;
    const face = top ? y0 + T2 : y0;
    const inward = top ? -1 : 1;
    const boltY = face + inward * cam.Ca;
    for (const right of [false, true]) {
      const side = right ? 'side-right' : 'side-left';
      const z = right ? L - T1 : T1;
      const into = right ? -1 : 1;
      for (const x of [80, d - 80]) {
        const camAt: V3 = [x, face, z + into * cam.Cb];
        hole(board, camAt, 1, inward, cam.Cbd, cam.Cbh, m.hole_cam());
        hole(board, [x, boltY, z], 2, into, cam.Ced, cam.Ceh, m.hole_cam_edge());
        hole(side, [x, boltY, z], 2, -into, cam.Cnd, cam.Cnh, m.hole_cam_nut());
        item(board, 'cam', camAt, 1, inward);
        item(side, 'camNut', [x, boltY, z], 2, -into);
        item(side, 'camBolt', [x, boltY, z], 2, into);
      }
      for (const x of [40, Math.round(d / 2), d - 40]) {
        const at: V3 = [x, y0 + half(T2), z];
        hole(board, at, 2, into, dowel.Wd, dowel.Wh, m.hole_dowel());
        hole(side, at, 2, -into, dowel.Wd, dowel.Wh, m.hole_dowel());
        item(board, 'dowel', at, 2, into);
      }
    }
  }

  // Insert in a T1 part at the interface y, bolt from the top board's far face.
  const bolted = (part: string, y: number, dir: number, x: number, z: number) => {
    const far: V3 = [x, y - dir * T2, z];
    hole(part, [x, y, z], 1, dir, insert.Id, insert.Ih, m.hole_insert());
    hole('top-board', [x, y, z], 1, -dir, insert.Ibd, T2, m.hole_bolt());
    hole('top-board', far, 1, dir, insert.Icd, insert.Ich, m.hole_counterbore());
    item(part, 'insert', [x, y, z], 1, dir);
    item('top-board', 'bolt', far, 1, dir);
  };
  const Lt = L - 2 * T1;
  for (const [x, z] of [[60, 60], [D - 60, 60], [60, Lt - 60], [D - 60, Lt - 60]]) bolted('desk', H - T1, 1, x, T1 + z);
  for (const x of [Dl + 40, D - T2 - 40]) bolted('center', H - T1 - T2, -1, x, (L - T1) / 2 + half(T1));
  // No counterbore: Ø12 wouldn't clear the notch edge. The head sits on the hidden underside.
  const bearing: V3 = [Dl - 13, Hl + T2, (L - T1) / 2 + half(T1)];
  hole('center', bearing, 1, 1, insert.Id, insert.Ih, m.hole_insert());
  hole('bottom-board', bearing, 1, -1, insert.Ibd, T2, m.hole_bolt());
  item('center', 'insert', bearing, 1, 1);
  item('bottom-board', 'bolt', [Dl - 13, Hl - insert.Ich, bearing[2]], 1, 1);

  // Cup in the door's back face, mounting plate on the side board's inner face, 37 behind the inset door.
  for (const right of [false, true]) {
    const door = right ? 'door-right' : 'door-left';
    const inward = right ? -1 : 1;
    const cupZ = (right ? L - T1 - Dtol : T1 + Dtol) + inward * hinge.Hce;
    for (const y of [Hl + Dtol + hinge.Hy, Hl + Dtol + doorHeight - hinge.Hy]) {
      hole(door, [D - T2, y, cupZ], 0, 1, hinge.Hcd, hinge.Hch, m.hole_hinge_cup());
      for (const dy of [-1, 1]) {
        hole(door, [D - T2, y + dy * hinge.Hss / 2, cupZ + inward * hinge.Hsx], 0, 1, hinge.Hpd, hinge.Hph, m.hole_pilot());
        hole(right ? 'side-right' : 'side-left', [D - T2 - hinge.Hpx, y + dy * hinge.Hps / 2, right ? L - T1 : T1], 2, -inward,
          hinge.Hpd, hinge.Hph, m.hole_pilot());
      }
    }
  }

  // Glued Ø8 × 30: Wh into the edge board, Wf into the face board.
  const glued = (edgePart: string, facePart: string, at: V3, axis: Axis, dir: number) => {
    hole(edgePart, at, axis, -dir, dowel.Wd, dowel.Wh, m.hole_dowel());
    hole(facePart, at, axis, dir, dowel.Wd, dowel.Wf, m.hole_dowel());
    item(edgePart, 'drawerDowel', at, axis, dir);
  };
  for (let column = 0; column < 2; column++) {
    const bodyZ = (column ? (L + T1) / 2 : T1) + Rc;
    const bodyX = 2 * T3 + Bc;
    for (let row = 0; row < 2; row++) {
      const id = `drawer-${column ? 'right' : 'left'}-${row ? 'lower' : 'upper'}`;
      const y = H - T1 - T2 - (row + 1) * Hd;
      const camY = y + half(h);
      const frontX = bodyX + Ddb;
      for (const index of [0, 1]) {
        const side = `${id}-side-${index}`;
        const inner = bodyZ + (index ? Wdb - T2 : T2);
        const inward = index ? 1 : -1;
        const camAt: V3 = [frontX - cam.Cb, camY, inner];
        const boltAt: V3 = [frontX, camY, inner + inward * cam.Ca];
        hole(side, camAt, 2, inward, cam.Cbd, cam.Cbh, m.hole_cam());
        hole(side, boltAt, 0, -1, cam.Ced, cam.Ceh, m.hole_cam_edge());
        hole(`${id}-front`, boltAt, 0, 1, cam.Cnd, cam.Cnf, m.hole_cam_nut());
        item(side, 'cam', camAt, 2, inward);
        item(`${id}-front`, 'camNut', boltAt, 0, 1);
        item(`${id}-front`, 'camBolt', boltAt, 0, -1);
      }
      const walls = column ? ['center', 'side-right'] : ['side-left', 'center'];
      for (const index of [0, 1]) {
        const railY = y + half(h) + rail.Ry;
        // The right column's center rail uses its slots, Rks behind the round holes, so the center panel's two faces don't share pilots.
        const slot = column && !index ? rail.Rks : 0;
        const outer = bodyZ + (index ? Wdb : 0);
        const out = index ? 1 : -1;
        // Drawer pilots snap to whole millimetres, toward the back; the rail's slots take up the half.
        for (const d of rail.Rd) hole(`${id}-side-${index}`, [Math.floor(frontX - d), railY, outer], 2, -out, rail.Rpd, rail.Rph, m.hole_pilot());
        for (const k of rail.Rk) hole(walls[index], [frontX - k - slot, railY, outer + out * Rc], 2, out, rail.Rpd, rail.Rph, m.hole_pilot());
      }
      for (const dy of [half(h) - 25, half(h) + 25]) {
        for (const index of [0, 1]) {
          const sideZ = bodyZ + (index ? Wdb - half(T2) : half(T2));
          glued(`${id}-side-${index}`, `${id}-front`, [bodyX + Ddb, y + dy, sideZ], 0, 1);
          glued(`${id}-back`, `${id}-side-${index}`, [bodyX + half(T2), y + dy, bodyZ + (index ? Wdb - T2 : T2)], 2, index ? 1 : -1);
        }
      }
    }
  }

  return { holes, items };
}
