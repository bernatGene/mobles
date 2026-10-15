import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { categories, defaults, dimensions, makeParts, parameterLabels, validate, type Category, type Params, type Part } from './model';
import { makeSolid } from './solids';
import { geometryFromSolid } from './geometry';
import { makeHardware, disposeHardware, makeJoinery, disposeJoinery, type CosmeticHardware } from './hardware';
import { makeJoinery as joineryItems } from './joinery';
import { createDrawingPage } from './drawing-page';
import { m } from './paraglide/messages.js';
import { getLocale, locales, setLocale } from './paraglide/runtime.js';
import './style.css';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const format = (value: number) => Number(value.toFixed(2)).toLocaleString(getLocale());
const colors = { T1: '#b18c62', T2: '#d8bb8f', T3: '#829b90' };
const drawerControls = [
  ['drawer-left-upper', m.drawer_left_upper()],
  ['drawer-right-upper', m.drawer_right_upper()],
  ['drawer-left-lower', m.drawer_left_lower()],
  ['drawer-right-lower', m.drawer_right_lower()],
];
let params = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem('consola-entrada-params') ?? 'null');
  if (saved && Object.keys(defaults).every(key => typeof saved[key] === 'number') && !validate(saved).length) params = saved;
} catch { /* Storage is optional. */ }

document.documentElement.lang = getLocale();
document.title = m.page_title();
$('#app').innerHTML = `
  <header>
    <h1>Consola entrada</h1>
    <nav class="page-tabs" aria-label="${m.nav_label()}"><button data-page="assembly" class="active">${m.nav_assembly()}</button><button data-page="drawings">${m.nav_drawings()}</button></nav>
    <div class="segmented locales">${locales.map(locale => `<button data-locale="${locale}" class="${locale === getLocale() ? 'active' : ''}">${locale.toUpperCase()}</button>`).join('')}</div>
  </header>
  <main id="assembly-page">
    <aside class="left-panel">
      <section><div class="section-heading"><h2>${m.view()}</h2><span>01</span></div>
        <div class="segmented" id="modes"><button data-mode="assembled" class="active">${m.mode_assembled()}</button><button data-mode="exploded">${m.mode_exploded()}</button><button data-mode="part">${m.mode_part()}</button></div>
        <label class="slider-label">${m.explode()} <output id="explode-value">0%</output><input id="explode" type="range" min="0" max="1" step="0.01" value="0"></label>
        <div class="view-buttons"><button data-view="iso">3D</button><button data-view="front">${m.view_front()}</button><button data-view="back">${m.view_back()}</button><button data-view="top">${m.view_top()}</button><button data-view="side">${m.view_side()}</button><button data-view="fit">${m.view_fit()}</button></div>
      </section>
      <section><div class="section-heading"><h2>${m.movement()}</h2><span>02</span></div>
        <label class="slider-label">${m.doors()} <output id="doors-value">0°</output><input id="doors" type="range" min="0" max="110" step="1" value="0"></label>
        ${drawerControls.map(([id, label]) => `<label class="slider-label">${label}<output id="${id}-value">0%</output><input id="${id}" data-drawer="${id}" type="range" min="0" max="1" step="0.01" value="0"></label>`).join('')}
      </section>
      <section class="parts-section"><div class="section-heading"><h2>${m.pieces()}</h2><span id="part-count">—</span></div>
        <div class="small-actions"><button id="show-all">${m.show_all()}</button><button id="isolate">${m.isolate_selected()}</button></div>
        <div class="checks">
          ${Object.entries(categories).map(([id, name]) => `<label><input type="checkbox" data-category="${id}" checked><span>${name}</span></label>`).join('')}
        </div>
        <input id="search" type="search" placeholder="${m.find_piece()}" aria-label="${m.find_piece()}">
        <div id="part-list" role="list" aria-label="${m.pieces_list_label()}"></div>
      </section>
    </aside>
    <div id="viewport">
      <div class="viewport-caption"><span id="view-name">${m.assembled_view()}</span><span id="size-caption"></span></div>
      <div id="loading">${m.loading()}</div>
      <div class="viewport-footer"><span>${m.viewport_help()}</span><span id="visible-count"></span></div>
      <div class="display-controls"><label><input id="edges" type="checkbox" checked> ${m.edges()}</label><label><input id="ghost" type="checkbox"> ${m.ghost_others()}</label><label><input id="guides" type="checkbox" checked> ${m.guides()}</label><label><input id="hardware" type="checkbox" checked> ${m.hardware()}</label><label><input id="joinery" type="checkbox"> ${m.joinery()}</label></div>
    </div>
    <aside class="right-panel">
      <div class="tabs"><button data-tab="inspect" class="active">${m.tab_inspect()}</button><button data-tab="parameters">${m.tab_parameters()}</button></div>
      <div id="inspect" class="tab-content"><div class="empty-state">${m.inspect_empty()}</div></div>
      <div id="parameters" class="tab-content" hidden>
        <p class="muted">${m.parameters_note()}</p>
        <form id="parameter-form"><div class="parameter-fields">${Object.entries(params).map(([key, value]) => `<label><span><b>${key}</b> ${parameterLabels[key as keyof Params]}</span><input name="${key}" type="number" step="any" min="0" required value="${value}"></label>`).join('')}</div>
        <div id="errors" role="alert"></div><button class="primary" type="submit">${m.apply_dimensions()}</button></form>
        <div class="small-actions"><button id="reset">${m.reset_defaults()}</button><button id="save-params">${m.export_json()}</button><button id="load-params">${m.import_json()}</button></div>
        <input id="params-file" type="file" accept="application/json,.json" hidden>
        <h3>${m.derived_dimensions()}</h3><div id="derived"></div>
      </div>
    </aside>
  </main>
  <div id="drawings-page" hidden></div>
  <div id="toast" role="status" hidden></div>`;

