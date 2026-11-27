/* FX engine: big additive particle pools, solid toon debris, shock rings, flash sprites, ribbon bolts/slashes */
import * as THREE from "../vendor/three.module.min.js";

const rnd = Math.random;
function radialTex(stops) {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const GLOW = radialTex([[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,0.85)"], [0.6, "rgba(255,255,255,0.25)"], [1, "rgba(255,255,255,0)"]]);

class Pool {
  constructor(scene, n, additive) {
    this.n = n; this.i = 0; this.alive = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.sz = new Float32Array(n); this.al = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    this.drag = new Float32Array(n); this.s0 = new Float32Array(n); this.s1 = new Float32Array(n); this.floor = new Float32Array(n);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("size", new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("alpha", new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: additive
        ? `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vC * (0.6 + a * 0.9) + vec3(a * a * 0.5), a * vA); }`
        : `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; vec3 c = r > 0.38 ? vec3(0.17,0.1,0.13) : vC * (1.08 - r * 0.6); if (d.x + d.y < -0.25 && r < 0.3) c += 0.25; gl_FragColor = vec4(c, vA); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, vertexColors: false
    });
    this.mat = mat; this.pts = new THREE.Points(g, mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 20 : 10;
    scene.add(this.pts); this.geo = g;
  }
  emit(x, y, z, vx, vy, vz, c, size, life, o) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    this.life[i] = life; this.max[i] = life; this.s0[i] = size; this.s1[i] = o && o.s1 != null ? o.s1 : size * 0.2;
    this.grav[i] = o && o.grav != null ? o.grav : 0; this.drag[i] = o && o.drag != null ? o.drag : 1.5; this.floor[i] = o && o.floor ? 1 : 0;
  }
  update(dt) {
    const n = this.n;
    for (let i = 0; i < n; i++) {
      if (this.life[i] <= 0) { this.al[i] = 0; this.sz[i] = 0; continue; }
      this.life[i] -= dt; const k = Math.max(0, this.life[i] / this.max[i]);
      const dg = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= dg; this.vel[i * 3 + 2] *= dg; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dg - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.floor[i] && this.pos[i * 3 + 1] < 0.03) { this.pos[i * 3 + 1] = 0.03; this.vel[i * 3 + 1] *= -0.35; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
      this.sz[i] = this.s1[i] + (this.s0[i] - this.s1[i]) * k;
      this.al[i] = Math.min(1, k * 2.2);
    }
    for (const a of ["position", "color", "size", "alpha"]) this.geo.attributes[a].needsUpdate = true;
  }
}
const _c = new THREE.Color(), WHITE = new THREE.Color("#ffffff");
export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.add = new Pool(scene, 4500, true); this.solid = new Pool(scene, 3600, false);
    this.rings = []; this.flashes = []; this.ribbons = []; this.decals = [];
    const ringGeo = new THREE.RingGeometry(0.82, 1, 56); ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; m.renderOrder = 15; scene.add(m); this.rings.push({ m, life: 0 }); }
    for (let i = 0; i < 56; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: "#fff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; s.renderOrder = 25; scene.add(s); this.flashes.push({ s, life: 0 }); }
    const discGeo = new THREE.CircleGeometry(1, 28); discGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, depthWrite: false })); m.visible = false; m.renderOrder = 2; scene.add(m); this.decals.push({ m, life: 0 }); }
    for (let i = 0; i < 64; i++) {
      const g = new THREE.BufferGeometry(), N = 18, P = new Float32Array(N * 2 * 3), idx = [];
      for (let j = 0; j < N - 1; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx); g.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: "#fff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false; m.frustumCulled = false; m.renderOrder = 22; scene.add(m); this.ribbons.push({ m, life: 0, N });
    }
    this.q = 1;   // quality scale (mobile lowers)
  }
  burst(x, y, z, col, n, o) {
    o = o || {}; n = Math.round(n * this.q); _c.set(col);
    const sp = o.spd || 3, up = o.up != null ? o.up : 2.5, sz = o.size || 0.28, life = o.life || 0.6;
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = sp * (0.35 + rnd() * 0.8);
      this.add.emit(x, y, z, Math.cos(a) * s, up * (0.3 + rnd()), Math.sin(a) * s, _c, sz * (0.6 + rnd() * 0.8), life * (0.6 + rnd() * 0.7), { grav: o.grav != null ? o.grav : 4, drag: o.drag || 2.2, s1: o.s1 }); }
    if (o.puff !== false) { const np = Math.max(2, Math.round(n * 0.55)); for (let i = 0; i < np; i++) { const a = rnd() * Math.PI * 2, s = sp * (0.25 + rnd() * 0.6); _c.set(col); if (rnd() < 0.3) _c.lerp(WHITE, 0.45);
      this.solid.emit(x, y, z, Math.cos(a) * s, up * 0.5 * (0.3 + rnd()), Math.sin(a) * s, _c, sz * (0.7 + rnd() * 0.9), life * (0.5 + rnd() * 0.6), { grav: -0.6, drag: 3, s1: sz * 0.15 }); } _c.set(col); }
    if (o.white !== false) { _c.set("#ffffff"); for (let i = 0; i < n / 3; i++) { const a = rnd() * Math.PI * 2, s = sp * 0.6 * rnd(); this.add.emit(x, y, z, Math.cos(a) * s, up * rnd(), Math.sin(a) * s, _c, sz * 0.7, life * 0.5, { grav: 2, drag: 3 }); } }
  }
  chunks(x, y, z, col, n, o) {
    o = o || {}; n = Math.round(n * this.q); _c.set(col);
    const sp = o.spd || 2.4, sz = o.size || 0.16;
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = sp * (0.3 + rnd()); this.solid.emit(x, y, z, Math.cos(a) * s, (o.up || 3.5) * (0.5 + rnd()), Math.sin(a) * s, _c, sz * (0.6 + rnd() * 0.8), (o.life || 0.9) * (0.7 + rnd() * 0.5), { grav: o.grav != null ? o.grav : 11, drag: 0.6, s1: sz * 0.5, floor: o.floor !== false }); }
  }
  trail(x, y, z, col, sz, life, o) { _c.set(col); o = o || {}; const j = o.jit || 0.06; this.add.emit(x + (rnd() - 0.5) * j, y + (rnd() - 0.5) * j, z + (rnd() - 0.5) * j, (rnd() - 0.5) * (o.spd || 0.4), (o.up || 0.3) * rnd(), (rnd() - 0.5) * (o.spd || 0.4), _c, sz, life, { grav: o.grav || 0, drag: 2, s1: o.s1 }); }
  solidTrail(x, y, z, col, sz, life, o) { _c.set(col); o = o || {}; this.solid.emit(x, y, z, (rnd() - 0.5) * (o.spd || 0.6), (o.up || 0) + rnd() * 0.3, (rnd() - 0.5) * (o.spd || 0.6), _c, sz, life, { grav: o.grav || 0, drag: 2, s1: sz * 0.3, floor: o.floor }); }
  ring(x, z, r0, r1, col, life, o) {
    const r = this.rings.find(q => q.life <= 0) || this.rings[0]; o = o || {};
    Object.assign(r, { x, z, r0, r1, life, max: life, y: o.y || 0.06, op: o.op || 1, w: o.w || 0 });
    r.m.material.color.set(col); r.m.visible = true; r.m.position.set(x, r.y, z);
  }
  flash(x, y, z, col, size, life) {
    const f = this.flashes.find(q => q.life <= 0) || this.flashes[0];
    Object.assign(f, { size, life, max: life }); f.s.material.color.set(col); f.s.position.set(x, y, z); f.s.visible = true;
  }
  decal(x, z, r, col, life, op) {
    const d = this.decals.find(q => q.life <= 0) || this.decals[0];
    Object.assign(d, { life, max: life, op: op || 0.8 }); d.m.material.color.set(col); d.m.scale.setScalar(r); d.m.position.set(x, 0.025 + rnd() * 0.01, z); d.m.visible = true;
  }
  /* ribbon: pts = [Vector3...], width fn, life. bolt=true regenerates jitter */
  ribbon(pts, col, w, life, o) {
    const rb = this.ribbons.find(q => q.life <= 0) || this.ribbons[0]; o = o || {};
    Object.assign(rb, { pts: pts.slice(0, rb.N), w, life, max: life, taper: o.taper != null ? o.taper : 1, op: o.op || 1 });
    rb.m.material.color.set(col); rb.m.visible = true; rb.dirty = true;
  }
  bolt(a, b, col, life, o) {
    o = o || {}; const N = 10, pts = [], jit = o.jit || 0.35;
    const d = new THREE.Vector3().subVectors(b, a);
    for (let i = 0; i < N; i++) { const t = i / (N - 1), p = a.clone().addScaledVector(d, t);
      if (i > 0 && i < N - 1) { p.x += (rnd() - 0.5) * jit; p.y += (rnd() - 0.5) * jit; p.z += (rnd() - 0.5) * jit; } pts.push(p); }
    this.ribbon(pts, col, o.w || 0.22, life, { taper: 0.3 });
    this.ribbon(pts, "#ffffff", (o.w || 0.22) * 0.38, life, { taper: 0.3 });
    if (o.fork !== false && rnd() < 0.7) { const k = 3 + Math.floor(rnd() * 4), s = pts[k], e = s.clone().add(new THREE.Vector3((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 1.2));
      this.ribbon([s, s.clone().lerp(e, 0.5).add(new THREE.Vector3((rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.2)), e], col, (o.w || 0.22) * 0.5, life * 0.8, { taper: 0 }); }
  }
  arc(cx, y, cz, r, a0, a1, col, w, life) {
    const pts = []; for (let i = 0; i < 14; i++) { const a = a0 + (a1 - a0) * i / 13; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y + Math.sin(i / 13 * Math.PI) * 0.15, cz + Math.sin(a) * r)); }
    this.ribbon(pts, col, w, life, { taper: 1 }); this.ribbon(pts, "#ffffff", w * 0.35, life * 0.8, { taper: 1 });
  }
  update(dt) {
    this.add.update(dt); this.solid.update(dt);
    for (const r of this.rings) { if (r.life <= 0) continue; r.life -= dt; const k = 1 - Math.max(0, r.life) / r.max, e = 1 - Math.pow(1 - k, 3);
      r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * e); r.m.material.opacity = (1 - k) * r.op; if (r.life <= 0) r.m.visible = false; }
    for (const f of this.flashes) { if (f.life <= 0) continue; f.life -= dt; const k = Math.max(0, f.life) / f.max;
      f.s.scale.setScalar(f.size * (1.15 - k * 0.4)); f.s.material.opacity = k * 0.7; if (f.life <= 0) f.s.visible = false; }
    for (const d of this.decals) { if (d.life <= 0) continue; d.life -= dt; d.m.material.opacity = Math.min(1, d.life / 0.6) * d.op; if (d.life <= 0) d.m.visible = false; }
    const cam = this.camera.position, tmp = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3();
    for (const rb of this.ribbons) {
      if (rb.life <= 0) continue; rb.life -= dt; if (rb.life <= 0) { rb.m.visible = false; continue; }
      const k = rb.life / rb.max; rb.m.material.opacity = Math.min(1, k * 1.6) * rb.op;
      const P = rb.m.geometry.attributes.position.array, pts = rb.pts, n = pts.length;
      for (let i = 0; i < rb.N; i++) {
        const p = pts[Math.min(i, n - 1)], q = pts[Math.min(i + 1, n - 1)], pp = pts[Math.max(0, Math.min(i, n - 1) - 1)];
        tmp.subVectors(i < n - 1 ? q : p, i < n - 1 ? p : pp).normalize(); view.subVectors(cam, p).normalize(); side.crossVectors(tmp, view).normalize();
        const t = Math.min(i, n - 1) / Math.max(1, n - 1), w = rb.w * (1 - rb.taper * Math.abs(t - 0.5) * 1.6) * (0.6 + k * 0.4);
        P[i * 6] = p.x + side.x * w; P[i * 6 + 1] = p.y + side.y * w; P[i * 6 + 2] = p.z + side.z * w;
        P[i * 6 + 3] = p.x - side.x * w; P[i * 6 + 4] = p.y - side.y * w; P[i * 6 + 5] = p.z - side.z * w;
      }
      rb.m.geometry.attributes.position.needsUpdate = true;
    }
  }
  setScale(px) { this.add.mat.uniforms.scale.value = px; this.solid.mat.uniforms.scale.value = px; }
}
