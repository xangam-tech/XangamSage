// Draws a repeating weave as two canvases: colour (with see-through gaps)
// and a normal map for the thread relief. Everything is generated, no image files.

// Returns true where the vertical (warp) thread passes over the horizontal (weft) thread.
const PATTERNS = {
  plain: (i, j) => (i + j) % 2 === 0,
  twill: (i, j) => (((i - j) % 4) + 4) % 4 < 2,
  satin: (i, j) => (((i * 2 + j) % 5) + 5) % 5 !== 0,
};

function rng(seedText) {
  let s = 2166136261;
  for (let i = 0; i < seedText.length; i++) s = Math.imul(s ^ seedText.charCodeAt(i), 16777619);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const smooth = (t) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;

export function makeWeave(fabric, size = 1024) {
  const look = fabric.look;
  const over = PATTERNS[fabric.weave] || PATTERNS.plain;
  const N = look.threadsPerTile;
  const rand = rng(fabric.id);
  const irr = look.irregularity;
  const [cr, cg, cb] = hexToRgb(look.colour);

  // Each thread gets its own thickness, tint and slow wobble.
  const makeThreads = (width) =>
    Array.from({ length: N }, () => ({
      r: (width / 2) * (1 + irr * 0.5 * (rand() - 0.5)),
      tint: 1 + irr * 0.14 * (rand() - 0.5),
      slubFreq: 1 + Math.floor(rand() * 3),
      slubPhase: rand() * TAU,
      wobFreq: 1 + Math.floor(rand() * 2),
      wobPhase: rand() * TAU,
    }));
  const warp = makeThreads(look.warpWidth);
  const weft = makeThreads(look.weftWidth);

  const height = new Float32Array(size * size);
  const colour = document.createElement('canvas');
  colour.width = colour.height = size;
  const cctx = colour.getContext('2d');
  const cimg = cctx.createImageData(size, size);
  const cd = cimg.data;
  const alphaBase = look.threadOpacity * 255;

  // Height and shade of one thread at a point.
  // across: distance from the thread centre line. along: position down its length.
  // cross: position along the threads it is crossing. isWarp picks the over/under rule.
  const sample = (th, idx, across, along, cross, isWarp, out) => {
    const a = across + irr * 0.07 * Math.sin((along / N) * TAU * th.wobFreq + th.wobPhase);
    const r = th.r * (1 + irr * 0.3 * Math.sin((along / N) * TAU * th.slubFreq + th.slubPhase));
    const q = a / r;
    if (q <= -1 || q >= 1) { out.h = 0; out.p = 0; return; }
    const p = Math.pow(1 - q * q, 0.55);
    const t = cross - 0.5;
    const k0 = Math.floor(t);
    const f = smooth(t - k0);
    const i0 = ((k0 % N) + N) % N, i1 = (i0 + 1) % N;
    const s0 = isWarp ? over(idx, i0) : !over(i0, idx);
    const s1 = isWarp ? over(idx, i1) : !over(i1, idx);
    const lift = (s0 ? 1 : 0) * (1 - f) + (s1 ? 1 : 0) * f;
    out.p = p;
    out.h = p * (0.15 + 0.85 * lift);
    // Slanted marks, like the twist in spun yarn.
    out.twist = 1 + 0.07 * Math.sin((along * 2.5 + q * 0.9 * (isWarp ? 1 : -1)) * TAU);
  };

  const A = { h: 0, p: 0, twist: 1 }, B = { h: 0, p: 0, twist: 1 };
  for (let y = 0; y < size; y++) {
    const v = ((y + 0.5) / size) * N;
    const j = Math.floor(v);
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * N;
      const i = Math.floor(u);
      sample(warp[i], i, u - i - 0.5, v, v, true, A);
      sample(weft[j], j, v - j - 0.5, u, u, false, B);
      const o = (y * size + x) * 4;
      const top = A.h >= B.h ? A : B;
      if (top.p === 0) {
        // A gap between threads: fully see-through.
        cd[o] = cr * 0.7; cd[o + 1] = cg * 0.7; cd[o + 2] = cb * 0.7; cd[o + 3] = 0;
        continue;
      }
      height[y * size + x] = top.h;
      const tint = top === A ? warp[i].tint : weft[j].tint;
      const shade = (0.42 + 0.58 * Math.pow(top.h, 0.7)) * top.twist * tint * (1 + (rand() - 0.5) * 0.06);
      cd[o] = Math.min(255, cr * shade);
      cd[o + 1] = Math.min(255, cg * shade);
      cd[o + 2] = Math.min(255, cb * shade);
      cd[o + 3] = alphaBase * Math.min(1, top.p * 3);
    }
  }
  cctx.putImageData(cimg, 0, 0);

  const normal = document.createElement('canvas');
  normal.width = normal.height = size;
  const nctx = normal.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const nd = nimg.data;
  const k = (size / N) * 0.22 * look.bump;
  const m = size - 1;
  for (let y = 0; y < size; y++) {
    const yu = ((y - 1) & m) * size, yd = ((y + 1) & m) * size, yy = y * size;
    for (let x = 0; x < size; x++) {
      const dx = (height[yy + ((x - 1) & m)] - height[yy + ((x + 1) & m)]) * k;
      const dy = (height[yd + x] - height[yu + x]) * k;
      const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const o = (yy + x) * 4;
      nd[o] = (dx * l * 0.5 + 0.5) * 255;
      nd[o + 1] = (dy * l * 0.5 + 0.5) * 255;
      nd[o + 2] = (l * 0.5 + 0.5) * 255;
      nd[o + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);

  return { colour, normal, tileMetres: (N * look.threadMm) / 1000 };
}
