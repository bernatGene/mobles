import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Part, V3 } from './model';
import type { Axis } from './joinery';

export function makeCylinder(api: ManifoldToplevel, at: V3, axis: Axis, from: number, to: number, diameter: number): Manifold {
  const cylinder = api.Manifold.cylinder(to - from, diameter / 2, diameter / 2, 48);
  const rotated = axis === 2 ? cylinder : cylinder.rotate(axis ? [-90, 0, 0] : [0, 90, 0]);
  const start = [...at] as V3;
  start[axis] += from;
  const solid = rotated.translate(start);
  if (rotated !== cylinder) rotated.delete();
  cylinder.delete();
  return solid;
}

export function makeSolid(api: ManifoldToplevel, part: Part): Manifold {
  const { Manifold: M, CrossSection } = api;
  let solid: Manifold;
  if (part.profile) {
    const profile = new CrossSection([part.profile.points]);
    const extruded = profile.extrude(part.size[1]);
    const rotated = extruded.rotate([90, 0, 0]);
    solid = rotated.translate([0, part.size[1], 0]);
    rotated.delete();
    extruded.delete();
    profile.delete();
  } else {
    solid = M.cube(part.size);
  }
  const subtract = (tool: Manifold) => {
    const previous = solid;
    solid = previous.subtract(tool);
    previous.delete();
    tool.delete();
  };
  for (const points of part.profileCuts ?? []) {
    const profile = new CrossSection([points]);
    subtract(profile.extrude(part.size[2]));
    profile.delete();
  }
  for (const cut of part.cuts) {
    const size = cut.max.map((v, i) => v - cut.min[i]) as V3;
    const cube = M.cube(size);
    const tool = cube.translate(cut.min);
    cube.delete();
    subtract(tool);
  }
  for (const hole of part.holes ?? []) {
    const end = hole.dir * hole.depth;
    subtract(makeCylinder(api, hole.at, hole.axis, Math.min(0, end) - 0.01, Math.max(0, end) + 0.01, hole.diameter));
  }
  return solid;
}
