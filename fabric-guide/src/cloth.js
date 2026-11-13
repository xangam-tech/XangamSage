// Cloth simulation: a grid of particles joined by distance constraints,
// solved with XPBD in small substeps. No rendering code in here.

const GRAVITY = -9.81;
const SUBSTEPS = 8;
const PIN_COUNT = 5;

export class Cloth {
  constructor({ cols, rows, width, height }) {
    this.cols = cols;
    this.rows = rows;
    this.width = width;
    this.height = height;
    const n = cols * rows;
    this.count = n;
    this.pos = new Float32Array(n * 3);
    this.prev = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.normals = new Float32Array(n * 3);
    this.invMass = new Float32Array(n);
    this.pins = [];
    this.grabbed = null;
    this.gather = 0.82;
    this.time = 0;
    this.windCol = new Float32Array(cols);
    this.windRow = new Float32Array(rows);

    // Constraints, grouped by kind: 0 structural, 1 shear, 2 bend.
    const a = [], b = [], rest = [], kind = [];
    const dx = width / (cols - 1), dy = height / (rows - 1);
    const add = (i, j, len, k) => { a.push(i); b.push(j); rest.push(len); kind.push(k); };
    const diag = Math.hypot(dx, dy);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (c + 1 < cols) add(i, i + 1, dx, 0);
        if (r + 1 < rows) add(i, i + cols, dy, 0);
        if (c + 1 < cols && r + 1 < rows) {
          add(i, i + cols + 1, diag, 1);
          add(i + 1, i + cols, diag, 1);
        }
        if (c + 2 < cols) add(i, i + 2, dx * 2, 2);
        if (r + 2 < rows) add(i, i + cols * 2, dy * 2, 2);
      }
    }
    this.ca = new Uint16Array(a);
    this.cb = new Uint16Array(b);
    this.rest = new Float32Array(rest);
    this.kind = new Uint8Array(kind);
    this.compliance = new Float32Array(3);

    for (let k = 0; k < PIN_COUNT; k++) {
      this.pins.push(Math.round((k / (PIN_COUNT - 1)) * (cols - 1)));
    }
    this.setPhysics({ gsm: 100, stiffness: 0.3, stretch: 0.05, damping: 0.3, gather: 0.85 });
    this.reset();
  }

  // Turn the friendly fabric numbers into solver values.
  setPhysics(p) {
    this.physics = p;
    const mass = p.gsm / 100; // heavier cloth pulls harder against its own stiffness
    const lerp = (x, y, t) => x + (y - x) * t;
    this.compliance[0] = p.stretch * p.stretch * 30 * mass;
    this.compliance[1] = Math.pow(10, lerp(0.6, -2.2, p.stiffness)) * mass;
    this.compliance[2] = Math.pow(10, lerp(1.6, -2.6, p.stiffness)) * mass;
    this.airK = 0.6 / (p.gsm / 1000); // light cloth is pushed more by moving air
    this.damping = lerp(0.2, 3.5, p.damping);
    this.gather = p.gather ?? 0.85;
  }

  // Hang the cloth from the clips, slightly gathered so folds form.
  reset() {
    const { cols, rows, width, height, pos } = this;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 3;
        const u = c / (cols - 1);
        pos[i] = (u - 0.5) * width * this.gather;
        pos[i + 1] = -(r / (rows - 1)) * height;
        pos[i + 2] = Math.sin(u * Math.PI * (PIN_COUNT - 1) + 0.7) * 0.02 + Math.sin(r * 0.9 + c * 1.7) * 0.002;
      }
    }
    this.prev.set(pos);
    this.vel.fill(0);
    this.invMass.fill(1);
    // Each clip grips a small width of cloth, not a single point.
    for (const pc of this.pins) {
      for (let c = Math.max(0, pc - 1); c <= Math.min(cols - 1, pc + 1); c++) {
        this.invMass[c] = 0;
        pos[c * 3 + 2] = 0;
      }
    }
    this.grabbed = null;
    this.updateNormals();
  }

  pinPositions() {
    return this.pins.map((c) => [this.pos[c * 3], this.pos[c * 3 + 1], this.pos[c * 3 + 2]]);
  }

  grab(index) {
    const { cols, rows, pos } = this;
    const r0 = Math.floor(index / cols), c0 = index % cols;
    const items = [];
    for (let r = Math.max(0, r0 - 1); r <= Math.min(rows - 1, r0 + 1); r++) {
      for (let c = Math.max(0, c0 - 1); c <= Math.min(cols - 1, c0 + 1); c++) {
        const i = r * cols + c;
        if (this.invMass[i] === 0) continue;
        items.push(i, pos[i * 3] - pos[index * 3], pos[i * 3 + 1] - pos[index * 3 + 1], pos[i * 3 + 2] - pos[index * 3 + 2]);
      }
    }
    // How far this point can be from each clip before the threads would have to stretch.
    const dx = this.width / (cols - 1), dy = this.height / (rows - 1);
    const give = 1.01 + this.physics.stretch * 0.5;
    const reach = this.pins.map((pc) => Math.hypot((c0 - pc) * dx, r0 * dy) * give);
    this.grabbed = { items, reach, x: pos[index * 3], y: pos[index * 3 + 1], z: pos[index * 3 + 2] };
  }

  // Move the held point. The hand cannot pull it further than the cloth is long.
  moveGrab(x, y, z) {
    const g = this.grabbed;
    if (!g) return;
    const { pos, pins } = this;
    for (let pass = 0; pass < 4; pass++) {
      for (let k = 0; k < pins.length; k++) {
        const i = pins[k] * 3;
        const ox = x - pos[i], oy = y - pos[i + 1], oz = z - pos[i + 2];
        const d = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (d > g.reach[k]) {
          const f = g.reach[k] / d;
          x = pos[i] + ox * f; y = pos[i + 1] + oy * f; z = pos[i + 2] + oz * f;
        }
      }
    }
    g.x = x; g.y = y; g.z = z;
  }

  release() {
    this.grabbed = null;
  }

  // Advance by dt seconds. air is 0..1 and scales the gentle room draught.
  step(dt, air) {
    const { pos, prev, vel, normals, invMass, count, cols } = this;
    const h = dt / SUBSTEPS;
    const damp = Math.max(0, 1 - this.damping * h);
    const airK = this.airK * h;
    this.time += dt;
    const t = this.time;
    const ca = this.ca, cb = this.cb, rest = this.rest, kind = this.kind;
    const nc = ca.length;
    const comp = this.compliance;
    const grabbed = this.grabbed;

    // Slow, uneven room air so the cloth never looks frozen.
    const windCol = this.windCol, windRow = this.windRow;
    for (let c = 0; c < cols; c++) windCol[c] = air * 0.1 * Math.sin(t * 0.9 + c * 0.21);
    for (let r = 0; r < this.rows; r++) windRow[r] = air * 0.07 * Math.sin(t * 0.37 + r * 0.33);
    const wx = air * 0.05 * Math.sin(t * 0.53 + 1.7);

    for (let s = 0; s < SUBSTEPS; s++) {
      for (let p = 0; p < count; p++) {
        if (invMass[p] === 0) continue;
        const i = p * 3;
        let vx = vel[i], vy = vel[i + 1], vz = vel[i + 2];
        const wz = windCol[p % cols] + windRow[(p / cols) | 0];
        const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
        const rn = (wx - vx) * nx + (0 - vy) * ny + (wz - vz) * nz;
        const push = Math.min(airK * Math.abs(rn), 1) * rn;
        vx = (vx + push * nx) * damp;
        vy = (vy + push * ny + GRAVITY * h) * damp;
        vz = (vz + push * nz) * damp;
        prev[i] = pos[i]; prev[i + 1] = pos[i + 1]; prev[i + 2] = pos[i + 2];
        pos[i] += vx * h; pos[i + 1] += vy * h; pos[i + 2] += vz * h;
      }

      if (grabbed) {
        const g = grabbed.items;
        for (let k = 0; k < g.length; k += 4) {
          const i = g[k] * 3;
          pos[i] += (grabbed.x + g[k + 1] - pos[i]) * 0.25;
          pos[i + 1] += (grabbed.y + g[k + 2] - pos[i + 1]) * 0.25;
          pos[i + 2] += (grabbed.z + g[k + 3] - pos[i + 2]) * 0.25;
        }
      }

      for (let k = 0; k < nc; k++) {
        const pa = ca[k], pb = cb[k];
        const wa = invMass[pa], wb = invMass[pb];
        const w = wa + wb;
        if (w === 0) continue;
        const i = pa * 3, j = pb * 3;
        const dx = pos[j] - pos[i], dy = pos[j + 1] - pos[i + 1], dz = pos[j + 2] - pos[i + 2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-9) continue;
        const kd = kind[k];
        // Bend links only resist folding, never pulling apart.
        if (kd === 2 && len > rest[k]) continue;
        const corr = (len - rest[k]) / (w + comp[kd]) / len;
        pos[i] += dx * corr * wa; pos[i + 1] += dy * corr * wa; pos[i + 2] += dz * corr * wa;
        pos[j] -= dx * corr * wb; pos[j + 1] -= dy * corr * wb; pos[j + 2] -= dz * corr * wb;
      }

      // Second sweep, bottom to top, over the thread links only. Woven threads barely
      // stretch, and this keeps the cloth from behaving like rubber when it is pulled.
      for (let k = nc - 1; k >= 0; k--) {
        if (kind[k] !== 0) continue;
        const pa = ca[k], pb = cb[k];
        const wa = invMass[pa], wb = invMass[pb];
        const w = wa + wb;
        if (w === 0) continue;
        const i = pa * 3, j = pb * 3;
        const dx = pos[j] - pos[i], dy = pos[j + 1] - pos[i + 1], dz = pos[j + 2] - pos[i + 2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-9) continue;
        const corr = (len - rest[k]) / (w + comp[0]) / len;
        pos[i] += dx * corr * wa; pos[i + 1] += dy * corr * wa; pos[i + 2] += dz * corr * wa;
        pos[j] -= dx * corr * wb; pos[j + 1] -= dy * corr * wb; pos[j + 2] -= dz * corr * wb;
      }

      const inv = 1 / h;
      for (let p = 0; p < count; p++) {
        if (invMass[p] === 0) continue;
        const i = p * 3;
        vel[i] = (pos[i] - prev[i]) * inv;
        vel[i + 1] = (pos[i + 1] - prev[i + 1]) * inv;
        vel[i + 2] = (pos[i + 2] - prev[i + 2]) * inv;
      }
    }
  }

  updateNormals() {
    const { cols, rows, pos, normals } = this;
    for (let r = 0; r < rows; r++) {
      const ru = r > 0 ? r - 1 : r, rd = r < rows - 1 ? r + 1 : r;
      for (let c = 0; c < cols; c++) {
        const cl = c > 0 ? c - 1 : c, cr = c < cols - 1 ? c + 1 : c;
        const L = (r * cols + cl) * 3, R = (r * cols + cr) * 3;
        const U = (ru * cols + c) * 3, D = (rd * cols + c) * 3;
        const ax = pos[R] - pos[L], ay = pos[R + 1] - pos[L + 1], az = pos[R + 2] - pos[L + 2];
        const bx = pos[U] - pos[D], by = pos[U + 1] - pos[D + 1], bz = pos[U + 2] - pos[D + 2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const i = (r * cols + c) * 3;
        normals[i] = nx / l; normals[i + 1] = ny / l; normals[i + 2] = nz / l;
      }
    }
  }
}
