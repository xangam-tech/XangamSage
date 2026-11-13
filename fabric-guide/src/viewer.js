// One hanging swatch in its own 3D view. Compare mode can create two of these.

import * as THREE from '../vendor/three.module.min.js';
import { Cloth } from './cloth.js';
import { makeWeave } from './weave.js';

const SWATCH = { width: 0.62, height: 0.78, cols: 33, rows: 41 };
const FIXED_DT = 1 / 60;
const FOV = 32;

// key: direction and colour of the main light. room: soft light from all around.
// panel: the bright shape reflected in shiny cloth (window, tube, bulb).
export const LIGHTS = {
  daylight: {
    label: 'Daylight',
    key: { dir: [-0.85, 0.5, 0.6], colour: 0xfff5e8, power: 2.1 },
    room: { colour: [0.78, 0.84, 0.95], power: 0.55 },
    panel: { size: [5, 5], power: 4 },
    shadow: 0.1,
  },
  tube: {
    label: 'Tube light',
    key: { dir: [0.15, 0.9, 0.7], colour: 0xe4f0ff, power: 1.3 },
    room: { colour: [0.74, 0.82, 0.86], power: 0.7 },
    panel: { size: [6, 0.45], power: 16 },
    shadow: 0.07,
  },
  bulb: {
    label: 'Warm bulb',
    key: { dir: [0.8, 0.55, 0.55], colour: 0xffd09c, power: 2.0 },
    room: { colour: [0.62, 0.5, 0.38], power: 0.4 },
    panel: { size: [1, 1], power: 30 },
    shadow: 0.14,
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class FabricViewer {
  constructor(container, fabric) {
    this.container = container;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    container.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 20);

    // Lights
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const sc = this.keyLight.shadow.camera;
    sc.left = -0.75; sc.right = 0.75; sc.top = 0.6; sc.bottom = -1.1; sc.near = 0.5; sc.far = 6;
    this.keyLight.shadow.bias = -0.0008;
    this.keyLight.shadow.normalBias = 0.012;
    this.keyLight.shadow.radius = 5;
    this.keyLight.target.position.set(0, -SWATCH.height / 2, 0);
    this.scene.add(this.keyLight, this.keyLight.target);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envCache = {};

    // Cloth
    this.cloth = new Cloth(SWATCH);
    const { cols, rows } = SWATCH;
    const geo = new THREE.BufferGeometry();
    const uv = new Float32Array(cols * rows * 2);
    const index = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        uv[i * 2] = c / (cols - 1);
        uv[i * 2 + 1] = 1 - r / (rows - 1);
        if (c + 1 < cols && r + 1 < rows) index.push(i, i + cols, i + 1, i + 1, i + cols, i + cols + 1);
      }
    }
    this.posAttr = new THREE.BufferAttribute(this.cloth.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.normAttr = new THREE.BufferAttribute(this.cloth.normals, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('normal', this.normAttr);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -SWATCH.height / 2, 0), 2);
    this.material = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, transparent: true, metalness: 0 });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // Rail and clips
    const metal = new THREE.MeshStandardMaterial({ color: 0x8a8d8c, roughness: 0.45, metalness: 0.6 });
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, SWATCH.width * 1.08, 12), metal);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.022, 0);
    this.scene.add(rail);
    this.clips = this.cloth.pins.map(() => {
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.008), metal);
      this.scene.add(clip);
      return clip;
    });

    // Soft shadow on an unseen wall behind the cloth
    this.shadowMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), this.shadowMat);
    wall.position.set(0, -0.4, -0.16);
    wall.receiveShadow = true;
    this.scene.add(wall);

    // View state
    this.orbit = { az: 0.35, pol: 1.5, zoom: 1 };
    this.close = { on: false, u: 0.5, v: 0.42, dist: 0.06 };
    this.fitDist = 2.4;
    this.lift = 0;
    this.camPos = new THREE.Vector3();
    this.camTarget = new THREE.Vector3(0, -SWATCH.height * 0.47, 0);
    this.firstFrame = true;
    this.air = 1;
    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.acc = 0;
    this.last = 0;
    this.slow = 0;
    this.running = false;

    this.ray = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane();
    this.grabStart = new THREE.Vector3();
    this.pointers = new Map();
    this.mode = null;
    this.bindInput();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.setLight('daylight');
    this.setFabric(fabric);
    this.frame = this.frame.bind(this);
    this.start();
  }

  setFabric(fabric) {
    this.fabric = fabric;
    const look = fabric.look;
    const weave = makeWeave(fabric);
    const repeatX = SWATCH.width / weave.tileMetres, repeatY = SWATCH.height / weave.tileMetres;
    const wrap = (canvas, srgb) => {
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = Math.min(8, this.maxAniso);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const m = this.material;
    m.map?.dispose();
    m.normalMap?.dispose();
    m.map = wrap(weave.colour, true);
    m.normalMap = wrap(weave.normal, false);
    m.roughness = look.roughness;
    m.sheen = look.sheen;
    m.sheenRoughness = look.sheenRoughness;
    m.sheenColor.set(0xffffff);
    m.needsUpdate = true;
    this.canvas.setAttribute('aria-label', `A hanging swatch of ${fabric.name}. Drag to turn it or to pull the cloth.`);

    this.cloth.setPhysics(fabric.physics);
    this.resetCloth();
  }

  resetCloth() {
    this.cloth.reset();
    for (let i = 0; i < 90; i++) this.cloth.step(FIXED_DT, 0);
    this.cloth.updateNormals();
    this.cloth.pinPositions().forEach((p, i) => this.clips[i].position.set(p[0], p[1] + 0.008, p[2]));
    this.posAttr.needsUpdate = true;
    this.normAttr.needsUpdate = true;
  }

  resetView() {
    this.orbit.az = 0.35; this.orbit.pol = 1.5; this.orbit.zoom = 1;
    this.close.u = 0.5; this.close.v = 0.42; this.close.dist = 0.06;
    this.resetCloth();
  }

  setLight(id) {
    const L = LIGHTS[id];
    this.lightId = id;
    this.keyLight.color.set(L.key.colour);
    this.keyLight.intensity = L.key.power;
    this.keyLight.position.set(...L.key.dir).normalize().multiplyScalar(3).add(this.keyLight.target.position);
    this.shadowMat.opacity = L.shadow;
    if (!this.envCache[id]) {
      const s = new THREE.Scene();
      const basic = (r, g, b) => {
        const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
        mat.color.setRGB(r, g, b);
        return mat;
      };
      const rc = L.room.colour, rp = L.room.power;
      s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), basic(rc[0] * rp, rc[1] * rp, rc[2] * rp)));
      const kc = new THREE.Color(L.key.colour);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(...L.panel.size), basic(kc.r * L.panel.power, kc.g * L.panel.power, kc.b * L.panel.power));
      panel.position.set(...L.key.dir).normalize().multiplyScalar(4.5);
      panel.lookAt(0, 0, 0);
      s.add(panel);
      this.envCache[id] = this.pmrem.fromScene(s, 0.03).texture;
    }
    this.scene.environment = this.envCache[id];
  }

  setCloseUp(on) {
    this.close.on = on;
    if (on && this.mode === 'grab') this.cloth.release();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const t = Math.tan((FOV * Math.PI) / 360);
    // Leave room for the buttons that sit over the top and bottom of the view.
    const TOP = 56, BOTTOM = 92;
    const free = Math.max(0.5, (h - TOP - BOTTOM) / h);
    this.fitDist = Math.max((SWATCH.height * 1.24) / 2 / t / free, (SWATCH.width * 1.2) / 2 / (t * this.camera.aspect));
    this.lift = ((BOTTOM - TOP) / 2 / h) * 2 * t * this.fitDist;
    this.viewH = h;
  }

  // ---- input ----

  pointerRay(e) {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    return this.ray;
  }

  hitCloth(e) {
    const hit = this.pointerRay(e).intersectObject(this.mesh)[0];
    if (!hit) return null;
    const { cols, rows } = SWATCH;
    const c = Math.round(hit.uv.x * (cols - 1)), r = Math.round((1 - hit.uv.y) * (rows - 1));
    return { index: r * cols + c, point: hit.point };
  }

  bindInput() {
    const el = this.canvas;
    const P = this.pointers;

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      P.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (P.size === 1) {
        const hit = this.close.on ? null : this.hitCloth(e);
        if (hit) {
          this.mode = 'grab';
          this.cloth.grab(hit.index);
          this.grabStart.copy(hit.point);
          this.dragPlane.setFromNormalAndCoplanarPoint(this.camera.getWorldDirection(new THREE.Vector3()), hit.point);
          el.style.cursor = 'grabbing';
        } else {
          this.mode = this.close.on ? 'pan' : 'orbit';
        }
      } else if (P.size === 2) {
        if (this.mode === 'grab') this.cloth.release();
        this.mode = 'pinch';
        const [a, b] = [...P.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.orbit.zoom, dist: this.close.dist };
      }
    });

    el.addEventListener('pointermove', (e) => {
      const p = P.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse' && !this.close.on) el.style.cursor = this.hitCloth(e) ? 'grab' : '';
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (this.mode === 'grab') {
        const pt = this.pointerRay(e).ray.intersectPlane(this.dragPlane, new THREE.Vector3());
        if (pt) {
          // Keep the pull within arm's reach so the cloth is never torn off its clips.
          const off = pt.sub(this.grabStart);
          if (off.length() > 0.3) off.setLength(0.3);
          off.add(this.grabStart);
          this.cloth.moveGrab(off.x, off.y, off.z);
        }
      } else if (this.mode === 'orbit') {
        this.orbit.az -= dx * 0.008;
        this.orbit.pol = clamp(this.orbit.pol - dy * 0.006, 0.75, 2.1);
      } else if (this.mode === 'pan') {
        const mpp = (2 * this.close.dist * Math.tan((FOV * Math.PI) / 360)) / this.viewH;
        this.close.u = clamp(this.close.u - (dx * mpp) / SWATCH.width, 0.08, 0.92);
        this.close.v = clamp(this.close.v - (dy * mpp) / SWATCH.height, 0.08, 0.92);
      } else if (this.mode === 'pinch' && P.size === 2) {
        const [a, b] = [...P.values()];
        const k = this.pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
        this.zoomTo(this.pinch.zoom * k, this.pinch.dist * k);
      }
    });

    const end = (e) => {
      if (!P.delete(e.pointerId)) return;
      if (this.mode === 'grab') {
        this.cloth.release();
        el.style.cursor = '';
      }
      this.mode = P.size === 1 ? (this.close.on ? 'pan' : 'orbit') : null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = Math.exp(e.deltaY * 0.0012);
      this.zoomTo(this.orbit.zoom * k, this.close.dist * k);
    }, { passive: false });

    el.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
      if (step) {
        this.orbit.az += step[0];
        this.orbit.pol = clamp(this.orbit.pol + step[1], 0.75, 2.1);
        e.preventDefault();
      } else if (e.key === '+' || e.key === '=') this.zoomTo(this.orbit.zoom * 0.9, this.close.dist * 0.9);
      else if (e.key === '-') this.zoomTo(this.orbit.zoom * 1.1, this.close.dist * 1.1);
    });
  }

  zoomTo(zoom, dist) {
    if (this.close.on) this.close.dist = clamp(dist, 0.03, 0.14);
    else this.orbit.zoom = clamp(zoom, 0.4, 1.6);
  }

  // ---- loop ----

  start() {
    if (this.running) return;
    this.running = true;
    this.last = 0;
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  frame(now) {
    if (!this.running) return;
    requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : FIXED_DT;
    this.last = now;

    // If the phone is struggling, render fewer pixels rather than drop frames.
    this.slow = dt > 1 / 28 ? this.slow + 1 : Math.max(0, this.slow - 1);
    if (this.slow > 45 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.5);
      this.slow = 0;
      this.resize();
    }

    const airGoal = this.calm || this.close.on ? 0 : 1;
    this.air += (airGoal - this.air) * Math.min(1, dt * 3);
    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 2) {
      this.cloth.step(FIXED_DT, this.air);
      this.acc -= FIXED_DT;
      steps++;
    }
    if (this.acc > FIXED_DT) this.acc = 0;
    this.cloth.updateNormals();
    this.posAttr.needsUpdate = true;
    this.normAttr.needsUpdate = true;

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(dt) {
    const pos = new THREE.Vector3(), target = new THREE.Vector3();
    if (this.close.on) {
      const { cols, rows } = SWATCH;
      const i = (Math.round(this.close.v * (rows - 1)) * cols + Math.round(this.close.u * (cols - 1))) * 3;
      target.set(this.cloth.pos[i], this.cloth.pos[i + 1], this.cloth.pos[i + 2]);
      pos.set(0.1, 0.08, 1).normalize().multiplyScalar(this.close.dist).add(target);
    } else {
      target.set(0, -SWATCH.height * 0.47 - this.lift * this.orbit.zoom, 0);
      const d = this.fitDist * this.orbit.zoom, { az, pol } = this.orbit;
      pos.set(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)).multiplyScalar(d).add(target);
    }
    const k = this.firstFrame ? 1 : 1 - Math.exp(-dt * 7);
    this.firstFrame = false;
    this.camPos.lerp(pos, k);
    this.camTarget.lerp(target, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
  }

  dispose() {
    this.stop();
    this.resizeObserver.disconnect();
    this.material.map?.dispose();
    this.material.normalMap?.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
    Object.values(this.envCache).forEach((t) => t.dispose());
    this.pmrem.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
