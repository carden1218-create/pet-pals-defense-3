(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const OL = "#2d202d";

  function hash(a, b) {
    let n = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2f);
    n ^= n >>> 15;
    n = Math.imul(n, 0x2c1b3c6d);
    n ^= n >>> 12;
    return (n >>> 0) / 4294967296;
  }
  function jit(i, s) { return hash(i * 7 + 3, s * 13 + 1) - 0.5; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function sampleSmoothLoop(ctrlPts, stepsPerSeg = 6) {
    const n = ctrlPts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = ctrlPts[(i - 1 + n) % n];
      const p1 = ctrlPts[i];
      const p2 = ctrlPts[(i + 1) % n];
      const p3 = ctrlPts[(i + 2) % n];
      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (
          (2 * p1[0]) +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
        );
        const y = 0.5 * (
          (2 * p1[1]) +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
        );
        out.push([x, y]);
      }
    }
    return out;
  }

  function makeEllipsePts(cx, cy, rx, ry, n = 28, seed = 1, wobble = 0.025) {
    const ctrl = [];
    const k = 10;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * TAU;
      const r = 1 + jit(i, seed) * wobble * 2;
      ctrl.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return sampleSmoothLoop(ctrl, Math.max(3, Math.round(n / k)));
  }

  function tracePoly(c, pts, closed = true) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) c.moveTo(pts[i][0], pts[i][1]);
      else c.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) c.closePath();
  }

  // Seamless 192x192 Wax Crayon Paper-Tooth Mask (grainy speckles, ZERO parallel stripes!)
  let toothPatCanvas = null;
  let darkGrainCanvas = null;
  let outlineGrainCanvas = null;
  function ensureToothTextures() {
    if (toothPatCanvas) return;
    const SZ = 192;

    toothPatCanvas = document.createElement("canvas");
    toothPatCanvas.width = SZ; toothPatCanvas.height = SZ;
    const tc = toothPatCanvas.getContext("2d");
    const img = tc.createImageData(SZ, SZ);
    const d = img.data;

    darkGrainCanvas = document.createElement("canvas");
    darkGrainCanvas.width = SZ; darkGrainCanvas.height = SZ;
    const dc = darkGrainCanvas.getContext("2d");
    const imgD = dc.createImageData(SZ, SZ);
    const dd = imgD.data;

    outlineGrainCanvas = document.createElement("canvas");
    outlineGrainCanvas.width = SZ; outlineGrainCanvas.height = SZ;
    const oc = outlineGrainCanvas.getContext("2d");
    const imgO = oc.createImageData(SZ, SZ);
    const od = imgO.data;

    function vnoise(x, y, period, seed) {
      const gx = Math.floor(x / period), gy = Math.floor(y / period);
      const fx = (x / period) - gx, fy = (y / period) - gy;
      const wrap = Math.max(1, Math.round(SZ / period));
      const x0 = ((gx % wrap) + wrap) % wrap, x1 = (x0 + 1) % wrap;
      const y0 = ((gy % wrap) + wrap) % wrap, y1 = (y0 + 1) % wrap;
      const a = hash(x0 + y0 * 57, seed);
      const b = hash(x1 + y0 * 57, seed);
      const c = hash(x0 + y1 * 57, seed);
      const e = hash(x1 + y1 * 57, seed);
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(a, b, ux), lerp(c, e, ux), uy);
    }

    for (let y = 0; y < SZ; y++) {
      for (let x = 0; x < SZ; x++) {
        const idx = (y * SZ + x) * 4;
        const n1 = vnoise(x, y, 22, 11);
        const n2 = vnoise(x, y, 7, 37);
        const n3 = vnoise(x, y, 3, 61);
        const n4 = hash(x * 13 + y * 97, 73);
        const tooth = n1 * 0.28 + n2 * 0.34 + n3 * 0.22 + n4 * 0.16;

        if (tooth > 0.51) {
          const a = Math.min(255, Math.round((tooth - 0.51) * 760));
          d[idx] = 255; d[idx + 1] = 252; d[idx + 2] = 238; d[idx + 3] = a;
        }
        if (tooth < 0.45) {
          const a = Math.min(230, Math.round((0.45 - tooth) * 440));
          dd[idx] = 36; dd[idx + 1] = 22; dd[idx + 2] = 10; dd[idx + 3] = a;
        }
        if (tooth > 0.62) {
          const a = Math.min(235, Math.round((tooth - 0.62) * 760));
          od[idx] = 0; od[idx + 1] = 0; od[idx + 2] = 0; od[idx + 3] = a;
        }
      }
    }
    tc.putImageData(img, 0, 0);
    dc.putImageData(imgD, 0, 0);
    oc.putImageData(imgO, 0, 0);
  }

  function strokeWaxCrayon(c, pts, col = OL, lw = 4.2, seed = 1, closed = true) {
    if (lw <= 0) return;
    ensureToothTextures();

    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    const pad = Math.ceil(lw * 2 + 6);
    const ox = Math.floor(minX - pad), oy = Math.floor(minY - pad);
    const sw = Math.max(8, Math.ceil(maxX - minX + pad * 2));
    const sh = Math.max(8, Math.ceil(maxY - minY + pad * 2));

    const sc = document.createElement("canvas");
    sc.width = sw; sc.height = sh;
    const g = sc.getContext("2d");
    g.translate(-ox, -oy);
    g.lineJoin = "round";
    g.lineCap = "round";

    tracePoly(g, pts, closed);
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.globalAlpha = 0.92;
    g.stroke();

    tracePoly(g, pts.map(([x, y], i) => [x + jit(i, seed + 17) * 1.4, y + jit(i + 5, seed + 31) * 1.4]), closed);
    g.lineWidth = lw * 0.72;
    g.globalAlpha = 0.45;
    g.stroke();

    g.save();
    g.globalCompositeOperation = "destination-out";
    g.globalAlpha = 0.78;
    const pat = g.createPattern(outlineGrainCanvas, "repeat");
    g.translate((seed * 23) % 192, (seed * 41) % 192);
    g.fillStyle = pat;
    g.fillRect(ox - 200, oy - 200, sw + 400, sh + 400);
    g.restore();

    c.drawImage(sc, ox, oy);
  }

  function fillWaxCrayon(c, pts, col, seed, opts = {}) {
    ensureToothTextures();
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of pts) {
      if (p[0] < minX) minX = p[0]; if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0]; if (p[1] > maxY) maxY = p[1];
    }
    const w = Math.max(4, maxX - minX), h = Math.max(4, maxY - minY);

    c.save();
    tracePoly(c, pts);
    c.clip();

    if (opts.withBase !== false) {
      c.fillStyle = opts.toothCol || "#fbf4e0";
      c.fillRect(minX - 4, minY - 4, w + 8, h + 8);
    }

    c.globalAlpha = opts.coverage ?? 0.92;
    c.fillStyle = col;
    c.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    if (opts.shade !== false) {
      const cx = minX + w * (0.38 + hash(seed, 3) * 0.24);
      const cy = minY + h * (0.30 + hash(seed, 7) * 0.22);
      const rg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.08, cx, cy, Math.max(w, h) * 0.85);
      rg.addColorStop(0, "rgba(255, 252, 236, 0.14)");
      rg.addColorStop(0.62, "rgba(255, 250, 232, 0)");
      rg.addColorStop(1, "rgba(42, 22, 12, 0.15)");
      c.globalAlpha = 1;
      c.fillStyle = rg;
      c.fillRect(minX - 4, minY - 4, w + 8, h + 8);
    }

    const patLight = c.createPattern(toothPatCanvas, "repeat");
    const patDark = c.createPattern(darkGrainCanvas, "repeat");
    c.save();
    c.translate((seed * 29) % 192, (seed * 47) % 192);
    c.globalAlpha = opts.toothAlpha ?? 0.56;
    c.fillStyle = patLight;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.globalAlpha = opts.clumpAlpha ?? 0.26;
    c.fillStyle = patDark;
    c.fillRect(minX - 200, minY - 200, w + 400, h + 400);
    c.restore();

    if (opts.softEdge !== false) {
      tracePoly(c, pts);
      c.strokeStyle = col;
      c.globalAlpha = 0.35;
      c.lineWidth = opts.edgeW || 3.0;
      c.lineJoin = "round";
      c.stroke();
    }

    c.restore();

    // Optional soft uneven wax bleed slightly outside the line (real hand-colored crayon!)
    if (opts.bleed) {
      c.save();
      c.globalAlpha = opts.bleedAlpha ?? 0.28;
      tracePoly(c, pts.map(([x, y], i) => [x + jit(i, seed + 53) * 5.0, y + jit(i + 9, seed + 61) * 5.0]));
      c.strokeStyle = col;
      c.lineWidth = opts.bleedW ?? 5.5;
      c.lineJoin = "round";
      c.stroke();
      c.restore();
    }

    const lw = opts.lw ?? 0;
    if (lw > 0) {
      strokeWaxCrayon(c, pts, opts.ol || OL, lw, seed, true);
    }
  }

  // Single chunky oil-pastel dab with broken dry-brush end & soft organic silhouette
  function dabStroke(c, x, y, w, h, ang, col, alpha = 0.92, seed = 1) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.globalAlpha *= alpha;
    c.fillStyle = col;
    const hw = w * 0.5, hh = h * 0.5;
    const r = Math.min(hw, hh) * 0.72;
    c.beginPath();
    c.moveTo(-hw + r, -hh);
    c.quadraticCurveTo(0, -hh * (1 + (hash(seed, 3) - 0.5) * 0.25), hw - r, -hh);
    c.quadraticCurveTo(hw * 1.06, 0, hw - r, hh);
    c.quadraticCurveTo(0, hh * (1 + (hash(seed, 7) - 0.5) * 0.25), -hw + r, hh);
    c.quadraticCurveTo(-hw * 1.06, 0, -hw + r, -hh);
    c.closePath();
    c.fill();
    c.restore();
  }

  // Thick oil-pastel colour blob: ragged broken edges, NO black outline, value mottling + visible paper grain!
  function fillOilPastel(c, pts, col, seed = 1, opts = {}) {
    if (!pts || pts.length < 3) return;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const [x, y] of pts) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const bw = Math.max(8, maxX - minX), bh = Math.max(8, maxY - minY);
    const cols = opts.cols && opts.cols.length ? opts.cols : [col];
    const toothCol = opts.toothCol ?? "#f7eed8";
    const alpha = opts.alpha ?? 0.94;
    const dabSize = opts.dabSize ?? Math.max(8, Math.min(24, Math.min(bw, bh) * 0.22));

    // 1. Calm velvety underpaint with softly ragged edges (NO black outline, NO confetti noise!)
    const mainCol = cols.length > 1 ? cols[Math.min(1, cols.length - 1)] : col;
    if (opts.withBase !== false) {
      for (let pass = 0; pass < 2; pass++) {
        c.save();
        c.globalAlpha = pass === 0 ? alpha * 0.65 : Math.min(1, alpha + 0.06);
        const jAmt = pass === 0 ? 4.2 : 1.9;
        const jPts = pts.map(([x, y], i) => [
          x + jit(i + pass * 11, seed + 17) * jAmt,
          y + jit(i + pass * 19, seed + 31) * jAmt
        ]);
        tracePoly(c, jPts);
        c.fillStyle = pass === 0 ? col : mainCol;
        c.fill();
        c.restore();
      }
    }

    // 2. Clipped gentle broad pastel strokes + coarse paper grain (calm flat areas, NOT noisy speckles!)
    c.save();
    tracePoly(c, pts);
    c.clip();

    const calm = opts.calm !== false;
    const strokeSize = calm ? Math.max(24, dabSize * 1.9) : dabSize;
    const step = calm ? Math.max(18, strokeSize * 0.95 / (opts.density ?? 0.8)) : Math.max(5, dabSize * 0.65 / (opts.density ?? 1));
    const nCols = Math.min(calm ? 22 : 44, Math.ceil(bw / step));
    const nRows = Math.min(calm ? 22 : 44, Math.ceil(bh / step));
    const dabAlpha = opts.dabAlpha ?? (calm ? 0.20 : 0.72);
    for (let ry = 0; ry < nRows; ry++) {
      for (let rx = 0; rx < nCols; rx++) {
        const idx = ry * nCols + rx;
        if (hash(idx, seed + 9) < (calm ? 0.35 : 0.22)) continue;
        const px = minX + (rx + 0.15 + hash(idx * 3, seed + 5) * 0.7) * (bw / nCols);
        const py = minY + (ry + 0.15 + hash(idx * 7, seed + 13) * 0.7) * (bh / nRows);
        const cPick = cols[Math.floor(hash(idx, seed + 23) * cols.length)];
        const ang = (opts.angle ?? -0.45) + (hash(idx, seed + 29) - 0.5) * 0.45;
        const dw = strokeSize * (0.90 + hash(idx, seed + 37) * 0.85);
        const dh = strokeSize * (0.42 + hash(idx, seed + 41) * 0.36);
        dabStroke(c, px, py, dw, dh, ang, cPick, alpha * dabAlpha * (0.65 + hash(idx, seed + 43) * 0.35), seed + idx);
      }
    }

    // Visible coarse paper tooth texture + dry-pastel grain flecks
    ensureToothTextures();
    const toothAlpha = opts.toothAlpha ?? 0.42;
    if (toothAlpha > 0) {
      c.save();
      c.translate((seed * 29) % 192, (seed * 47) % 192);
      c.globalAlpha = toothAlpha * 0.72;
      c.fillStyle = c.createPattern(toothPatCanvas, "repeat");
      c.fillRect(minX - 200, minY - 200, bw + 400, bh + 400);
      c.globalAlpha = toothAlpha * 0.34;
      c.fillStyle = c.createPattern(darkGrainCanvas, "repeat");
      c.fillRect(minX - 200, minY - 200, bw + 400, bh + 400);
      c.restore();

      const specks = Math.min(180, Math.max(18, Math.round((bw * bh) / 140)));
      c.save();
      c.fillStyle = toothCol;
      for (let i = 0; i < specks; i++) {
        const sx = minX + hash(i * 5, seed + 61) * bw;
        const sy = minY + hash(i * 11, seed + 73) * bh;
        c.globalAlpha = toothAlpha * (0.28 + hash(i, seed + 83) * 0.55);
        c.fillRect(sx, sy, 1.3 + hash(i, seed + 89) * 1.9, 1.1 + hash(i, seed + 97) * 1.6);
      }
      c.restore();
    }
    c.restore();

    // 3. Soft ragged broken-edge pastel dabs along perimeter (shapes defined by value, NO dark outline!)
    if (opts.edgeBleed !== false) {
      const perimStep = Math.max(1, Math.floor(pts.length / Math.min(48, Math.max(14, Math.round((bw + bh) / Math.max(8, dabSize * 0.75))))));
      for (let i = 0; i < pts.length; i += perimStep) {
        const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (hash(i, seed + 101) - 0.5) * 0.65;
        const cPick = hash(i, seed + 107) > 0.35 ? mainCol : col;
        const ox = (hash(i, seed + 113) - 0.5) * dabSize * 0.35;
        const oy = (hash(i, seed + 127) - 0.5) * dabSize * 0.35;
        dabStroke(
          c, p0[0] + ox, p0[1] + oy,
          dabSize * (0.72 + hash(i, seed + 131) * 0.65),
          dabSize * (0.32 + hash(i, seed + 137) * 0.28),
          ang, cPick, alpha * (0.62 + hash(i, seed + 139) * 0.30), seed + i * 3
        );
      }
    }
  }

  // Cluster of small dabbed oil-pastel strokes (ideal for mauve trees, teal bushes, flower clumps!)
  function dabPastelCluster(c, cx, cy, rx, ry, palette, seed = 1, opts = {}) {
    const count = opts.count ?? 44;
    const dabR = opts.dabSize ?? Math.max(7, Math.min(rx, ry) * 0.30);
    const toothCol = opts.toothCol ?? "#f7eed8";
    // palette = { shadow, mid, light, accent }
    const sh = palette.shadow || palette[0];
    const mid = palette.mid || palette[1] || sh;
    const hi = palette.light || palette[2] || mid;
    const acc = palette.accent || hi;

    for (let i = 0; i < count; i++) {
      // Sample organically inside ellipse; lower-right biases toward shadow, upper-left toward sunlit highlight
      const a = hash(i * 7, seed + 11) * TAU;
      const rr = Math.pow(hash(i * 13, seed + 19), 0.55);
      const nx = Math.cos(a) * rr;
      const ny = Math.sin(a) * rr;
      const px = cx + nx * rx;
      const py = cy + ny * ry;
      const sunBias = (-nx * 0.55 - ny * 0.65); // + = top-left sunlit, - = bottom-right shaded
      let col = mid;
      if (sunBias < -0.22) col = sh;
      else if (sunBias > 0.28) col = hi;
      else if (hash(i, seed + 29) > 0.86) col = acc;
      else if (hash(i, seed + 31) < 0.24) col = sh;

      const ang = -0.5 + (hash(i, seed + 37) - 0.5) * 1.4;
      const w = dabR * (0.78 + hash(i, seed + 41) * 0.72);
      const h = dabR * (0.52 + hash(i, seed + 43) * 0.42);
      dabStroke(c, px, py, w, h, ang, col, 0.86 + hash(i, seed + 47) * 0.12, seed + i * 5);

      // Subtle paper grain flecks on top of dabs
      if (i % 3 === 0) {
        c.save();
        c.fillStyle = toothCol;
        c.globalAlpha = 0.20 + hash(i, seed + 53) * 0.22;
        c.fillRect(px + (hash(i, seed + 59) - 0.5) * w * 0.5, py + (hash(i, seed + 61) - 0.5) * h * 0.5, 1.8, 1.4);
        c.restore();
      }
    }
  }

  // Dilate an opaque mask uniformly by `padPx` to produce a clean die-cut cardboard silhouette!
  function dilateMask(srcMask, padPx) {
    const w = srcMask.width, h = srcMask.height;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const oc = out.getContext("2d");
    oc.drawImage(srcMask, 0, 0);
    if (padPx <= 0) return out;
    const rings = [padPx * 0.55, padPx];
    for (const r of rings) {
      const n = r === padPx ? 16 : 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        oc.drawImage(srcMask, Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    // Convert to pure solid black silhouette
    oc.globalCompositeOperation = "source-in";
    oc.fillStyle = "#000";
    oc.fillRect(0, 0, w, h);
    return out;
  }

  // Build a unified 3D corrugated brown cardboard standee from ANY silhouette mask + front art drawer!
  function makeCardboardStandeeFromMask(w, h, innerMask, opts = {}, drawFrontArtFn = null) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const c = cv.getContext("2d");

    const thickX = opts.thickX ?? 11;
    const thickY = opts.thickY ?? 8;
    const lip = opts.lip ?? 3.5;

    const boardMask = dilateMask(innerMask, lip);

    // 1. Extruded thick brown corrugated cardboard side wall with outer kraft liners + wavy flute core!
    const steps = Math.max(10, Math.round(Math.hypot(thickX, thickY)));
    const stepMasks = ["#331908", "#5e3616", "#8c592c", "#b8824d"].map((col) => {
      const m = document.createElement("canvas");
      m.width = w; m.height = h;
      const mc = m.getContext("2d");
      mc.drawImage(boardMask, 0, 0);
      mc.globalCompositeOperation = "source-in";
      mc.fillStyle = col;
      mc.fillRect(0, 0, w, h);
      return m;
    });

    for (let sIdx = steps; sIdx >= 1; sIdx--) {
      const t = sIdx / steps;
      // Outer back liner (last 2 steps), inner hollow channel (middle steps), front liner (first 2 steps)
      const idx = (sIdx >= steps - 1) ? 0 : (sIdx <= 2 ? 3 : (t > 0.5 ? 1 : 2));
      c.drawImage(stepMasks[idx], thickX * t, thickY * t);
    }

    // 2. Real corrugated flute wave & kraft fiber mottling inside the extruded cardboard edge
    const wallMask = document.createElement("canvas");
    wallMask.width = w; wallMask.height = h;
    const wc = wallMask.getContext("2d");
    for (let sIdx = steps; sIdx >= 1; sIdx--) {
      const t = sIdx / steps;
      wc.drawImage(boardMask, thickX * t, thickY * t);
    }
    wc.globalCompositeOperation = "destination-out";
    wc.drawImage(boardMask, 0, 0);

    const wallArt = document.createElement("canvas");
    wallArt.width = w; wallArt.height = h;
    const ac = wallArt.getContext("2d");
    // Dark hollow core + mottled kraft variation
    ac.fillStyle = "#3a1d0b";
    ac.fillRect(0, 0, w, h);
    for (let mi = 0; mi < 160; mi++) {
      const mx = hash(mi * 7, 13) * w, my = hash(mi * 11, 29) * h;
      ac.fillStyle = mi % 2 ? "rgba(182, 126, 72, 0.25)" : "rgba(38, 18, 6, 0.28)";
      ac.beginPath(); ac.ellipse(mx, my, 8, 5, 0, 0, TAU); ac.fill();
    }

    // Scan outer perimeter and draw continuous angled corrugated flute waves between top/bottom liners!
    const bmData = boardMask.getContext("2d").getImageData(0, 0, w, h).data;
    const cellSz = 4.5;
    const cols = Math.ceil(w / cellSz);
    const seen = new Uint8Array(cols * Math.ceil(h / cellSz));
    const wallAng = Math.atan2(thickY, thickX);

    ac.lineCap = "round";
    ac.lineJoin = "round";
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (bmData[(y * w + x) * 4 + 3] < 140) continue;
        const up = bmData[((y - 1) * w + x) * 4 + 3] < 140;
        const dn = bmData[((y + 1) * w + x) * 4 + 3] < 140;
        const lf = bmData[(y * w + (x - 1)) * 4 + 3] < 140;
        const rt = bmData[(y * w + (x + 1)) * 4 + 3] < 140;
        if (!up && !dn && !lf && !rt) continue;

        const bIdx = Math.floor(y / cellSz) * cols + Math.floor(x / cellSz);
        if (seen[bIdx]) continue;
        seen[bIdx] = 1;

        // Draw diagonal corrugated wave rib spanning from front liner (x,y) to back liner (x+thickX, y+thickY)
        const x0 = x + thickX * 0.12, y0 = y + thickY * 0.12;
        const x1 = x + thickX * 0.88, y1 = y + thickY * 0.88;
        const xm = (x0 + x1) * 0.5 - Math.sin(wallAng) * 2.2;
        const ym = (y0 + y1) * 0.5 + Math.cos(wallAng) * 2.2;
        ac.strokeStyle = "#220e04";
        ac.lineWidth = 3.2;
        ac.beginPath(); ac.moveTo(x0, y0); ac.lineTo(xm, ym); ac.lineTo(x1, y1); ac.stroke();
        ac.strokeStyle = "#dba469";
        ac.lineWidth = 1.6;
        ac.beginPath(); ac.moveTo(x0 + 1.2, y0 - 0.8); ac.lineTo(xm + 1.2, ym - 0.8); ac.lineTo(x1 + 1.2, y1 - 0.8); ac.stroke();
      }
    }

    // Outer back kraft liner sheet + dark cut edge
    ac.globalCompositeOperation = "destination-in";
    ac.drawImage(wallMask, 0, 0);
    c.drawImage(wallArt, 0, 0);

    // Highlighted kraft liner strip along back rim
    const backLiner = dilateMask(boardMask, 1.5);
    const blc = backLiner.getContext("2d");
    blc.globalCompositeOperation = "source-in";
    blc.fillStyle = "#aa7642";
    blc.fillRect(0, 0, w, h);
    blc.globalCompositeOperation = "destination-out";
    blc.drawImage(boardMask, -1.8, -1.5);
    c.drawImage(backLiner, thickX * 0.88, thickY * 0.88);

    const backRim = dilateMask(boardMask, 1.4);
    const brc = backRim.getContext("2d");
    brc.globalCompositeOperation = "source-in";
    brc.fillStyle = "#331a08";
    brc.fillRect(0, 0, w, h);
    brc.globalCompositeOperation = "destination-out";
    brc.drawImage(boardMask, 0, 0);
    c.drawImage(backRim, thickX, thickY);

    // 3. Front kraft-brown cardboard face with realistic light/dark kraft mottling + frayed wood fibers!
    const frontBoard = document.createElement("canvas");
    frontBoard.width = w; frontBoard.height = h;
    const fc = frontBoard.getContext("2d");
    fc.fillStyle = "#c9925a";
    fc.fillRect(0, 0, w, h);
    for (let i = 0; i < 48; i++) {
      const mx = hash(i * 7, 11) * w, my = hash(i * 13, 23) * h;
      fc.fillStyle = i % 2 ? "rgba(156, 102, 52, 0.22)" : "rgba(224, 182, 132, 0.22)";
      fc.beginPath(); fc.ellipse(mx, my, 14, 9, hash(i, 5) * 3, 0, TAU); fc.fill();
    }
    for (let i = 0; i < 240; i++) {
      const fx = hash(i * 3, 17) * w, fy = hash(i * 5, 31) * h;
      fc.fillStyle = i % 3 === 0 ? "rgba(62, 34, 14, 0.22)" : (i % 2 ? "rgba(96, 56, 24, 0.16)" : "rgba(244, 218, 178, 0.20)");
      fc.fillRect(fx, fy, 2.8, 1.2);
    }
    fc.globalCompositeOperation = "destination-in";
    fc.drawImage(boardMask, 0, 0);

    if (!opts.pastelProp) {
      const frontRim = dilateMask(boardMask, 1.3);
      const frc = frontRim.getContext("2d");
      frc.globalCompositeOperation = "source-in";
      frc.fillStyle = opts.softRim ? "#7c522c" : "#482a12";
      frc.fillRect(0, 0, w, h);
      c.drawImage(frontRim, 0, 0);
      c.drawImage(frontBoard, 0, 0);
    }

    // 4. Glue front art cleanly on top of the cardboard face!
    if (drawFrontArtFn) drawFrontArtFn(c);

    return cv;
  }

  function makeCardboardSlab(w, h, silhouettePts, opts = {}, drawFrontArtFn = null) {
    const innerMask = document.createElement("canvas");
    innerMask.width = w; innerMask.height = h;
    const mc = innerMask.getContext("2d");
    tracePoly(mc, silhouettePts);
    mc.fillStyle = "#000";
    mc.fill();

    return makeCardboardStandeeFromMask(w, h, innerMask, opts, (c) => {
      if (drawFrontArtFn) {
        c.save();
        if (!opts.unclippedDabs) {
          tracePoly(c, silhouettePts);
          c.clip();
          c.fillStyle = opts.paperBg || "#fcf5e3";
          c.fillRect(0, 0, w, h);
        }
        drawFrontArtFn(c);
        c.restore();
        if (opts.outerOl !== false) {
          strokeWaxCrayon(c, silhouettePts, opts.ol || OL, opts.outerLw ?? 4.2, opts.seed || 7, true);
        }
      }
    });
  }

  // Turn an ORIGINAL Gen-1 sprite (.webp) into a 3D standing corrugated cardboard cutout figure!
  function makeSpriteCardboardStandee(img, opts = {}) {
    const S = 260;
    const cx = S * 0.5, by = S - 24;

    // 1. Scan opaque bounds of original sprite so it stands flush on the base tab
    const rawCv = document.createElement("canvas");
    rawCv.width = img.naturalWidth || img.width;
    rawCv.height = img.naturalHeight || img.height;
    const rc = rawCv.getContext("2d");
    rc.drawImage(img, 0, 0);
    const rawData = rc.getImageData(0, 0, rawCv.width, rawCv.height).data;

    let minX = rawCv.width, minY = rawCv.height, maxX = -1, maxY = -1;
    for (let y = 0; y < rawCv.height; y++) {
      for (let x = 0; x < rawCv.width; x++) {
        const idx = (y * rawCv.width + x) * 4;
        const a = rawData[idx + 3];
        const lum = (rawData[idx] + rawData[idx + 1] + rawData[idx + 2]) / 3;
        // Strip faint translucent white/gray anti-alias fringe outside the dark crayon outline
        if (a < 85 && lum > 105) {
          rawData[idx + 3] = 0;
          continue;
        }
        if (a >= 75) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    rc.putImageData(new ImageData(rawData, rawCv.width, rawCv.height), 0, 0);

    const bw = Math.max(1, maxX - minX + 1);
    const bh = Math.max(1, maxY - minY + 1);
    const maxW = opts.maxW ?? 172;
    const maxH = opts.maxH ?? 186;
    const scale = Math.min(maxW / bw, maxH / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = cx - dw * 0.5;
    const dy = by - dh;

    // 2. Render scaled original Gen-1 sprite onto 260x260 canvas (preserve raw copy for before/after verification)
    const rawScaledCv = document.createElement("canvas");
    rawScaledCv.width = S; rawScaledCv.height = S;
    const rsc = rawScaledCv.getContext("2d");
    rsc.drawImage(rawCv, minX, minY, bw, bh, dx, dy, dw, dh);

    // 2b. Apply baked painterly oil-pastel/crayon treatment (identical silhouette, colours & design — textured onto paper!)
    const spriteCv = document.createElement("canvas");
    spriteCv.width = S; spriteCv.height = S;
    const sc = spriteCv.getContext("2d");
    sc.drawImage(rawScaledCv, 0, 0);

    ensureToothTextures();
    const imgData = sc.getImageData(0, 0, S, S);
    const px = imgData.data;
    const seedBase = opts.seed || (Math.round(bw * 13 + bh * 31) + 77);

    // Collect interior color samples & soften harsh digital black outlines + ragged pastel edge tooth
    const copyPx = new Uint8ClampedArray(px);
    for (let y = 1; y < S - 1; y++) {
      for (let x = 1; x < S - 1; x++) {
        const idx = (y * S + x) * 4;
        const a = copyPx[idx + 3];
        if (a < 20) continue;

        const r = copyPx[idx], g = copyPx[idx + 1], b = copyPx[idx + 2];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;

        // Check if pixel is near outer edge (softly ragged pastel boundary instead of crisp digital cut)
        const nAlphaMin = Math.min(
          copyPx[((y - 1) * S + x) * 4 + 3],
          copyPx[((y + 1) * S + x) * 4 + 3],
          copyPx[(y * S + (x - 1)) * 4 + 3],
          copyPx[(y * S + (x + 1)) * 4 + 3],
          copyPx[((y - 2 > 0 ? y - 2 : 0) * S + x) * 4 + 3],
          copyPx[((y + 2 < S ? y + 2 : S - 1) * S + x) * 4 + 3]
        );
        const edgeNoise = hash(x * 3 + y * 11, seedBase + 19);
        if (nAlphaMin < 140) {
          // Ragged oil-pastel paper break right at outer perimeter
          if (edgeNoise < 0.24 && a < 235) {
            px[idx + 3] = Math.round(a * 0.35);
          } else if (edgeNoise > 0.72) {
            px[idx + 3] = Math.min(255, Math.round(a * 0.85));
          }
        }

        // ONLY soften true neutral dark ink outlines (low luminance AND low saturation — NEVER dark vivid colors like Blueberry Owl!)
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (lum < 56 && sat < 38) {
          let nr = 72, ng = 48, nb = 42, cnt = 0;
          for (let oy = -3; oy <= 3; oy += 3) {
            for (let ox = -3; ox <= 3; ox += 3) {
              const nx = x + ox, ny = y + oy;
              if (nx < 0 || nx >= S || ny < 0 || ny >= S) continue;
              const nIdx = (ny * S + nx) * 4;
              if (copyPx[nIdx + 3] > 180) {
                const nl = copyPx[nIdx] * 0.299 + copyPx[nIdx + 1] * 0.587 + copyPx[nIdx + 2] * 0.114;
                if (nl > 75) {
                  nr += copyPx[nIdx]; ng += copyPx[nIdx + 1]; nb += copyPx[nIdx + 2]; cnt++;
                }
              }
            }
          }
          if (cnt > 0) { nr /= (cnt + 1); ng /= (cnt + 1); nb /= (cnt + 1); }
          const grain = (hash(x * 7 + y * 5, seedBase + 41) - 0.5) * 16;
          px[idx]     = Math.max(36, Math.min(255, Math.round(r * 0.52 + nr * 0.30 + 18 + grain)));
          px[idx + 1] = Math.max(24, Math.min(255, Math.round(g * 0.52 + ng * 0.28 + 12 + grain)));
          px[idx + 2] = Math.max(22, Math.min(255, Math.round(b * 0.52 + nb * 0.28 + 12 + grain)));
          if (hash(x * 13 + y * 17, seedBase + 53) < 0.20) {
            px[idx + 3] = Math.round(px[idx + 3] * 0.80);
          }
        } else {
          // Very light pastel pigment mottling preserving exact original sprite hue & brightness!
          const macro = (Math.sin(x * 0.14 + y * 0.11 + seedBase) + Math.cos(x * 0.09 - y * 0.13)) * 6.5;
          const micro = (hash(x * 5 + y * 9, seedBase + 71) - 0.5) * 15;
          const delta = macro + micro;
          px[idx]     = Math.max(0, Math.min(255, Math.round(r + delta)));
          px[idx + 1] = Math.max(0, Math.min(255, Math.round(g + delta)));
          px[idx + 2] = Math.max(0, Math.min(255, Math.round(b + delta)));
        }
      }
    }
    sc.putImageData(imgData, 0, 0);

    // 2c. Layer directional waxy oil-pastel strokes following the form + paper-grain tooth (clipped inside sprite!)
    const strokeOverlay = document.createElement("canvas");
    strokeOverlay.width = S; strokeOverlay.height = S;
    const oc = strokeOverlay.getContext("2d");
    oc.drawImage(spriteCv, 0, 0);
    oc.globalCompositeOperation = "source-atop";

    // Directional curved oil-pastel strokes across the body (sampled from sprite itself so hues stay 100% faithful!)
    const cxBody = dx + dw * 0.5, cyBody = dy + dh * 0.5;
    for (let si = 0; si < 95; si++) {
      const rx = dx + hash(si * 7, seedBase + 101) * dw;
      const ry = dy + hash(si * 13, seedBase + 109) * dh;
      const ix = Math.max(0, Math.min(S - 1, Math.round(rx)));
      const iy = Math.max(0, Math.min(S - 1, Math.round(ry)));
      const pIdx = (iy * S + ix) * 4;
      if (copyPx[pIdx + 3] < 160) continue;
      const pr = copyPx[pIdx], pg = copyPx[pIdx + 1], pb = copyPx[pIdx + 2];
      const lum = pr * 0.299 + pg * 0.587 + pb * 0.114;
      const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
      if (lum < 56 && sat < 38) continue; // keep eyes/outlines crisp and readable!
      const shift = (si % 2 === 0 ? 18 : -14);
      const cStr = `rgb(${Math.max(0, Math.min(255, pr + shift))},${Math.max(0, Math.min(255, pg + shift))},${Math.max(0, Math.min(255, pb + shift))})`;
      const formAng = Math.atan2(ry - cyBody, rx - cxBody) + Math.PI * 0.5 + (hash(si, seedBase + 113) - 0.5) * 0.45;
      dabStroke(oc, rx, ry, 10 + hash(si, seedBase + 127) * 9, 4.2 + hash(si, seedBase + 131) * 2.6, formAng, cStr, 0.30, seedBase + si);
    }

    // Visible paper-grain tooth (warm cream paper specks showing through — minimal darkening!)
    oc.save();
    oc.translate((seedBase * 23) % 192, (seedBase * 41) % 192);
    oc.globalAlpha = 0.48;
    oc.fillStyle = oc.createPattern(toothPatCanvas, "repeat");
    oc.fillRect(-200, -200, S + 400, S + 400);
    oc.globalAlpha = 0.14;
    oc.fillStyle = oc.createPattern(darkGrainCanvas, "repeat");
    oc.fillRect(-200, -200, S + 400, S + 400);
    oc.restore();

    // Extra crisp paper-tooth pinpoints showing through flat fills
    oc.fillStyle = "#fbf4e2";
    for (let ti = 0; ti < 140; ti++) {
      const tx = dx + hash(ti * 11, seedBase + 149) * dw;
      const ty = dy + hash(ti * 17, seedBase + 157) * dh;
      const ix = Math.max(0, Math.min(S - 1, Math.round(tx)));
      const iy = Math.max(0, Math.min(S - 1, Math.round(ty)));
      const pIdx = (iy * S + ix) * 4;
      if (copyPx[pIdx + 3] > 180 && ((copyPx[pIdx] * 0.3 + copyPx[pIdx + 1] * 0.59 + copyPx[pIdx + 2] * 0.11) > 72 || (Math.max(copyPx[pIdx], copyPx[pIdx+1], copyPx[pIdx+2]) - Math.min(copyPx[pIdx], copyPx[pIdx+1], copyPx[pIdx+2])) > 45)) {
        oc.globalAlpha = 0.26 + hash(ti, seedBase + 163) * 0.28;
        oc.fillRect(tx, ty, 1.5, 1.3);
      }
    }

    // Store raw & textured pair for inspection if requested
    if (opts.key) {
      rawVsTexturedPairs[opts.key] = { raw: rawScaledCv, textured: strokeOverlay };
    }

    // 3. Build solid alpha silhouette mask directly from the original sprite
    const innerMask = document.createElement("canvas");
    innerMask.width = S; innerMask.height = S;
    const mc = innerMask.getContext("2d");
    mc.drawImage(rawScaledCv, 0, 0);
    mc.globalCompositeOperation = "source-in";
    mc.fillStyle = "#000";
    mc.fillRect(0, 0, S, S);

    if (opts.noCardboard) {
      // Pure 2.5D Gen-1 slime cutout (crayon-textured, NO boxy cardboard backing!)
      return strokeOverlay;
    }

    // 4. Glue oil-pastel-textured Gen-1 sprite onto corrugated cardboard standee (softer warm rim)!
    return makeCardboardStandeeFromMask(S, S, innerMask, {
      thickX: opts.thickX ?? 14,
      thickY: opts.thickY ?? 10,
      lip: opts.lip ?? 3.8,
      softRim: true
    }, (c) => {
      c.drawImage(strokeOverlay, 0, 0);
    });
  }

  /* ================= Standee Library (Gen-1 Sprites + Matching Crayon Props) ================= */
  let readyCallbacks = [];
  const rawVsTexturedPairs = {};
  let isReady = false;

  function whenReady(fn) {
    if (isReady) fn();
    else readyCallbacks.push(fn);
  }

  function buildCardboardStandees(extraSpecs) {
    const S = 260;
    const cx = S * 0.5, by = S - 24;
    const layers = {};

    // 1. World props: 2.5D GEN-1 Orchard Crayon Style (#2b1b22 crayon outline + cel shading + grain texture!)
    const gen1Stroke = (c, pts, fillCol, lw = 4.2, seed = 600, hiCol = null) => {
      c.save();
      tracePoly(c, pts);
      c.fillStyle = fillCol;
      c.fill();
      if (hiCol) {
        c.save();
        c.clip();
        c.fillStyle = hiCol;
        c.beginPath();
        c.ellipse(cx - 18, by - 134, 48, 34, -0.3, 0, TAU);
        c.fill();
        c.restore();
      }
      // Subtle paper tooth inside
      c.save();
      c.clip();
      ensureToothTextures();
      c.globalAlpha = 0.36;
      c.fillStyle = c.createPattern(toothPatCanvas, "repeat");
      c.fillRect(0, 0, S, S);
      c.restore();
      tracePoly(c, pts);
      c.lineWidth = lw;
      c.strokeStyle = "#2b1b22";
      c.lineJoin = "round";
      c.stroke();
      c.restore();
    };

    const treeCanopy = sampleSmoothLoop([
      [cx - 46, by - 66], [cx - 72, by - 92], [cx - 76, by - 122], [cx - 60, by - 154],
      [cx - 28, by - 176], [cx, by - 182], [cx + 28, by - 176], [cx + 60, by - 154],
      [cx + 76, by - 122], [cx + 72, by - 92], [cx + 46, by - 66], [cx, by - 60]
    ], 4);
    const treeCv = document.createElement("canvas");
    treeCv.width = S; treeCv.height = S;
    const tc = treeCv.getContext("2d");
    // Trunk
    const trunkPts = sampleSmoothLoop([
      [cx - 18, by + 2], [cx - 14, by - 76], [cx - 28, by - 102], [cx - 18, by - 106],
      [cx - 3, by - 82], [cx + 5, by - 82], [cx + 22, by - 104], [cx + 30, by - 98],
      [cx + 14, by - 74], [cx + 18, by + 2]
    ], 3);
    gen1Stroke(tc, trunkPts, "#8a522a", 4.2, 601);
    // Scalloped Gen-1 Orchard canopy + highlight + glossy red apple
    gen1Stroke(tc, treeCanopy, "#449e36", 4.5, 604, "#66c848");
    const subLobe = sampleSmoothLoop([[cx - 44, by - 136], [cx - 18, by - 166], [cx + 18, by - 166], [cx + 42, by - 134], [cx + 22, by - 110], [cx - 24, by - 110]], 3);
    tc.save();
    tracePoly(tc, subLobe);
    tc.fillStyle = "rgba(124, 218, 86, 0.42)";
    tc.fill();
    tc.restore();
    // Red apple
    const applePts = makeEllipsePts(cx - 2, by - 118, 16, 15, 16, 607);
    gen1Stroke(tc, applePts, "#f03628", 3.6, 607);
    tc.fillStyle = "rgba(255,255,255,0.62)";
    tc.beginPath(); tc.ellipse(cx - 8, by - 124, 4.8, 3, -0.5, 0, TAU); tc.fill();
    tc.strokeStyle = "#2b1b22"; tc.lineWidth = 3; tc.beginPath(); tc.moveTo(cx - 2, by - 133); tc.lineTo(cx, by - 142); tc.stroke();
    gen1Stroke(tc, sampleSmoothLoop([[cx, by - 139], [cx + 11, by - 147], [cx + 14, by - 137], [cx + 4, by - 135]], 2), "#5cc644", 2.6, 609);
    layers.tree = [{ zOff: 0, cv: treeCv }];

    // Gen-1 Bush
    const bushCv = document.createElement("canvas");
    bushCv.width = S; bushCv.height = S;
    const bc = bushCv.getContext("2d");
    const bushPts = sampleSmoothLoop([
      [cx - 58, by - 8], [cx - 66, by - 36], [cx - 44, by - 64], [cx - 12, by - 72],
      [cx + 16, by - 72], [cx + 48, by - 62], [cx + 66, by - 34], [cx + 56, by - 8], [cx, by - 4]
    ], 4);
    gen1Stroke(bc, bushPts, "#48a638", 4.2, 700, "#72d452");
    // Cute pink & yellow flowers
    for (const [fx, fy, fc] of [[cx - 20, by - 38, "#ff7aa8"], [cx + 18, by - 30, "#ffd846"]]) {
      bc.fillStyle = fc; bc.strokeStyle = "#2b1b22"; bc.lineWidth = 2.6;
      bc.beginPath(); bc.arc(fx, fy, 7.5, 0, TAU); bc.fill(); bc.stroke();
      bc.fillStyle = "#fff8d6"; bc.beginPath(); bc.arc(fx, fy, 2.8, 0, TAU); bc.fill();
    }
    layers.bush = [{ zOff: 0, cv: bushCv }];

    // Gen-1 Rock
    const rockCv = document.createElement("canvas");
    rockCv.width = S; rockCv.height = S;
    const rc = rockCv.getContext("2d");
    const rockPts = sampleSmoothLoop([[cx - 52, by], [cx - 40, by - 52], [cx + 10, by - 62], [cx + 50, by - 24], [cx + 44, by + 2]], 4);
    gen1Stroke(rc, rockPts, "#949ca6", 4.2, 720, "#c8cfd8");
    layers.rock = [{ zOff: 0, cv: rockCv }];

    // Gen-1 Signpost
    const signCv = document.createElement("canvas");
    signCv.width = S; signCv.height = S;
    const sc2 = signCv.getContext("2d");
    gen1Stroke(sc2, sampleSmoothLoop([[cx - 8, by], [cx - 7, by - 60], [cx + 8, by - 60], [cx + 8, by]], 3), "#8e582e", 3.8, 740);
    gen1Stroke(sc2, sampleSmoothLoop([[cx - 42, by - 94], [cx + 28, by - 96], [cx + 54, by - 74], [cx + 28, by - 52], [cx - 42, by - 54]], 3), "#f4c864", 4.0, 741);
    sc2.strokeStyle = "#6e3e1c"; sc2.lineWidth = 4; sc2.lineCap = "round";
    sc2.beginPath(); sc2.moveTo(cx - 24, by - 74); sc2.lineTo(cx + 22, by - 74); sc2.lineTo(cx + 12, by - 82); sc2.moveTo(cx + 22, by - 74); sc2.lineTo(cx + 12, by - 66); sc2.stroke();
    layers.sign = [{ zOff: 0, cv: signCv }];

    // Gen-1 Wooden Fence
    const fenceCv = document.createElement("canvas");
    fenceCv.width = S; fenceCv.height = S;
    const fc2 = fenceCv.getContext("2d");
    gen1Stroke(fc2, sampleSmoothLoop([[cx - 82, by - 36], [cx + 82, by - 36], [cx + 82, by - 20], [cx - 82, by - 20]], 2), "#c68846", 3.6, 760);
    gen1Stroke(fc2, sampleSmoothLoop([[cx - 82, by - 66], [cx + 82, by - 66], [cx + 82, by - 50], [cx - 82, by - 50]], 2), "#dfaa62", 3.6, 761);
    [-58, -18, 22, 60].forEach((px, idx) => {
      gen1Stroke(fc2, sampleSmoothLoop([[cx + px - 10, by], [cx + px - 9, by - 72], [cx + px, by - 88], [cx + px + 9, by - 72], [cx + px + 10, by]], 2), "#f0c47a", 3.6, 770 + idx);
    });
    layers.fence = [{ zOff: 0, cv: fenceCv }];

    // 2. ORIGINAL GEN-1 CHARACTER SPRITES glued onto corrugated cardboard standees!
    const spriteSpecs = extraSpecs || [];

    Promise.all(spriteSpecs.map(([key, src, opts]) => new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        layers[key] = [{ zOff: 0, cv: makeSpriteCardboardStandee(im, { ...opts, key }) }];
        resolve();
      };
      im.onerror = () => resolve();
      im.src = src;
    }))).then(() => {
      isReady = true;
      for (const fn of readyCallbacks) fn();
      readyCallbacks = [];
    });

    return layers;
  }

  // Procedural Soft Crumpled Paper Overlay (organic curved wrinkles, gentle light/shadow facets, no geometric glass shards)
  function drawCrumpledPaperOverlay(c, w, h, seed = 404, opts = {}) {
    ensureToothTextures();
    const cell = opts.cell ?? 112;
    const strength = opts.strength ?? 1.0;
    const isColoredSurface = !!opts.coloredSurface;
    const zScale = cell * 0.42;
    const cols = Math.ceil(w / cell) + 3;
    const rows = Math.ceil(h / cell) + 3;

    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let q = 0; q < cols; q++) {
        const bx = (q - 1) * cell;
        const by = (r - 1) * cell;
        const jx = (hash(q * 19 + r * 37, seed) - 0.5) * cell * 0.85;
        const jy = (hash(q * 41 + r * 13, seed + 5) - 0.5) * cell * 0.85;
        const hz = hash(q * 29 + r * 53, seed + 11);
        row.push([bx + jx, by + jy, hz]);
      }
      grid.push(row);
    }

    const tris = [];
    const edges = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let q = 0; q < cols - 1; q++) {
        const p00 = grid[r][q], p10 = grid[r][q + 1];
        const p01 = grid[r + 1][q], p11 = grid[r + 1][q + 1];
        edges.push([p00, p10, q * 7 + r]);
        edges.push([p00, p01, q * 13 + r]);
        if (hash(q * 17 + r * 31, seed + 19) > 0.5) {
          tris.push([p00, p10, p11]);
          tris.push([p00, p11, p01]);
          edges.push([p00, p11, q * 23 + r]);
        } else {
          tris.push([p00, p10, p01]);
          tris.push([p10, p11, p01]);
          edges.push([p10, p01, q * 29 + r]);
        }
      }
    }

    c.save();
    // 1. Soft, subtle faceted light/shadow paper folds (low contrast so it never looks like glass shards)
    for (let i = 0; i < tris.length; i++) {
      const [a, b, d] = tris[i];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = (b[2] - a[2]) * zScale;
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = (d[2] - a[2]) * zScale;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const len = Math.max(1e-4, Math.hypot(nx, ny, nz));
      const tilt = ((nx / len) * -0.72 + (ny / len) * -0.68 + (nz / len) * 0.14) - 0.14;
      const ridge = (a[2] + b[2] + d[2]) / 3;

      c.beginPath();
      c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath();

      if (tilt > 0.04) {
        c.fillStyle = `rgba(255, 253, 245, ${Math.min(0.10, tilt * 0.18 * strength)})`;
        c.fill();
      } else if (tilt < -0.04) {
        c.fillStyle = `rgba(72, 58, 36, ${Math.min(0.075, -tilt * 0.13 * strength)})`;
        c.fill();
      }
      if (isColoredSurface) {
        if (ridge > 0.57) {
          c.fillStyle = `rgba(36, 56, 18, ${Math.min(0.06, (ridge - 0.57) * 0.14 * strength)})`;
          c.fill();
        } else if (ridge < 0.42) {
          c.fillStyle = `rgba(255, 251, 236, ${Math.min(0.09, (0.42 - ridge) * 0.22 * strength)})`;
          c.fill();
        }
      }
    }

    // 2. Organic wavy paper creases (only stronger folds, soft translucent curves — NO harsh straight dark lines)
    c.lineCap = "round";
    c.lineJoin = "round";
    for (let i = 0; i < edges.length; i++) {
      const [pA, pB, eSeed] = edges[i];
      const dz = Math.abs(pA[2] - pB[2]);
      if (dz < 0.34) continue;
      const aNorm = Math.min(1, (dz - 0.34) * 2.1) * strength;
      const dx = pB[0] - pA[0], dy = pB[1] - pA[1];
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const bend1 = (hash(eSeed, seed + 31) - 0.5) * 14;
      const bend2 = (hash(eSeed, seed + 47) - 0.5) * 14;
      const p1x = pA[0] + dx * 0.33 + nx * bend1, p1y = pA[1] + dy * 0.33 + ny * bend1;
      const p2x = pA[0] + dx * 0.67 + nx * bend2, p2y = pA[1] + dy * 0.67 + ny * bend2;

      // Soft shadowed paper wrinkle
      c.strokeStyle = `rgba(76, 62, 42, ${(isColoredSurface ? 0.08 : 0.095) * aNorm})`;
      c.lineWidth = 1.2 + dz * 0.5;
      c.beginPath();
      c.moveTo(pA[0], pA[1]);
      c.bezierCurveTo(p1x, p1y, p2x, p2y, pB[0], pB[1]);
      c.stroke();

      // Gentle highlight / crayon-skip beside the wrinkle
      c.strokeStyle = isColoredSurface
        ? `rgba(255, 252, 238, ${0.18 * aNorm})`
        : `rgba(255, 254, 248, ${0.24 * aNorm})`;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(pA[0] + 1.5, pA[1] + 1.3);
      c.bezierCurveTo(p1x + 1.5, p1y + 1.3, p2x + 1.5, p2y + 1.3, pB[0] + 1.5, pB[1] + 1.3);
      c.stroke();
    }

    // 3. Soft paper-tooth grain across folds
    const pat = c.createPattern(toothPatCanvas, "repeat");
    c.globalAlpha = (isColoredSurface ? 0.14 : 0.16) * strength;
    c.fillStyle = pat;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  // Paint realistic kraft paper mottling + pulp fibers inside current clip
  function paintKraftMottle(c, minX, minY, w, h, seed = 101, shadeBias = 0) {
    c.save();
    for (let i = 0; i < 26; i++) {
      const mx = minX + hash(i * 7, seed + 3) * w;
      const my = minY + hash(i * 11, seed + 7) * h;
      const rx = 12 + hash(i, seed + 11) * 28;
      const ry = 6 + hash(i, seed + 17) * 14;
      c.fillStyle = i % 2 === 0
        ? `rgba(222, 178, 126, ${0.18 + Math.max(0, shadeBias) * 0.08})`
        : `rgba(112, 66, 28, ${0.18 + Math.max(0, -shadeBias) * 0.10})`;
      c.beginPath(); c.ellipse(mx, my, rx, ry, hash(i, seed) * 2, 0, TAU); c.fill();
    }
    for (let i = 0; i < 160; i++) {
      const fx = minX + hash(i * 13, seed + 23) * w;
      const fy = minY + hash(i * 17, seed + 29) * h;
      c.fillStyle = i % 3 === 0 ? "rgba(58, 32, 12, 0.24)" : "rgba(242, 212, 170, 0.22)";
      c.fillRect(fx, fy, 2.5 + hash(i, seed + 31) * 3.0, 1.1);
    }
    c.restore();
  }

  // Draw authentic corrugated cardboard cross-section along an exposed wall mask:
  // two kraft liner sheets + continuous sinusoidal flute wave + directional sunlit/shaded contrast + dents + peeled tabs
  function drawCorrugatedWallFlutes(fc, layerPts, yOff, layerH, seed, minX, maxX) {
    const samples = [];
    let totalLen = 0;
    for (let i = 0; i < layerPts.length; i++) {
      const p0 = layerPts[i], p1 = layerPts[(i + 1) % layerPts.length];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const seg = Math.hypot(dx, dy);
      if (seg < 0.5) continue;
      // Outward normal for clockwise loop (or detect downward-facing front walls where dx > 0 on bottom edge)
      const nX = dy / seg, nY = -dx / seg;
      const nSub = Math.max(1, Math.ceil(seg / 2.2));
      for (let k = 0; k < nSub; k++) {
        const t = k / nSub;
        const x = p0[0] + dx * t;
        const y = p0[1] + dy * t;
        const dentWave = Math.sin(totalLen * 0.025 + seed) * 0.10 + (hash(Math.floor(totalLen / 44), seed + 9) > 0.85 ? -0.24 : 0);
        const localH = Math.max(7.5, layerH * (0.96 + dentWave));
        samples.push({ x, y, s: totalLen, h: localH, nX, nY });
        totalLen += seg / nSub;
      }
    }
    if (samples.length < 3) return;

    fc.lineCap = "round";
    fc.lineJoin = "round";

    // 1. Hollow inner corrugated channel (deep warm umber #3b1c09, not pure black!)
    fc.strokeStyle = "#3b1c09";
    fc.lineWidth = layerH * 0.54;
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + pt.h * 0.52;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    // 2. Continuous sinusoidal corrugated flute wave (~10.5px pitch, softer organic kraft contrast)
    const waveFreq = 0.60;
    const wavePts = samples.map((pt) => {
      const phase = pt.s * waveFreq + seed * 0.7;
      // Occasional subtle flattened/crushed stretch where wave amplitude dips
      const crush = hash(Math.floor(pt.s / 55), seed + 17) > 0.86 ? 0.55 : 1.0;
      const amp = pt.h * 0.23 * crush;
      return { x: pt.x, y: pt.y + yOff + pt.h * 0.52 + Math.sin(phase) * amp, nx: pt.x };
    });

    // Shaded underside of flute wave
    fc.strokeStyle = "#6e3e1a";
    fc.lineWidth = 2.6;
    fc.beginPath();
    wavePts.forEach((pt, idx) => idx === 0 ? fc.moveTo(pt.x, pt.y + 0.85) : fc.lineTo(pt.x, pt.y + 0.85));
    fc.stroke();

    // Sunlit kraft flute ribbon (gradient from warm tan left-sunlit to shaded caramel right)
    const fluteGrad = fc.createLinearGradient(minX, 0, maxX, 0);
    fluteGrad.addColorStop(0, "#e3b278");
    fluteGrad.addColorStop(0.55, "#c99056");
    fluteGrad.addColorStop(1, "#9d6838");
    fc.strokeStyle = fluteGrad;
    fc.lineWidth = 1.85;
    fc.beginPath();
    wavePts.forEach((pt, idx) => idx === 0 ? fc.moveTo(pt.x, pt.y) : fc.lineTo(pt.x, pt.y));
    fc.stroke();

    // 3. Prominent top & bottom kraft liner sheets sandwiching the corrugated wave!
    const topLinerGrad = fc.createLinearGradient(minX, 0, maxX, 0);
    topLinerGrad.addColorStop(0, "#d7a872");
    topLinerGrad.addColorStop(0.6, "#be8a52");
    topLinerGrad.addColorStop(1, "#986435");
    fc.strokeStyle = topLinerGrad;
    fc.lineWidth = Math.max(2.6, layerH * 0.24);
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + layerH * 0.14;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    fc.strokeStyle = "#8a562a";
    fc.lineWidth = Math.max(2.4, layerH * 0.21);
    fc.beginPath();
    samples.forEach((pt, idx) => {
      const yy = pt.y + yOff + pt.h * 0.88;
      if (idx === 0) fc.moveTo(pt.x, yy); else fc.lineTo(pt.x, yy);
    });
    fc.stroke();

    // 4. Subtle peeled top-liner flaps + frayed kraft fibers on front-facing edges
    for (let i = 18; i < samples.length - 18; i += 34) {
      const pt = samples[i];
      if (hash(i, seed + 41) > 0.62) {
        fc.fillStyle = "#dfb37b";
        fc.strokeStyle = "#522f14";
        fc.lineWidth = 1.05;
        fc.beginPath();
        fc.moveTo(pt.x - 5.5, pt.y + yOff + 1.2);
        fc.lineTo(pt.x + 3.5, pt.y + yOff - 2.8);
        fc.lineTo(pt.x + 8.5, pt.y + yOff + 2.2);
        fc.closePath();
        fc.fill(); fc.stroke();
      }
      fc.strokeStyle = "rgba(232, 198, 152, 0.55)";
      fc.lineWidth = 1.0;
      fc.beginPath();
      fc.moveTo(pt.x, pt.y + yOff + pt.h * 0.32);
      fc.lineTo(pt.x + (hash(i, seed + 7) - 0.5) * 5.5, pt.y + yOff + pt.h * 0.32 + 4.8);
      fc.stroke();
    }
  }

  const _flashCache = new WeakMap();
  function getStandeeFlashCv(srcCv, col = "#ffffff") {
    let map = _flashCache.get(srcCv);
    if (!map) { map = new Map(); _flashCache.set(srcCv, map); }
    if (map.has(col)) return map.get(col);
    const fcv = document.createElement("canvas");
    fcv.width = srcCv.width; fcv.height = srcCv.height;
    const fc = fcv.getContext("2d");
    fc.drawImage(srcCv, 0, 0);
    fc.globalCompositeOperation = "source-in";
    fc.fillStyle = col;
    fc.fillRect(0, 0, fcv.width, fcv.height);
    map.set(col, fcv);
    return fcv;
  }

  window.PaperCraft = {
    rawVsTexturedPairs,
    hash, jit, sampleSmoothLoop, makeEllipsePts, tracePoly,
    strokeWaxCrayon, fillWaxCrayon, fillOilPastel, dabPastelCluster, dabStroke, makeCardboardSlab,
    buildCardboardStandees, whenReady, drawCrumpledPaperOverlay, paintKraftMottle, drawCorrugatedWallFlutes, getStandeeFlashCv
  };
})();
