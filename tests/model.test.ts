import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module, { type Manifold } from 'manifold-3d';
import { defaults, dimensions, makeParts, validate } from '../src/model';
import { makeSolid } from '../src/solids';

const api = await Module();
api.setup();

test('all 30 wooden pieces have valid, non-overlapping assembled solids', () => {
  const parts = makeParts(defaults);
  assert.equal(parts.length, 30);
  assert.equal(new Set(parts.map(p => p.id)).size, parts.length);
  const solids: Manifold[] = [];
  try {
    for (const part of parts) {
      const local = makeSolid(api, part);
      assert.equal(local.status(), 'NoError', part.name);
      assert.ok(local.volume() > 0, part.name);
      const bbox = local.boundingBox();
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(Math.abs(bbox.min[axis]) < 1e-5, `${part.name}: min axis ${axis}`);
        assert.ok(Math.abs(bbox.max[axis] - part.size[axis]) < 1e-5, `${part.name}: max axis ${axis}`);
      }
      solids.push(local.translate(part.origin));
      local.delete();
    }
    for (let a = 0; a < solids.length; a++) {
      for (let b = a + 1; b < solids.length; b++) {
        const intersection = solids[a].intersect(solids[b]);
        try {
          assert.equal(intersection.status(), 'NoError');
          assert.ok(intersection.volume() < 1e-5, `${parts[a].name} intersects ${parts[b].name}: ${intersection.volume()} mm³`);
        } finally { intersection.delete(); }
      }
    }
  } finally { solids.forEach(solid => solid.delete()); }
});

test('front grooves align with the bottom of each offset drawer body', () => {
  const parts = makeParts(defaults);
  for (const front of parts.filter(p => p.category === 'fronts')) {
    const bottom = parts.find(p => p.id === `${front.motion}-bottom`)!;
    const groove = front.cuts[0];
    assert.ok(Math.abs(front.origin[2] + groove.min[2] - bottom.origin[2]) < 1e-8);
    assert.ok(Math.abs(front.origin[2] + groove.max[2] - bottom.origin[2] - bottom.size[2]) < 1e-8);
    assert.ok(Math.abs(front.origin[1] + groove.min[1] - bottom.origin[1]) < 1e-8);
  }
});

test('doors cover the bottom board while retaining their upper clearance', () => {
  for (const door of makeParts(defaults).filter(p => p.category === 'doors')) {
    assert.equal(door.origin[1], defaults.Hl + defaults.Dtol);
    assert.equal(door.origin[1] + door.size[1], defaults.H - defaults.T1 - defaults.T2 - 2 * defaults.Hd - defaults.Dtol);
    assert.ok(door.origin[1] < defaults.Hl + defaults.T2);
  }
});

test('fronts retain specified gaps and drawer bodies retain rail clearances', () => {
  const parts = makeParts(defaults);
  const d = dimensions(defaults);
  const left = parts.find(p => p.id === 'drawer-left-upper-front')!;
  const right = parts.find(p => p.id === 'drawer-right-upper-front')!;
  const lower = parts.find(p => p.id === 'drawer-left-lower-front')!;
  assert.equal(right.origin[2] - left.origin[2] - d.Wdf, defaults.Dtol);
  assert.equal(left.origin[1] - lower.origin[1] - d.drawerHeight, defaults.Dtol);
  const door = parts.find(p => p.id === 'door-left')!;
  assert.equal(lower.origin[1] - door.origin[1] - door.size[1], defaults.Dtol);
  assert.equal(defaults.H - defaults.T1 - defaults.T2 - left.origin[1] - left.size[1], defaults.Dtol);
  for (const column of ['left', 'right']) {
    const start = parts.find(p => p.id === `drawer-${column}-upper-side-0`)!;
    const bayStart = column === 'left' ? defaults.T1 : (defaults.L + defaults.T1) / 2;
    assert.ok(Math.abs(start.origin[2] - bayStart - defaults.Rc) < 1e-8);
  }
});

test('invalid dimensions are rejected before solid construction', () => {
  assert.ok(validate({ ...defaults, Hd: 2 }).length);
  assert.ok(validate({ ...defaults, Tg: 20 }).length);
  assert.ok(validate({ ...defaults, L: 70 }).length);
  assert.throws(() => makeParts({ ...defaults, T3: Number.NaN }));
});

test('a second parameter set still has usable groove and panel geometry', () => {
  const params = { ...defaults, H: 1100, L: 1200, D: 380, Hd: 120, T1: 25, T2: 18, Rc: 13 };
  assert.deepEqual(validate(params), []);
  for (const part of makeParts(params)) {
    const solid = makeSolid(api, part);
    try {
      assert.equal(solid.status(), 'NoError', part.name);
      assert.ok(solid.volume() > 0, part.name);
    } finally { solid.delete(); }
  }
});