type Entry = { part: Part; root: THREE.Group; mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; edges: THREE.LineSegments; pivot: THREE.Group; home: THREE.Vector3; hardware: CosmeticHardware; joinery: THREE.Group };
let entries: Entry[] = [];
let selected: string | null = null;
let mode = 'assembled';
let explosion = 0;
let doorAngle = 0;
const drawerTravel: Record<string, number> = Object.fromEntries(drawerControls.map(([id]) => [id, 0]));
let isolated = false;
let currentView = 'iso';
const visibleCategories = new Set<Category>(Object.keys(categories) as Category[]);
const viewport = $('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9ece7');
const camera = new THREE.PerspectiveCamera(36, 1, 1, 20000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.domElement.setAttribute('aria-label', m.canvas_label());
viewport.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 10;
controls.maxDistance = 15000;
scene.add(new THREE.HemisphereLight('#fff7e7', '#63756b', 2.7));
const sun = new THREE.DirectionalLight('#fff4df', 3.2);
sun.position.set(-800, 1600, 1200);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -2000;
sun.shadow.camera.right = sun.shadow.camera.top = 2000;
sun.shadow.camera.far = 6000;
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.8;
scene.add(sun);
const fill = new THREE.DirectionalLight('#e0efff', 1.6);
fill.position.set(1000, 600, -1000);
scene.add(fill);
const model = new THREE.Group();
scene.add(model);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
ground.receiveShadow = true;
scene.add(ground);
const guides = new THREE.Group();
scene.add(guides);

function toast(text: string) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  window.setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

function clearGuides() {
  for (const child of [...guides.children]) {
    guides.remove(child);
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
}

function makeGuides() {
  clearGuides();
  const grid = new THREE.GridHelper(Math.max(params.L, params.D) * 3, 30, '#9baaa0', '#c7d0c7');
  grid.position.set(params.L / 2, -0.3, params.D / 2);
  guides.add(grid);
  const vertices: number[] = [];
  const line = (a: number[], b: number[]) => vertices.push(...a, ...b);
  line([-80, 0, 0], [-80, params.H, 0]);
  line([-90, 0, 0], [-70, 0, 0]);
  line([-90, params.H, 0], [-70, params.H, 0]);
  line([0, 0, params.D + 80], [params.L, 0, params.D + 80]);
  line([0, 0, params.D + 70], [0, 0, params.D + 90]);
  line([params.L, 0, params.D + 70], [params.L, 0, params.D + 90]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  guides.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#83988c' })));
}

function clearModel() {
  for (const entry of entries) {
    model.remove(entry.pivot);
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
    entry.edges.geometry.dispose();
    (entry.edges.material as THREE.Material).dispose();
    disposeHardware(entry.hardware);
    disposeJoinery(entry.joinery);
  }
  entries = [];
}

const api = await Module({ locateFile: () => wasmUrl });
api.setup();
const drawingPage = createDrawingPage($('#drawings-page'), api, () => entries.map(entry => entry.part));
document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => button.onclick = () => {
  const drawings = button.dataset.page === 'drawings';
  $('#assembly-page').hidden = drawings;
  $('#drawings-page').hidden = !drawings;
  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(tab => tab.classList.toggle('active', tab === button));
  if (drawings) drawingPage.show(selected);
});

function build() {
  const parts = makeParts(params);
  const { items } = joineryItems(params);
  const next: Entry[] = [];
  try {
    for (const part of parts) {
      const solid = makeSolid(api, part);
      let geometry: THREE.BufferGeometry;
      try {
        if (solid.status() !== 'NoError' || solid.volume() <= 0) throw new Error(`Invalid solid: ${part.name}`);
        geometry = geometryFromSolid(solid);
      } finally { solid.delete(); }
      const material = new THREE.MeshStandardMaterial({ color: colors[part.material], roughness: 0.78, metalness: 0 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { partId: part.id, name: part.name, localAxes: 'x depth, y up, z along wall', blankMm: part.size };
      mesh.name = part.name;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), new THREE.LineBasicMaterial({ color: '#493e30', transparent: true, opacity: 0.48 }));
      const root = new THREE.Group();
      root.add(mesh, edges);
      const pivot = new THREE.Group();
      pivot.name = part.id;
      pivot.add(root);
      const home = new THREE.Vector3(part.origin[2], part.origin[1], part.origin[0]);
      const hardware = makeHardware(part, params);
      const joinery = makeJoinery(part, items);
      root.add(hardware.attached, joinery);
      next.push({ part, root, mesh, edges, pivot, home, hardware, joinery });
    }
  } catch (error) {
    for (const entry of next) {
      entry.mesh.geometry.dispose(); entry.mesh.material.dispose();
      entry.edges.geometry.dispose(); (entry.edges.material as THREE.Material).dispose();
      disposeHardware(entry.hardware);
      disposeJoinery(entry.joinery);
    }
    throw error;
  }
  clearModel();
  entries = next;
  for (const entry of entries) model.add(entry.pivot, entry.hardware.fixed, entry.hardware.middle);
  if (selected && !entries.some(e => e.part.id === selected)) selected = null;
  makeGuides();
  $('#loading').hidden = true;
  $('#part-count').textContent = m.piece_count({ count: parts.length });
  $('#size-caption').textContent = `${format(params.L)} × ${format(params.D)} × ${format(params.H)} mm`;
  const d = dimensions(params);
  $('#derived').innerHTML = `<dl>${Object.entries(d).map(([key, value]) => `<dt>${key}</dt><dd>${format(value)} mm</dd>`).join('')}</dl>`;
  updateTransforms();
  updateVisibility();
  renderList();
  inspect();
  drawingPage.refresh();
  document.body.dataset.ready = 'true';
}

function updateTransforms() {
  for (const entry of entries) {
    const { part, root, pivot, home } = entry;
    root.position.set(0, 0, 0);
    pivot.rotation.set(0, 0, 0);
    pivot.position.copy(home);
    if (mode === 'part') {
      pivot.position.set(-part.size[2] / 2, -part.size[1] / 2, -part.size[0] / 2);
    } else {
      pivot.position.add(new THREE.Vector3(part.explode[2], part.explode[1], part.explode[0]).multiplyScalar(explosion));
      if (part.motion?.startsWith('drawer')) pivot.position.z += drawerTravel[part.motion] * dimensions(params).Ddb * 0.85;
      if (part.motion?.startsWith('door')) {
        const right = part.motion.endsWith('right');
        const hingeZ = right ? part.size[2] : 0;
        pivot.position.x += hingeZ;
        pivot.position.z += part.size[0];
        root.position.set(-hingeZ, 0, -part.size[0]);
        pivot.rotation.y = THREE.MathUtils.degToRad(doorAngle) * (right ? 1 : -1);
      }
    }
  }
  ground.visible = mode !== 'part';
  guides.visible = mode !== 'part' && $('#guides').matches(':checked');
  $('#explode-value').textContent = `${Math.round(explosion * 100)}%`;
  $('#doors-value').textContent = `${doorAngle}°`;
  for (const [id] of drawerControls) $(`#${id}-value`).textContent = `${Math.round(drawerTravel[id] * 100)}%`;
  $('#view-name').textContent = mode === 'part' ? m.individual_piece() : explosion > 0 ? m.exploded_view() : m.assembled_view();
  model.updateMatrixWorld(true);
  updateHardware();
}

function updateHardware() {
  const enabled = $('#hardware').matches(':checked');
  for (const entry of entries) {
    const { hardware, home } = entry;
    const visible = enabled && entry.pivot.visible && !entry.mesh.material.transparent;
    hardware.attached.visible = visible;
    hardware.fixed.visible = hardware.middle.visible = visible && mode !== 'part';
    hardware.fixed.position.copy(home);
    const support = entries.find(e => e.part.id === hardware.supportId);
    if (support && mode !== 'part') {
      hardware.fixed.position.add(new THREE.Vector3(support.part.explode[2], support.part.explode[1], support.part.explode[0]).multiplyScalar(explosion));
    }
    hardware.middle.position.copy(hardware.fixed.position).lerp(entry.pivot.position, 0.5);
    hardware.fixed.updateMatrixWorld(true);
    hardware.attached.updateMatrixWorld(true);
    for (const { arm, anchor, target } of hardware.links) {
      const end = hardware.fixed.worldToLocal(hardware.attached.localToWorld(target.clone()));
      const direction = end.clone().sub(anchor);
      arm.position.copy(anchor).add(end).multiplyScalar(0.5);
      arm.scale.y = direction.length();
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }
  }
}

function updateVisibility() {
  let count = 0;
  const ghost = $('#ghost').matches(':checked');
  const joinery = $('#joinery').matches(':checked');
  for (const entry of entries) {
    const active = selected === entry.part.id;
    entry.pivot.visible = mode === 'part' ? active : visibleCategories.has(entry.part.category) && (!isolated || active);
    if (entry.pivot.visible) count++;
    entry.joinery.visible = joinery;
    const ghosted = joinery || ghost && !!selected && !active;
    const material = entry.mesh.material;
    if (material.transparent !== ghosted) material.needsUpdate = true;
    material.transparent = ghosted;
    material.opacity = joinery ? 0.18 : ghosted ? 0.3 : 1;
    material.depthWrite = !ghosted;
    entry.mesh.castShadow = entry.mesh.receiveShadow = !ghosted;
    entry.mesh.material.emissive.set(active ? '#4e3419' : '#000000');
    entry.mesh.material.emissiveIntensity = active ? 0.25 : 0;
    entry.edges.visible = $('#edges').matches(':checked') && (!ghost || !selected || active);
  }
  $('#visible-count').textContent = m.visible_count({ count, total: entries.length });
  $('#isolate').classList.toggle('active', isolated);
  updateHardware();
}

function renderList() {
  const query = $<HTMLInputElement>('#search').value.toLowerCase();
  $('#part-list').innerHTML = entries.filter(e => e.part.name.toLowerCase().includes(query)).map(({ part }) => `
    <button role="listitem" class="part-row ${selected === part.id ? 'selected' : ''}" data-part="${part.id}" aria-pressed="${selected === part.id}">
      <i style="background:${colors[part.material]}"></i><span>${part.name}</span><small>${part.material}</small>
    </button>`).join('');
}

function holeGroups(part: Part) {
  const counts = new Map<string, number>();
  for (const hole of part.holes ?? []) {
    const key = `${hole.label} · Ø${format(hole.diameter)} × ${format(hole.depth)} mm`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts];
}

function inspect() {
  const entry = entries.find(e => e.part.id === selected);
  if (!entry) return;
  const p = entry.part;
  $('#inspect').innerHTML = `<span class="eyebrow">${categories[p.category]} · ${p.material}</span><h2>${p.name}</h2>
    <h3>${m.rectangular_blank()}</h3><dl>${p.size.map((value, i) => `<dt>${[m.axis_depth(), m.axis_height(), m.axis_wall()][i]}</dt><dd>${format(value)} mm</dd>`).join('')}</dl>
    <h3>${m.assembly_origin()}</h3><p class="coordinates">(${p.origin.map(format).join(', ')}) mm</p>    ${p.note ? `<p>${p.note}</p>` : ''}
    <h3>${m.machining()}</h3>
    ${p.profile ? `<p>${m.outline_rounded()}</p>` : ''}
    ${p.profileCuts ? `<p>${m.leg_opening()}</p>` : ''}
    ${p.cuts.length ? `<ul class="cut-list">${p.cuts.map(cut => `<li><b>${cut.label}</b><span>${cut.groove ? m.partial_groove() : m.through_cut()}</span><code>${cut.min.map(format).join(', ')}<br>→ ${cut.max.map(format).join(', ')}</code></li>`).join('')}</ul>` : !p.profile ? `<p class="muted">${m.no_cuts()}</p>` : ''}
    ${holeGroups(p).length ? `<h3>${m.holes()}</h3><ul class="cut-list">${holeGroups(p).map(([label, count]) => `<li><b>${label}</b><span>× ${count}</span></li>`).join('')}</ul>` : ''}
    <button id="inspect-part" class="primary">${m.view_piece_alone()}</button>`;
  $('#inspect-part').onclick = () => setMode('part');
}

function select(id: string) {
  selected = id;
  updateVisibility(); renderList(); inspect();
  if (mode === 'part') { updateTransforms(); fitCamera(); }
}

function setMode(next: string) {
  mode = next;
  if (mode === 'part' && !selected) selected = entries[0]?.part.id ?? null;
  explosion = mode === 'exploded' ? Math.max(explosion, 0.65) : 0;
  $<HTMLInputElement>('#explode').value = String(explosion);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) button.classList.toggle('active', button.dataset.mode === mode);
  updateTransforms(); updateVisibility(); renderList(); inspect(); fitCamera();
}

function visibleBounds() {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  for (const entry of entries) if (entry.pivot.visible) bounds.union(new THREE.Box3().setFromObject(entry.mesh));
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(params.L, params.H, params.D));
  return bounds;
}

