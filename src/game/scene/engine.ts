import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getCatalogItem } from "../catalog";
import { MAX_PLATES, PLATE_H, PLATE_STUDS } from "../constants";
import { TapGesture } from "../gestures";
import {
  brickWorldMatrix,
  getBrickGeometry,
  getMaterial,
  orientedSize,
} from "../geometry";
import { transformPrefab } from "../occupancy";
import { expandSlots, useCity } from "../store";
import { getPlateTexture, getWoodTexture } from "../textures";
import type { PlacedBrick, VoxelBrick } from "../types";

function cityCenter(plates: { gx: number; gz: number }[]) {
  if (plates.length === 0) return { x: 16, z: 16, w: 32, d: 32 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of plates) {
    minX = Math.min(minX, p.gx);
    maxX = Math.max(maxX, p.gx);
    minZ = Math.min(minZ, p.gz);
    maxZ = Math.max(maxZ, p.gz);
  }
  return {
    x: ((minX + maxX + 1) * PLATE_STUDS) / 2,
    z: ((minZ + maxZ + 1) * PLATE_STUDS) / 2,
    w: (maxX - minX + 1) * PLATE_STUDS,
    d: (maxZ - minZ + 1) * PLATE_STUDS,
  };
}

export function mountCity(canvas: HTMLCanvasElement): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#c5dff0");
  scene.fog = new THREE.Fog("#c5dff0", 110, 280);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 420);
  camera.position.set(58, 46, 58);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor("#c5dff0", 1);

  const hemi = new THREE.HemisphereLight("#eef6ff", "#c4a882", 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff6e8", 1.45);
  key.position.set(48, 70, 28);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#b7d4ea", 0.32);
  fill.position.set(-36, 24, -22);
  scene.add(fill);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 18;
  controls.maxDistance = 140;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.25;
  controls.target.set(48, 0.4, 32);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  const root = new THREE.Group();
  scene.add(root);

  const felt = new THREE.Mesh(
    new THREE.CircleGeometry(220, 48),
    new THREE.MeshStandardMaterial({ color: "#3e4146", roughness: 0.95 }),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = -0.02;
  scene.add(felt);

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      map: getWoodTexture(),
      roughness: 0.85,
      metalness: 0,
      color: "#d8b08a",
    }),
  );
  scene.add(table);

  const platesGroup = new THREE.Group();
  scene.add(platesGroup);
  const bricksGroup = new THREE.Group();
  scene.add(bricksGroup);
  const ghostGroup = new THREE.Group();
  scene.add(ghostGroup);
  const expandGroup = new THREE.Group();
  scene.add(expandGroup);

  const ghostMatOk = new THREE.MeshStandardMaterial({
    color: "#3d9a5c",
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    roughness: 0.4,
  });
  const ghostMatBad = new THREE.MeshStandardMaterial({
    color: "#c44738",
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    roughness: 0.4,
  });
  const expandMat = new THREE.MeshStandardMaterial({
    color: "#8f3d2c",
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  function layoutTable(plates: { gx: number; gz: number }[]) {
    const b = cityCenter(plates);
    const w = Math.max(90, b.w + 48);
    const d = Math.max(90, b.d + 48);
    table.position.set(b.x, -0.55, b.z);
    table.scale.set(w, 1, d);
    felt.position.set(b.x, -0.02, b.z);
    controls.target.set(b.x, 0.4, b.z);
  }

  function rebuildPlates(plates: ReturnType<typeof useCity.getState>["plates"]) {
    while (platesGroup.children.length) {
      const ch = platesGroup.children[0]!;
      platesGroup.remove(ch);
      (ch as THREE.Mesh).geometry.dispose();
      const mat = (ch as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
    for (const p of plates) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(PLATE_STUDS - 0.04, PLATE_H, PLATE_STUDS - 0.04),
        new THREE.MeshStandardMaterial({
          map: getPlateTexture(p.type),
          roughness: 0.55,
          metalness: 0.02,
        }),
      );
      mesh.position.set(
        p.gx * PLATE_STUDS + PLATE_STUDS / 2,
        PLATE_H / 2,
        p.gz * PLATE_STUDS + PLATE_STUDS / 2,
      );
      platesGroup.add(mesh);
    }
    layoutTable(plates);
  }

  function rebuildBricks(bricks: PlacedBrick[]) {
    while (bricksGroup.children.length) {
      (bricksGroup.children[0] as THREE.InstancedMesh).dispose();
      bricksGroup.remove(bricksGroup.children[0]!);
    }
    const buckets = new Map<string, PlacedBrick[]>();
    for (const b of bricks) {
      const key = `${b.kind}:${b.w}x${b.d}x${b.h}:${b.color}`;
      const list = buckets.get(key);
      if (list) list.push(b);
      else buckets.set(key, [b]);
    }
    for (const [key, items] of buckets) {
      const sample = items[0]!;
      const geo = getBrickGeometry(sample.kind, sample.w, sample.d, sample.h);
      const mat = getMaterial(sample.color, sample.kind);
      const inst = new THREE.InstancedMesh(geo, mat, items.length);
      inst.frustumCulled = false;
      items.forEach((b, i) => {
        inst.setMatrixAt(i, brickWorldMatrix(b.x, b.y, b.z, b.w, b.d, b.rot));
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.userData.key = key;
      inst.userData.groupIds = items.map(b => b.groupId);
      bricksGroup.add(inst);
    }
  }

  function ghostVoxels(): VoxelBrick[] {
    const s = useCity.getState();
    if (s.phase !== "play" || s.mode !== "place" || !s.ghost) return [];
    const item = getCatalogItem(s.selectedId);
    if (!item || item.kind === "baseplate") return [];
    if (item.prefab) return transformPrefab(item.prefab, s.ghost.x, s.ghost.z, s.rot, s.color);
    if (item.kind === "prefab") return [];
    return [
      {
        kind: item.kind,
        w: item.w,
        d: item.d,
        h: item.h,
        color: s.color,
        x: s.ghost.x,
        z: s.ghost.z,
        y: s.ghost.y,
        rot: s.rot,
      },
    ];
  }

  function rebuildGhost() {
    while (ghostGroup.children.length) {
      ghostGroup.remove(ghostGroup.children[0]!);
    }
    const s = useCity.getState();
    const voxels = ghostVoxels();
    const mat = s.ghost?.valid ? ghostMatOk : ghostMatBad;
    const yLift = getCatalogItem(s.selectedId)?.prefab ? (s.ghost?.y ?? 0) : 0;
    for (const b of voxels) {
      const geo = getBrickGeometry(b.kind, b.w, b.d, b.h);
      const mesh = new THREE.Mesh(geo, mat);
      const size = orientedSize(b.w, b.d, b.rot);
      let x = b.x;
      let z = b.z;
      if (b.rot === 1) x += size.w;
      else if (b.rot === 2) {
        x += size.w;
        z += size.d;
      } else if (b.rot === 3) z += size.d;
      mesh.position.set(x, PLATE_H + (b.y + yLift) * PLATE_H, z);
      mesh.rotation.y = -b.rot * (Math.PI / 2);
      ghostGroup.add(mesh);
    }
  }

  function rebuildExpand() {
    const oldGeometry = new Set<THREE.BufferGeometry>();
    expandGroup.traverse(obj => { if (obj instanceof THREE.Mesh) oldGeometry.add(obj.geometry); });
    oldGeometry.forEach(geo => geo.dispose());
    while (expandGroup.children.length) {
      const ch = expandGroup.children[0]!;
      expandGroup.remove(ch);
    }
    const s = useCity.getState();
    if (s.phase !== "play" || s.mode !== "expand" || s.plates.length >= MAX_PLATES) return;
    const geo = new THREE.BoxGeometry(PLATE_STUDS - 1.2, 0.12, PLATE_STUDS - 1.2);
    const bar = new THREE.BoxGeometry(8, 0.35, 1.4);
    const bar2 = new THREE.BoxGeometry(1.4, 0.35, 8);
    for (const slot of expandSlots(s.plates)) {
      const g = new THREE.Group();
      g.position.set(
        slot.gx * PLATE_STUDS + PLATE_STUDS / 2,
        PLATE_H * 0.7,
        slot.gz * PLATE_STUDS + PLATE_STUDS / 2,
      );
      g.add(new THREE.Mesh(geo, expandMat));
      const h1 = new THREE.Mesh(bar, expandMat);
      h1.position.y = 0.4;
      const h2 = new THREE.Mesh(bar2, expandMat);
      h2.position.y = 0.4;
      g.add(h1, h2);
      expandGroup.add(g);
    }
  }

  function sync(state: ReturnType<typeof useCity.getState>) {
    rebuildPlates(state.plates);
    rebuildBricks(state.bricks);
    rebuildGhost();
    rebuildExpand();
    controls.autoRotate = state.phase === "title";
  }

  sync(useCity.getState());

  const unsub = useCity.subscribe((state, prev) => {
    if (state.plates !== prev.plates) rebuildPlates(state.plates);
    if (state.bricks !== prev.bricks) rebuildBricks(state.bricks);
    if (
      state.ghost !== prev.ghost ||
      state.selectedId !== prev.selectedId ||
      state.rot !== prev.rot ||
      state.color !== prev.color ||
      state.mode !== prev.mode ||
      state.phase !== prev.phase
    ) {
      rebuildGhost();
    }
    if (state.plates !== prev.plates || state.mode !== prev.mode || state.phase !== prev.phase) rebuildExpand();
    if (state.bricks !== prev.bricks && state.ghost && state.mode === "place") {
      const item = getCatalogItem(state.selectedId);
      if (item) {
        const size = orientedSize(item.w, item.d, state.rot);
        state.setGhostWorld(state.ghost.x + size.w / 2, state.ghost.z + size.d / 2);
      }
    }
    controls.autoRotate = state.phase === "title";
  });

  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLATE_H);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const gesture = new TapGesture();

  function pointerToWorld(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const s = useCity.getState();
    const picked = s.mode !== "expand" ? raycaster.intersectObjects(bricksGroup.children, false)[0] : undefined;
    if (picked) {
      // Use the visible object rather than its displaced projection on the ground.
      s.setGhostWorld(picked.point.x, picked.point.z);
      return picked.instanceId === undefined ? undefined : picked.object.userData.groupIds[picked.instanceId] as string;
    }
    if (raycaster.ray.intersectPlane(plane, hit)) {
      useCity.getState().setGhostWorld(hit.x, hit.z);
    } else {
      useCity.setState({ ghost: null });
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    gesture.move(e);
    if (useCity.getState().phase !== "play") return;
    pointerToWorld(e);
  };
  const onPointerDown = (e: PointerEvent) => {
    gesture.down(e);
  };
  const onPointerUp = (e: PointerEvent) => {
    const tapped = gesture.up(e);
    const s = useCity.getState();
    if (s.phase !== "play" || s.helpOpen || !tapped) return;
    const picked = pointerToWorld(e);
    if (s.mode === "erase") { if (picked) s.eraseGroup(picked); else s.eraseAtGhost(); }
    else s.placeAtGhost();
  };

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  const onCancel = (e: PointerEvent) => gesture.cancel(e.pointerId);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("lostpointercapture", onCancel);

  const resize = () => {
    const parent = canvas.parentElement ?? canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);
  window.addEventListener("resize", resize);

  const loop = () => {
    controls.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);

  return () => {
    renderer.setAnimationLoop(null);
    unsub();
    ro.disconnect();
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onCancel);
    canvas.removeEventListener("lostpointercapture", onCancel);
    controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        geometries.add(obj.geometry);
        for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(mat);
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      }
    });
    geometries.forEach(geo => geo.dispose());
    materials.forEach(mat => mat.dispose());
    renderer.dispose();
    ghostMatOk.dispose();
    ghostMatBad.dispose();
    expandMat.dispose();
    void root;
  };
}
