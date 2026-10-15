import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import type { Part, V3 } from './model';

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
  return solid;
}