function fitCamera(view = currentView) {
  if (view !== 'fit') currentView = view;
  const bounds = visibleBounds();
  const center = bounds.getCenter(new THREE.Vector3());
  const directions: Record<string, THREE.Vector3> = {
    iso: new THREE.Vector3(-1.25, 0.85, 1.8), front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1), top: new THREE.Vector3(0, 1, 0.0001), side: new THREE.Vector3(-1, 0, 0),
  };
  const direction = (directions[currentView] ?? directions.iso).clone().normalize();
  const size = bounds.getSize(new THREE.Vector3());
  const radius = size.length() / 2;
  const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.12;
  camera.position.copy(center).addScaledVector(direction, distance);
  controls.target.copy(center);
  camera.near = Math.max(0.1, distance / 2000);
  camera.far = Math.max(20000, distance * 10);
  camera.updateProjectionMatrix();
  controls.update();
}

new ResizeObserver(() => {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}).observe(viewport);

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode!));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.onclick = () => fitCamera(button.dataset.view!));
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => button.onclick = () => {
  for (const tab of ['inspect', 'parameters']) $(`#${tab}`).hidden = tab !== button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === button));
});
document.querySelectorAll<HTMLInputElement>('[data-category]').forEach(input => input.onchange = () => {
  const category = input.dataset.category as Category;
  input.checked ? visibleCategories.add(category) : visibleCategories.delete(category);
  isolated = false;
  updateVisibility();
});
$('#part-list').onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-part]');
  if (button) select(button.dataset.part!);
};
$('#search').oninput = renderList;
document.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach(button => button.onclick = () => setLocale(button.dataset.locale as typeof locales[number]));
$('#show-all').onclick = () => {
  isolated = false;
  Object.keys(categories).forEach(key => visibleCategories.add(key as Category));
  document.querySelectorAll<HTMLInputElement>('[data-category]').forEach(input => input.checked = true);
  if (mode === 'part') setMode('assembled');
  updateVisibility();
};
$('#isolate').onclick = () => {
  if (!selected) { toast(m.select_piece_first()); return; }
  isolated = !isolated;
  const category = entries.find(e => e.part.id === selected)!.part.category;
  visibleCategories.add(category);
  $<HTMLInputElement>(`[data-category="${category}"]`).checked = true;
  updateVisibility();
};
for (const id of ['edges', 'ghost', 'guides', 'hardware', 'joinery']) $(`#${id}`).onchange = () => { updateVisibility(); updateTransforms(); };
$('#explode').oninput = () => {
  explosion = Number($<HTMLInputElement>('#explode').value);
  mode = explosion > 0 ? 'exploded' : 'assembled';
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === mode));
  updateTransforms(); updateVisibility();
};
$('#doors').oninput = () => { doorAngle = Number($<HTMLInputElement>('#doors').value); updateTransforms(); };
document.querySelectorAll<HTMLInputElement>('[data-drawer]').forEach(input => input.oninput = () => {
  drawerTravel[input.dataset.drawer!] = Number(input.value);
  updateTransforms();
});

