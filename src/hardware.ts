import * as THREE from 'three';
import type { Params, Part } from './model';
import { hinge, kindNames, rail, shapes, type JointItem, type Kind } from './joinery';

export type CosmeticHardware = {
  attached: THREE.Group;
  fixed: THREE.Group;
  middle: THREE.Group;
  supportId?: string;
  links: { arm: THREE.Mesh; anchor: THREE.Vector3; target: THREE.Vector3 }[];
};

export function makeHardware(part: Part, p: Params): CosmeticHardware {
  const hardware: CosmeticHardware = {
    attached: new THREE.Group(), fixed: new THREE.Group(), middle: new THREE.Group(), links: [],
  };
  const dark = new THREE.MeshStandardMaterial({ color: '#343735', metalness: 0.65, roughness: 0.35 });
  const steel = new THREE.MeshStandardMaterial({ color: '#a6afb1', metalness: 0.8, roughness: 0.27 });
  const wood = new THREE.MeshStandardMaterial({ color: '#b18c62', metalness: 0, roughness: 0.78 });
  const box = (group: THREE.Group, name: string, size: number[], position: number[], material = steel) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material);
    mesh.position.set(...position as [number, number, number]);
    mesh.name = name;
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cylinder = (name: string, radius: number, depth: number, x: number, y: number, z: number, material = dark,
    group = hardware.attached, alongX = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
    if (alongX) mesh.rotation.z = Math.PI / 2;
    else mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.castShadow = true;
    group.add(mesh);
  };
  if (part.category === 'fronts' || part.category === 'doors') {
    const door = part.category === 'doors';
    const margin = Math.min(35, part.size[2] / 4);
    const x = door ? part.id.endsWith('right') ? margin : part.size[2] - margin : part.size[2] / 2;
    const y = door ? part.size[1] - Math.min(55, part.size[1] / 4) : part.size[1] / 2;
    cylinder('Knob stem (cosmetic)', 4, 7, x, y, part.size[0] + 3.5, wood);
    cylinder('Button knob (cosmetic)', 10, 15, x, y, part.size[0] + 14.5, wood);
  }
  if (part.category === 'sides' && p.Rc > 0) {
    const end = part.id.endsWith('-1');
    const rightColumn = part.id.includes('-right-');
    hardware.supportId = end ? rightColumn ? 'side-right' : 'center' : rightColumn ? 'center' : 'side-left';
    const sign = end ? 1 : -1;
    const edge = end ? part.size[2] : 0;
    const { Rl, Rh, Rt, Ry } = rail;
    const y = Math.floor(part.size[1] / 2) + Ry;
    const x = part.size[0] - Rl / 2;
    box(hardware.fixed, 'Fixed rail channel (cosmetic)', [Rt / 3, Rh, Rl],
      [edge + sign * Rt * 5 / 6, y, x], dark);
    box(hardware.middle, 'Telescoping rail channel (cosmetic)', [Rt / 3, Rh * 0.8, Rl * 0.97],
      [edge + sign * Rt / 2, y, x]);
    box(hardware.attached, 'Drawer rail channel (cosmetic)', [Rt / 3, Rh * 0.6, Rl],
      [edge + sign * Rt / 6, y, x]);
  }
  if (part.category === 'doors') {
    const right = part.id.endsWith('right');
    hardware.supportId = right ? 'side-right' : 'side-left';
    // Door-local x from the hinge edge inward, and the side board's inner face.
    const s = right ? -1 : 1;
    const X = (d: number) => (right ? part.size[2] : 0) + s * d;
    const wall = X(-p.Dtol);
    const { Hcd, Hch, Hce, Hy, Hwl, Hss, Hsx, Hml, Hps, Hpx } = hinge;
    const wing = [Hce - Hcd / 2 + 4, Hce + Hsx + 7];
    for (const y of [Hy, part.size[1] - Hy]) {
      cylinder('Hinge cup (cosmetic)', Hcd / 2, Hch, X(Hce), y, Hch / 2, steel);
      cylinder('Hinge cup rim (cosmetic)', Hcd / 2 + 1.5, 1.2, X(Hce), y, -0.6, steel);
      box(hardware.attached, 'Hinge wing (cosmetic)', [wing[1] - wing[0], Hwl, 1.2],
        [X((wing[0] + wing[1]) / 2), y, -0.6]);
      for (const dy of [-Hss / 2, Hss / 2]) cylinder('Hinge screw (cosmetic)', 4, 1.5, X(Hce + Hsx), y + dy, -1.95);
      box(hardware.fixed, 'Hinge mounting plate (cosmetic)', [2, Hml, 14], [wall + s, y, -Hpx]);
      box(hardware.fixed, 'Hinge mounting plate (cosmetic)', [8, 20, 40], [wall + s * 4, y, -Hpx]);
      for (const dy of [-Hps / 2, Hps / 2]) cylinder('Hinge screw (cosmetic)', 4, 1.5, wall + s * 2.75, y + dy, -Hpx, dark, hardware.fixed, true);
      const armEnd = -Hpx - 30;
      box(hardware.fixed, 'Hinge arm (cosmetic)', [10, 18, -12 - armEnd], [wall + s * 13, y, (armEnd - 12) / 2]);
      cylinder('Hinge arm screw (cosmetic)', 4.5, 1.5, wall + s * 18.75, y, -Hpx - 12, dark, hardware.fixed, true);
      const anchor = new THREE.Vector3(wall + s * 13, y, -12);
      const target = new THREE.Vector3(X(Hce), y, -2);
      const arm = box(hardware.fixed, 'Hinge linkage (cosmetic)', [14, 1, 14], [0, 0, 0]);
      hardware.links.push({ arm, anchor, target });
    }
  }
  const usedMaterials = new Set<THREE.Material>();
  for (const group of [hardware.attached, hardware.fixed, hardware.middle]) group.traverse(object => {
    if (object instanceof THREE.Mesh) usedMaterials.add(object.material);
  });
  if (!usedMaterials.has(dark)) dark.dispose();
  if (!usedMaterials.has(steel)) steel.dispose();
  if (!usedMaterials.has(wood)) wood.dispose();
  return hardware;
}

