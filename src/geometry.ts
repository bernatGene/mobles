import * as THREE from 'three';
import type { Manifold } from 'manifold-3d';

export function geometryFromSolid(solid: Manifold) {
  const mesh = solid.getMesh();
  const positions = new Float32Array(mesh.numVert * 3);
  for (let i = 0; i < mesh.numVert; i++) {
    const offset = i * mesh.numProp;
    positions.set([
      mesh.vertProperties[offset + 2],
      mesh.vertProperties[offset + 1],
      mesh.vertProperties[offset],
    ], i * 3);
  }
  const indices = new Uint32Array(mesh.triVerts.length);
  for (let i = 0; i < indices.length; i += 3) {
    indices.set([mesh.triVerts[i], mesh.triVerts[i + 2], mesh.triVerts[i + 1]], i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  flat.computeBoundingBox();
  flat.computeBoundingSphere();
  return flat;
}
