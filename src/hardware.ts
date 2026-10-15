import * as THREE from 'three';
import type { Params, Part } from './model';
import { kindNames, shapes, type JointItem, type Kind } from './joinery';

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
  const cylinder = (name: string, radius: number, depth: number, x: number, y: number, z: number, material = dark) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.castShadow = true;
    hardware.attached.add(mesh);
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
    const width = p.Rc * 0.28;
    const height = Math.min(35, part.size[1] * 0.55);
    const depth = part.size[0];
    box(hardware.fixed, 'Fixed rail channel (cosmetic)', [width, height, depth * 0.96],
      [edge + sign * p.Rc * 0.8, part.size[1] / 2, depth / 2], dark);
    box(hardware.middle, 'Telescoping rail channel (cosmetic)', [width, height * 0.7, depth * 0.9],
      [edge + sign * p.Rc * 0.5, part.size[1] / 2, depth / 2]);
    box(hardware.attached, 'Drawer rail channel (cosmetic)', [width, height * 0.42, depth * 0.85],
      [edge + sign * p.Rc * 0.2, part.size[1] / 2, depth / 2]);
  }
  if (part.category === 'doors') {
    const right = part.id.endsWith('right');
    hardware.supportId = right ? 'side-right' : 'side-left';
    const cupX = right ? part.size[2] - 23 : 23;
    const mountX = right ? part.size[2] + p.Dtol : -p.Dtol;
    const inset = Math.min(75, part.size[1] / 4);
    for (const y of [inset, part.size[1] - inset]) {
      cylinder('Hinge cup (cosmetic)', Math.min(17.5, part.size[2] / 8), 3, cupX, y, -1.5, steel);
      box(hardware.fixed, 'Hinge mounting plate (cosmetic)', [2, 42, 24], [mountX, y, -38]);
      const anchor = new THREE.Vector3(mountX, y, -38);
      const target = new THREE.Vector3(cupX, y, -4);
      const arm = box(hardware.fixed, 'Hinge linkage (cosmetic)', [5, 1, 8], [0, 0, 0]);
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