const raycaster = new THREE.Raycaster();
let down = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', event => { down.set(event.clientX, event.clientY); });
renderer.domElement.addEventListener('pointerup', event => {
  if (event.button !== 0 || down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
  const joinery = $('#joinery').matches(':checked');
  const hits = raycaster.intersectObjects(entries.filter(e => e.pivot.visible && (joinery || !e.mesh.material.transparent)).map(e => e.mesh));
  if (hits[0]) select(hits[0].object.userData.partId);
});

function syncFields() {
  for (const [key, value] of Object.entries(params)) $<HTMLInputElement>(`[name="${key}"]`).value = String(value);
}

function applyParams(candidate: Params) {
  const errors = validate(candidate);
  if (errors.length) { $('#errors').textContent = errors.join('\n'); return; }
  const previous = params;
  params = { ...candidate };
  try { build(); }
  catch (error) { params = previous; $('#errors').textContent = String(error); return; }
  $('#errors').textContent = '';
  try { localStorage.setItem('consola-entrada-params', JSON.stringify(params)); } catch { /* Storage is optional. */ }
  syncFields(); fitCamera();
  toast(m.geometry_rebuilt());
}

$('#parameter-form').onsubmit = event => {
  event.preventDefault();
  const form = new FormData($<HTMLFormElement>('#parameter-form'));
  applyParams(Object.fromEntries(Object.keys(defaults).map(key => [key, Number(form.get(key))])) as Params);
};
$('#reset').onclick = () => applyParams({ ...defaults });
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#save-params').onclick = () => download(new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' }), 'consola-entrada-parameters.json');
$('#load-params').onclick = () => $<HTMLInputElement>('#params-file').click();
$('#params-file').onchange = async () => {
  const input = $<HTMLInputElement>('#params-file');
  const file = input.files?.[0];
  if (!file) return;
  try {
    const json = JSON.parse(await file.text());
    applyParams(Object.fromEntries(Object.keys(defaults).map(key => [key, json[key]])) as Params);
  } catch { $('#errors').textContent = m.json_read_failed(); }
  input.value = '';
};

try {
  build();
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  fitCamera();
} catch (error) {
  $('#loading').textContent = m.build_failed({ error: String(error) });
  throw error;
}
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
