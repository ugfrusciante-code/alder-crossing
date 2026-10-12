import * as T from 'three';
import { height, riverX, random, dist, type Point } from '../sim/terrain';
import { Kit, type Mats } from './models';

const noiseGLSL = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;

// Paths sit on the terrain with feathered, broken edges and two worn wheel tracks.
export function countryRoad(points: Point[], width = 2.3) {
  const curve = new T.CatmullRomCurve3(
    points.map((p) => new T.Vector3(p.x, 0, p.z)),
    false,
    'centripetal',
  );
  const segments = Math.ceil(curve.getLength() * 2),
    v: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = curve.getPoint(i / segments),
      t = curve.getTangent(i / segments);
    for (let j = 0; j <= 8; j++) {
      const u = j / 8,
        offset = (u - 0.5) * (width + 2.6),
        x = p.x + t.z * offset,
        z = p.z - t.x * offset;
      v.push(x, height(x, z) + 0.055, z);
      uv.push(u, i * 0.5);
    }
    if (i < segments)
      for (let j = 0; j < 8; j++) {
        const a = i * 9 + j;
        idx.push(a, a + 9, a + 1, a + 1, a + 9, a + 10);
      }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({
    color: 0xa59879,
    roughness: 1,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = 'varying vec2 pathUv; varying vec2 worldXZ;\n' + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\npathUv=uv;worldXZ=position.xz;',
    );
    s.fragmentShader = 'varying vec2 pathUv; varying vec2 worldXZ;\n' + noiseGLSL + '\n' + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
 float edge=abs(pathUv.x*2.-1.);float grain=noise(worldXZ*12.);float coarse=noise(worldXZ*1.8);float tracks=exp(-pow((edge-.32)*13.,2.));
 diffuseColor.rgb*=.78+grain*.3+coarse*.13-tracks*.14;
 diffuseColor.a*=1.-smoothstep(.40,.94,edge+(coarse-.5)*.25);`,
    );
  };
  const mesh = new T.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return mesh;
}

export function earthPatch(x: number, z: number, w: number, d: number, color = 0x877856) {
  const geo = new T.PlaneGeometry(w, d, 12, 12);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(x + pos.getX(i), z + pos.getZ(i)) + 0.06);
  geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ color, roughness: 1, transparent: true, depthWrite: false });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = 'varying vec2 patchUV;\n' + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\npatchUV=uv;',
    );
    s.fragmentShader = 'varying vec2 patchUV;\n' + noiseGLSL + '\n' + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\nfloat n=noise(patchUV*50.); diffuseColor.rgb*=.8+n*.4; diffuseColor.a*=1.-smoothstep(.52,1.,length((patchUV-.5)*2.)+(noise(patchUV*15.)-.5)*.25);',
    );
  };
  const m = new T.Mesh(geo, mat);
  m.position.set(x, 0, z);
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

export function woodland(scene: T.Scene, m: Mats, buildings: Point[]) {
  const rng = random(9124),
    trees: { x: number; z: number; s: number; pine: boolean }[] = [];
  for (let i = 0; i < 1750; i++) {
    const x = (rng() - 0.5) * 295,
      z = (rng() - 0.5) * 290;
    const inVillage = Math.hypot((x + 20) / 1.1, z) < 49;
    if (
      inVillage ||
      Math.abs(z - 10) < 7 ||
      Math.abs(x - riverX(z)) < 11 ||
      (x > 43 && x < 70 && Math.abs(z - 12) < 26)
    )
      continue;
    if (Math.sin(x * 0.07 + z * 0.04) + Math.cos(z * 0.065) < -0.2) continue;
    trees.push({ x, z, s: 0.75 + rng() * 0.9, pine: rng() < 0.19 });
  }
  // Deliberate village trees frame buildings without obscuring entrances or the market.
  for (const [x, z, s] of [
    [-49, -7, 1.05],
    [-34, -18, 0.95],
    [-22, 17, 0.8],
    [-43, 24, 0.9],
    [-6, 28, 1.15],
    [16, 29, 1.3],
    [22, -4, 1.25],
    [11, -28, 1],
    [-62, 12, 1.3],
    [-27, 36, 1.05],
    [48, 37, 1.2],
  ])
    if (!buildings.some((b) => dist(b, { x, z }) < 4)) trees.push({ x, z, s, pine: false });
  const tex = new T.TextureLoader().load('./textures/foliage.png');
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 8;
  const geo = new T.PlaneGeometry(1, 1),
    leaves: T.InstancedMesh[] = [];
  for (const color of [0xc0c6a0, 0x9faf8b, 0xd0bc83]) {
    const mat = new T.MeshStandardMaterial({
      map: tex,
      color,
      alphaTest: 0.48,
      side: T.DoubleSide,
      roughness: 1,
    });
    const leaf = new T.InstancedMesh(geo, mat, trees.length * 8);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    leaf.customDepthMaterial = new T.MeshDepthMaterial({
      depthPacking: T.RGBADepthPacking,
      map: tex,
      alphaTest: 0.48,
      side: T.DoubleSide,
    });
    leaves.push(leaf);
    scene.add(leaf);
  }
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.35, 1, 1, 7), m.timber, trees.length * 6);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  const o = new T.Object3D();
  trees.forEach((t, i) => {
    const y = height(t.x, t.z),
      h = (t.pine ? 9 : 6.8) * t.s;
    o.position.set(t.x, y + h * 0.5, t.z);
    o.rotation.set(0, 0, 0);
    o.scale.set(0.32 * t.s, h, 0.32 * t.s);
    o.updateMatrix();
    trunks.setMatrixAt(i * 6, o.matrix);
    for (let a = 0; a < 5; a++) {
      const theta = a * 2.4 + i,
        rad = 1.9 * t.s;
      const from = new T.Vector3(t.x, y + h * 0.43, t.z),
        to = new T.Vector3(
          t.x + Math.cos(theta) * rad,
          y + h * (0.65 + a * 0.04),
          t.z + Math.sin(theta) * rad,
        ),
        direction = to.clone().sub(from);
      o.position.copy(from).add(to).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.clone().normalize());
      o.scale.set(0.1 * t.s, direction.length(), 0.1 * t.s);
      o.updateMatrix();
      trunks.setMatrixAt(i * 6 + a + 1, o.matrix);
    }
    for (let j = 0; j < 3; j++)
      for (let q = 0; q < 8; q++) {
        const angle = q * 2.4 + i * 1.3 + j,
          rad = (t.pine ? 0.8 : 1.55) * t.s * (1.2 - j * 0.2),
          cx = t.x + Math.cos(angle) * rad,
          cz = t.z + Math.sin(angle) * rad;
        o.position.set(cx, y + h * (0.6 + j * 0.15) + (q % 3) * 0.45 * t.s, cz);
        o.rotation.set(q % 3 === 0 ? -Math.PI * 0.43 : (rng() - 0.5) * 1.1, angle, (rng() - 0.5) * 0.6);
        const size = (t.pine ? 3.4 - j * 0.7 : 3.9 - j * 0.45) * t.s;
        o.scale.set(size, size * (t.pine ? 1 : 0.85), 1);
        o.updateMatrix();
        leaves[j].setMatrixAt(i * 8 + q, o.matrix);
      }
  });
  scene.add(trunks);
  const originals = [...leaves, trunks].map((mesh) => mesh.instanceMatrix.array.slice());
  const clearPlots = (plots: { x: number; z: number; width: number; depth: number }[]) => {
    [...leaves, trunks].forEach((mesh, i) => {
      mesh.instanceMatrix.array.set(originals[i]);
      mesh.instanceMatrix.needsUpdate = true;
    });
    const hidden = new T.Matrix4().makeScale(0, 0, 0);
    trees.forEach((t, i) => {
      if (!plots.some((b) => Math.abs(b.x - t.x) < b.width / 2 + 2 && Math.abs(b.z - t.z) < b.depth / 2 + 2))
        return;
      for (const leaf of leaves) for (let q = 0; q < 8; q++) leaf.setMatrixAt(i * 8 + q, hidden);
      for (let q = 0; q < 6; q++) trunks.setMatrixAt(i * 6 + q, hidden);
    });
  };
  return { leaves, clearPlots };
}

export function courtyard(m: Mats, seed: number) {
  const k = new Kit(),
    r = random(seed);
  // A woven back fence, tended garden rows and domestic clutter give each home a plot.
  for (let i = 0; i < 11; i++) {
    const x = -3 + i * 0.58;
    k.cylinder(x, 0.6, -4.4, 0.055, 1.2, 'wood');
    for (let j = 0; j < 4; j++)
      k.box(x, 0.22 + j * 0.23, -4.4, 0.65, 0.055, 0.06, 'timber', 0, 0, (i % 2 ? 1 : -1) * 0.07);
  }
  for (const x of [-3, 3])
    for (let i = 0; i < 5; i++) {
      k.cylinder(x, 0.6, -2.4 - i * 0.5, 0.055, 1.2, 'wood');
      k.box(x, 0.35, -3.4, 0.055, 0.08, 2.2, 'wood');
      k.box(x, 0.8, -3.4, 0.055, 0.08, 2.2, 'wood');
    }
  for (let row = 0; row < 3; row++) {
    k.box(-0.6, 0.025, -2.6 - row * 0.48, 3.8, 0.04, 0.33, 'soil');
    for (let i = 0; i < 10; i++) {
      k.push(
        new T.SphereGeometry(0.105 + r() * 0.08, 5, 4),
        'green',
        -2.3 + i * 0.37,
        0.12,
        -2.6 - row * 0.48,
      );
    }
  }
  for (let i = 0; i < 7; i++)
    k.cylinder(2.5, 0.15 + (i % 3) * 0.2, -2.4 - Math.floor(i / 3) * 0.24, 0.12, 0.8, 'wood', 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) k.push(new T.SphereGeometry(0.16, 7, 5), 'rust', -2.6 + i * 0.3, 0.15, 2.3);
  return k.finish(m);
}

export function marketDetails(m: Mats) {
  const k = new Kit();
  // Stone well, hand-cranked spindle and oak bucket.
  for (let row = 0; row < 4; row++)
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2 + row * 0.12;
      k.box(
        -8 + Math.cos(a) * 0.85,
        0.15 + row * 0.24,
        9 + Math.sin(a) * 0.85,
        0.36,
        0.22,
        0.34,
        'stone',
        0,
        -a,
        0,
      );
    }
  for (const x of [-9.1, -6.9]) k.box(x, 1.4, 9, 0.14, 2.8, 0.14, 'timber');
  k.box(-8, 2.5, 9, 2.4, 0.14, 0.14, 'timber');
  k.cylinder(-8, 1.8, 9, 0.12, 2.3, 'wood', 0, Math.PI / 2);
  k.cylinder(-8, 1, 9, 0.015, 1.5, 'cloth');
  k.cylinder(-8, 0.9, 9, 0.22, 0.35, 'wood');
  const well = k.finish(m);
  well.position.y = height(-8, 9);
  const cart = new Kit();
  cart.box(0, 0.8, 0, 1.3, 0.12, 2.1, 'wood');
  for (const x of [-0.68, 0.68])
    for (let i = 0; i < 3; i++) cart.box(x, 1 + i * 0.17, 0, 0.07, 0.13, 2.1, 'wood');
  cart.box(0, 1.2, -1, 1.4, 0.7, 0.07, 'wood');
  for (const x of [-0.4, 0.4]) cart.box(x, 0.65, 1.7, 0.08, 0.1, 2, 'timber');
  for (const x of [-0.9, 0.9]) {
    cart.push(new T.TorusGeometry(0.53, 0.065, 5, 16), 'timber', x, 0.55, 0.3, 0, Math.PI / 2);
    for (let j = 0; j < 6; j++) cart.box(x, 0.55, 0.3, 0.07, 0.95, 0.055, 'wood', (j * Math.PI) / 3);
  }
  const wagon = cart.finish(m);
  wagon.position.set(-24, height(-24, 7), 7);
  wagon.rotation.y = 0.3;
  const group = new T.Group();
  group.add(well, wagon);
  return group;
}