export function disposeHardware(hardware: CosmeticHardware) {
  const materials = new Set<THREE.Material>();
  for (const group of [hardware.attached, hardware.fixed, hardware.middle]) {
    group.removeFromParent();
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      materials.add(object.material);
    });
  }
  materials.forEach(material => material.dispose());
}

const jointColors: Record<Kind, string> = {
  cam: '#b7bec0', camNut: '#f1efe8', camBolt: '#7d8588', dowel: '#e2c089', drawerDowel: '#e2c089', insert: '#c8a443', bolt: '#2b2d2f',
};

export function makeJoinery(part: Part, items: JointItem[]) {
  const group = new THREE.Group();
  const names = kindNames();
  const materials = new Map<Kind, THREE.MeshStandardMaterial>();
  for (const item of items.filter(item => item.part === part.id)) {
    if (!materials.has(item.kind)) materials.set(item.kind, new THREE.MeshStandardMaterial({
      color: jointColors[item.kind], metalness: item.kind === 'dowel' || item.kind === 'drawerDowel' || item.kind === 'camNut' ? 0 : 0.6, roughness: 0.4,
    }));
    for (const { diameter, from, to } of shapes[item.kind]) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(diameter / 2, diameter / 2, to - from, 24), materials.get(item.kind));
      const center = item.at.map((v, i) => v - part.origin[i]);
      center[item.axis] += item.dir * (from + to) / 2;
      mesh.position.set(center[2], center[1], center[0]);
      if (item.axis === 0) mesh.rotation.x = Math.PI / 2;
      if (item.axis === 2) mesh.rotation.z = Math.PI / 2;
      mesh.name = names[item.kind];
      group.add(mesh);
    }
  }
  return group;
}

export function disposeJoinery(group: THREE.Group) {
  group.removeFromParent();
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    materials.add(object.material);
  });
  materials.forEach(material => material.dispose());
}
