(function () {
  // cursor de doble círculo
  var cin = document.querySelector(".cursor-in"), cout = document.querySelector(".cursor-out");
  if (cin && cout && matchMedia("(pointer: fine)").matches) {
    var mx = innerWidth / 2, my = innerHeight / 2, ox = mx, oy = my;
    addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; cin.style.left = mx + "px"; cin.style.top = my + "px"; }, { passive: true });
    (function loopC() { ox += (mx - ox) * .2; oy += (my - oy) * .2; cout.style.left = ox + "px"; cout.style.top = oy + "px"; requestAnimationFrame(loopC); })();
    document.addEventListener("mouseover", function (e) { cout.classList.toggle("big", !!e.target.closest("a, button, .mirror, input, select, textarea")); });
    document.addEventListener("mouseleave", function () { cin.style.opacity = cout.style.opacity = 0; });
    document.addEventListener("mouseenter", function () { cin.style.opacity = cout.style.opacity = 1; });
  }

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = document.querySelector(".hero-stage");
  var desert = document.querySelector(".desert");
  var dv = desert.querySelector("video");
  var playing = false, skyOn = false;

  /* ================= cielo: estrellas que parpadean, estrellas fugaces y nubes que se mueven ================= */
  var sky = document.getElementById("sky"), sx = sky.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(devicePixelRatio || 1, 2), stars = [], shooters = [], nextShoot = 2.5;
  var cloudTile = null, cloudX = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function buildStars() {
    stars = [];
    var n = Math.round((W * H) / 9000);
    for (var i = 0; i < n; i++) {
      var y = Math.pow(Math.random(), 1.6) * H * 0.52; // más estrellas arriba
      stars.push({ x: Math.random() * W, y: y, r: rnd(.35, 1.25), base: rnd(.15, .55), amp: rnd(.25, .75), sp: rnd(.4, 2.2), ph: Math.random() * 6.28, big: Math.random() < .07 });
    }
  }
  // textura de nubes "infinita" (ruido suave que se repite sin cortes)
  function buildClouds() {
    var cw = 512, ch = 192, c = document.createElement("canvas"); c.width = cw; c.height = ch;
    var g = c.getContext("2d"), img = g.createImageData(cw, ch), d = img.data;
    function grid(n) { var a = []; for (var i = 0; i < n * n; i++) a.push(Math.random()); return a; }
    var oct = [[4, grid(4)], [8, grid(8)], [16, grid(16)], [32, grid(32)]];
    function noise(u, v, n, a) {
      var x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      function at(i, j) { return a[((j % n + n) % n) * n + ((i % n + n) % n)]; }
      var t = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
      return t + (b - t) * fy;
    }
    for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) {
      var u = x / cw, v = y / ch, s = 0, amp = .55;
      for (var k = 0; k < oct.length; k++) { s += noise(u, v * (ch / cw) * 2.2, oct[k][0], oct[k][1]) * amp; amp *= .5; }
      var a = Math.max(0, Math.min(1, (s - .52) * 2.6));
      var i = (y * cw + x) * 4; d[i] = d[i + 1] = d[i + 2] = 235; d[i + 3] = Math.round(a * a * 255);
    }
    g.putImageData(img, 0, 0); cloudTile = c;
  }
  function resize() {
    W = innerWidth; H = innerHeight;
    sky.width = Math.round(W * DPR); sky.height = Math.round(H * DPR);
    sx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
  }
  function shoot() {
    var fromLeft = Math.random() < .5, len = rnd(120, 260);
    shooters.push({ x: fromLeft ? rnd(W * .05, W * .5) : rnd(W * .5, W * .95), y: rnd(H * .04, H * .3), vx: (fromLeft ? 1 : -1) * rnd(520, 820), vy: rnd(160, 300), life: 0, max: rnd(.7, 1.15), len: len });
  }
  var last = performance.now();
  function drawSky(now) {
    requestAnimationFrame(drawSky);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!skyOn) return;
    var t = now / 1000;
    sx.clearRect(0, 0, W, H);
    // nubes: dos capas a distinta velocidad, sólo en la franja del cielo
    if (cloudTile) {
      cloudX += dt * 30;
      var th = H * .5, tw = th * (cloudTile.width / cloudTile.height) * 1.6;
      sx.save();
      var grad = sx.createLinearGradient(0, 0, 0, H * .62);
      sx.globalAlpha = .2;
      for (var layer = 0; layer < 2; layer++) {
        var off = ((cloudX * (layer ? .55 : 1)) % tw + tw) % tw, yy = layer ? H * .1 : H * .02, sc = layer ? 1.35 : 1;
        for (var xx = -off * sc; xx < W; xx += tw * sc) sx.drawImage(cloudTile, xx, yy, tw * sc, th * sc);
      }
      sx.globalAlpha = 1; sx.globalCompositeOperation = "destination-in";
      grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(.75, "rgba(0,0,0,.85)"); grad.addColorStop(1, "rgba(0,0,0,0)");
      sx.fillStyle = grad; sx.fillRect(0, 0, W, H);
      sx.restore();
    }
    // estrellas parpadeando
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = s.base + s.amp * (.5 + .5 * Math.sin(t * s.sp + s.ph));
      a *= a;
      sx.globalAlpha = Math.min(1, a);
      sx.fillStyle = "#fff";
      sx.beginPath(); sx.arc(s.x, s.y, s.r, 0, 6.283); sx.fill();
      if (s.big && a > .45) { sx.globalAlpha = (a - .45) * .9; sx.fillRect(s.x - s.r * 5, s.y - .3, s.r * 10, .6); sx.fillRect(s.x - .3, s.y - s.r * 5, .6, s.r * 10); }
    }
    sx.globalAlpha = 1;
    // estrellas fugaces
    nextShoot -= dt;
    if (nextShoot <= 0 && !reduce) { shoot(); nextShoot = rnd(2.2, 6.5); }
    for (var k = shooters.length - 1; k >= 0; k--) {
      var p = shooters[k]; p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      var f = p.life / p.max; if (f >= 1) { shooters.splice(k, 1); continue; }
      var fade = Math.sin(f * Math.PI), sp = Math.hypot(p.vx, p.vy), tx = p.x - p.vx / sp * p.len, ty = p.y - p.vy / sp * p.len;
      var g2 = sx.createLinearGradient(p.x, p.y, tx, ty);
      g2.addColorStop(0, "rgba(255,255,255," + (.95 * fade) + ")"); g2.addColorStop(1, "rgba(255,255,255,0)");
      sx.strokeStyle = g2; sx.lineWidth = 1.4; sx.lineCap = "round";
      sx.beginPath(); sx.moveTo(p.x, p.y); sx.lineTo(tx, ty); sx.stroke();
      sx.fillStyle = "rgba(255,255,255," + fade + ")"; sx.beginPath(); sx.arc(p.x, p.y, 1.5, 0, 6.283); sx.fill();
    }
  }
  resize(); addEventListener("resize", resize);
  setTimeout(buildClouds, 60);
  requestAnimationFrame(drawSky);

  /* ================= textos que se iluminan palabra a palabra ================= */
  var leads = [].slice.call(document.querySelectorAll(".lead2"));
  leads.forEach(function (p) { p.innerHTML = p.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" "); });

  /* ================= tarjetas que "se generan" según bajas ================= */
  var gens = [].slice.call(document.querySelectorAll(".gen, .gen-t"));
  // dentro de una rejilla, cada tarjeta empieza un poco después que la anterior
  document.querySelectorAll("[data-stagger]").forEach(function (g) {
    [].slice.call(g.querySelectorAll(".gen")).forEach(function (el, i) { el.dataset.lag = (i % 4) * 0.07; });
  });

  /* ================= bento: origen de cada tarjeta, foco del ratón, contador, copiar ================= */
  var steps2 = document.querySelector(".steps2"), bento2 = document.querySelector(".bento2"), statEl = document.querySelector(".bento2 .stat"), countEl = statEl && statEl.querySelector(".count"), lastN = -1;
  function bentoOrigins() {
    if (!bento2) return;
    var cx = bento2.clientWidth / 2, cy = bento2.clientHeight / 2;
    [].slice.call(bento2.children).forEach(function (el) {
      el.style.setProperty("--ox", (el.offsetLeft + el.offsetWidth / 2 - cx).toFixed(0));
      el.style.setProperty("--oy", (el.offsetTop + el.offsetHeight / 2 - cy).toFixed(0));
    });
  }
  if (bento2) [].slice.call(bento2.children).forEach(function (el, i) { el.dataset.lag = [0, .05, .1, .08, .13][i] || 0; });
  if (steps2) [].slice.call(steps2.children).forEach(function (el, i) { el.dataset.lag = [0, .07, .07, 0][i] || 0; });
  bentoOrigins(); addEventListener("resize", bentoOrigins); addEventListener("load", bentoOrigins);
  if (bento2) [].slice.call(bento2.children).forEach(function (el) {
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); });
  });
  var copyBtn = document.querySelector(".bento2 .copy");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var done = function () { copyBtn.textContent = "Copiado ✓"; setTimeout(function () { copyBtn.textContent = "Copiar"; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(copyBtn.dataset.mail).then(done, done); else done();
  });

  /* ================= Mirror Hall ================= */
  var hall = document.querySelector(".hall"), ring = document.querySelector(".ring");
  var mirrors = [].slice.call(document.querySelectorAll(".mirror"));
  var N = mirrors.length, step = 360 / N, R = 600, PUSH = 420, rot = 0, active = -1;
  var nowIx = document.querySelector(".hall-now .ix"), nowNm = document.querySelector(".hall-now .nm"), nowAn = document.querySelector(".hall-now .an");
  var dotsBox = document.querySelector(".hall-dots"), hallNow = document.querySelector(".hall-now"), hallHead = document.querySelector(".hall-head");
  mirrors.forEach(function () { dotsBox.appendChild(document.createElement("i")); });
  var dots = [].slice.call(dotsBox.children);
  function layoutRing() {
    var small = innerWidth < 760;
    var cw = small ? Math.max(110, innerWidth * .3) : Math.min(196, Math.max(130, innerWidth * .118));
    var ch = Math.min(cw * 1.42, innerHeight * .34);
    cw = ch / 1.42;
    ring.style.setProperty("--cw", cw + "px"); ring.style.setProperty("--ch", ch + "px");
    R = ((cw + (small ? 26 : 44)) * N) / (2 * Math.PI);
    PUSH = R * .72;
    mirrors.forEach(function (m, i) { m._b = "rotateY(" + (-i * step) + "deg) translateZ(" + (-R) + "px)"; m.style.transform = m._b; });
  }
  layoutRing(); addEventListener("resize", layoutRing);
  function setActive(i) {
    if (i === active) return; active = i;
    var d = MODS[i];
    nowIx.textContent = String(i).padStart(2, "0") + " / " + String(N - 1).padStart(2, "0");
    nowNm.textContent = d.n; nowAn.textContent = d.a + (d.live ? " · ya funcionando" : d.s ? " · " + d.s : "");
    dots.forEach(function (x, k) { x.classList.toggle("on", k === i); });
  }

  /* ================= ficha del módulo ================= */
  var MODS = JSON.parse(document.getElementById("mods-data").textContent);
  var sheet = document.querySelector(".sheet"), cur = 0;
  function openSheet(i) {
    cur = (i + N) % N; var d = MODS[cur];
    sheet.querySelector(".pic").innerHTML = d.k === "goat" ? '<img class="inv" src="assets/fauna/goat.png" alt="">' : d.img ? '<img src="' + d.img + '" alt="">' : '<svg aria-hidden="true"><use href="assets/animales.svg#a-' + d.k + '"/></svg>';
    sheet.querySelector(".st").className = "st" + (d.live ? " live" : "");
    sheet.querySelector(".st").textContent = d.live ? "Ya funcionando en un caso real" : (d.s || "Listo para implantar");
    sheet.querySelector("h3").textContent = d.n;
    sheet.querySelector(".what").textContent = d.d;
    sheet.querySelector(".why b").textContent = "El animal · " + d.a;
    sheet.querySelector(".why p").textContent = d.w;
    sheet.querySelector(".fun-tip").textContent = d.c || "";
    sheet.querySelector(".fun").classList.remove("open");
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false");
    sheet.querySelector(".x").focus({ preventScroll: true });
  }
  function closeSheet() { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); }
  mirrors.forEach(function (m, i) { m.addEventListener("click", function () { openSheet(i); }); });
  document.querySelector(".hall-now .open").addEventListener("click", function () { openSheet(active < 0 ? 0 : active); });
  sheet.querySelector(".x").addEventListener("click", closeSheet);
  var fun = sheet.querySelector(".fun"), funBtn = sheet.querySelector(".fun-btn");
  funBtn.addEventListener("click", function (e) { e.stopPropagation(); var o = !fun.classList.contains("open"); fun.classList.toggle("open", o); funBtn.setAttribute("aria-expanded", String(o)); });
  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
  sheet.querySelector(".prev").addEventListener("click", function () { openSheet(cur - 1); });
  sheet.querySelector(".next").addEventListener("click", function () { openSheet(cur + 1); });
  addEventListener("keydown", function (e) {
    if (!sheet.classList.contains("open")) return;
    if (e.key === "Escape") closeSheet(); if (e.key === "ArrowRight") openSheet(cur + 1); if (e.key === "ArrowLeft") openSheet(cur - 1);
  });

  /* ================= bucle principal ================= */
  document.querySelectorAll(".facts.rise").forEach(function (el) { el.addEventListener("animationend", function () { el.classList.remove("rise", "d5"); }); });
  var hallStage = document.querySelector(".hall-stage");
  function exitLen() { return innerHeight * 1.1; }
  function hallRange() { var top = hall.getBoundingClientRect().top + scrollY; return { top: top, span: Math.max(1, hall.offsetHeight - innerHeight - exitLen()) }; }
  function inHall() { var r = hall.getBoundingClientRect(); return r.top <= 1 && -r.top <= hall.offsetHeight - innerHeight - exitLen() + 2; }
  function hallNudge(px) { // px de gesto horizontal -> avance del anillo
    var hr2 = hallRange(), per = hr2.span / (N - 1), k = per / 260;
    var ny = Math.max(hr2.top, Math.min(hr2.top + hr2.span, scrollY + px * k));
    window.scrollTo({ top: ny, behavior: "instant" });
  }
  addEventListener("wheel", function (e) {
    if (!inHall() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault(); hallNudge(e.deltaX);
  }, { passive: false });
  var tx0 = null, ty0 = null, tLock = 0;
  hallStage.addEventListener("touchstart", function (e) { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; tLock = 0; }, { passive: true });
  hallStage.addEventListener("touchmove", function (e) {
    if (tx0 === null) return;
    var dx = e.touches[0].clientX - tx0, dy = e.touches[0].clientY - ty0;
    if (!tLock && Math.abs(dx) + Math.abs(dy) > 8) tLock = Math.abs(dx) > Math.abs(dy) ? 1 : 2;
    if (tLock === 1) { e.preventDefault(); hallNudge(-dx * 2.2); tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }
  }, { passive: false });
  hallStage.addEventListener("touchend", function () { tx0 = null; });
  var targetRot = 0;
  var heroParts = [[".hero .left", 1], [".hero .right", .8], ["body.one .facts", .45]].map(function (a) { return { el: document.querySelector(a[0]), k: a[1] }; }).filter(function (o) { return o.el; });
  function frame() {
    requestAnimationFrame(frame);
    var y = scrollY, vh = innerHeight, Hh = hero.offsetHeight;
    var vis = Math.max(0, Math.min(1, (y - Hh * .2) / (Hh * .55)));
    desert.style.opacity = vis.toFixed(3);
    skyOn = vis > 0;
    var total = Math.max(1, document.documentElement.scrollHeight - vh - Hh), pp = Math.max(0, Math.min(1, (y - Hh) / total));
    desert.style.setProperty("--dz", (1.12 - pp * .12).toFixed(4));
    if (vis > 0 && !playing && !reduce) { var q = dv.play(); if (q && q.catch) q.catch(function () {}); playing = true; }
    if (vis === 0 && playing) { dv.pause(); playing = false; }
    document.body.classList.toggle("past", y > Hh * .6);

    for (var i = 0; i < gens.length; i++) {
      var el = gens[i], grp = el.parentNode && (el.parentNode === bento2 || el.parentNode === steps2) ? el.parentNode : null, inB = !!grp, r = (grp || el).getBoundingClientRect();
      if (r.top > vh * 1.2 || r.bottom < -vh * .2) { el.style.setProperty("--p", 0); continue; }
      var lag = parseFloat(el.dataset.lag || 0);
      if (inB) { // el bento se monta como una sola pieza
        var pin = (vh * .98 - r.top) / (vh * (grp === steps2 ? .42 : .72)) - lag, pout = (r.bottom - vh * .04) / (vh * .5) - lag;
      } else {
      var pin = (vh - r.top) / (vh * (el.classList.contains("gen-t") ? .32 : .55)) - lag;           // entrando por abajo
      var pout = (r.bottom - vh * .02) / (vh * .45) - lag;  // saliendo por arriba
      }
      var p = Math.max(0, Math.min(1, Math.min(pin, pout)));
      el.style.setProperty("--p", p.toFixed(3));
      el.style.setProperty("--d", pout < pin ? 1 : 0);
    }
    // portada: se aleja al bajar y se recompone al volver arriba
    var hp2 = Math.max(0, Math.min(1, y / (Hh * .7)));
    heroParts.forEach(function (o) {
      o.el.style.transform = "translateY(" + (-hp2 * o.k * 120).toFixed(1) + "px) scale(" + (1 - hp2 * .06).toFixed(3) + ")";
      o.el.style.opacity = (1 - hp2 * 1.15).toFixed(3);
      o.el.style.filter = "blur(" + (hp2 * 10).toFixed(1) + "px)";
    });
    leads.forEach(function (el) {
      var r = el.getBoundingClientRect(), prog = Math.max(0, Math.min(1, Math.min((vh * .95 - r.top) / (vh * .33), (r.bottom - vh * .05) / (vh * .3))));
      var ws = el.children, n = ws.length, lit = Math.round(prog * n);
      for (var k = 0; k < n; k++) ws[k].classList.toggle("lit", k < lit);
    });

    if (statEl) { var sp = parseFloat(statEl.style.getPropertyValue("--p")) || 0, nv = Math.round(16 * Math.min(1, Math.max(0, (sp - .25) / .65))); if (nv !== lastN) { countEl.textContent = nv; lastN = nv; } }
    // mirror hall: el anillo gira con el scroll y se para en cada espejo
    var hr = hall.getBoundingClientRect(), xl = vh * 1.1, span = Math.max(1, hall.offsetHeight - vh - xl);
    var hp = Math.max(0, Math.min(1, -hr.top / span));
    var ex = Math.max(0, Math.min(1, (-hr.top - span) / xl)); // salida: las cartas giran y se van a los lados
    ring.classList.toggle("out", ex > 0);
    hallNow.style.opacity = hallHead.style.opacity = dotsBox.style.opacity = (1 - Math.max(0, Math.min(1, (ex - .15) * 3))).toFixed(3);
    hallNow.style.pointerEvents = ex > .3 ? "none" : "";
    var f = hp * (N - 1), base = Math.floor(f), frac = f - base;
    var eased = base + (frac < .5 ? 0 : 1) * 0 + (frac < .5 ? Math.pow(frac * 2, 3) / 2 : 1 - Math.pow((1 - frac) * 2, 3) / 2); // pausa en cada espejo
    targetRot = eased * step;
    rot += (targetRot - rot) * (reduce ? 1 : .12);
    ring.style.transform = "translateZ(" + (R - PUSH) + "px) rotateY(" + rot + "deg)";
    setActive(Math.max(0, Math.min(N - 1, Math.round(rot / step))));
    for (var m = 0; m < N; m++) {
      var ang = ((-m * step + rot) % 360 + 540) % 360 - 180, aa = Math.abs(ang);
      var mm = mirrors[m];
      var op = aa > 78 ? 0 : 1 - Math.max(0, aa - 40) / 38;
      if (ex > 0 && aa <= 78) {
        var side = -1; // todas se van hacia la izquierda, empezando por la de más a la izquierda
        var dl = .34 * (1 - (ang + 78) / 156), e = Math.max(0, Math.min(1, (ex - dl) / (1 - dl)));
        var es = Math.min(1, e / .6); es = es < .5 ? 4 * es * es * es : 1 - Math.pow(-2 * es + 2, 3) / 2; // giro de 360º
        var et = Math.max(0, (e - .2) / .8); et = et * et;                                                 // y salida a la izquierda
        mm.style.transform = mm._b + " translateX(" + (side * et * innerWidth * 1.5).toFixed(1) + "px) translateZ(" + (Math.sin(es * Math.PI) * 120).toFixed(1) + "px) rotateY(" + (side * (es * 360 + et * 40)).toFixed(1) + "deg)";
        op *= 1 - Math.max(0, e - .75) / .25;
      } else if (mm._x !== ex) mm.style.transform = mm._b;
      mm._x = ex;
      mm.style.opacity = op.toFixed(3);
      mm.style.pointerEvents = aa > 60 || ex > .2 ? "none" : "auto";
      mm.style.setProperty("--glow", aa < step / 2 ? .35 : 0);
      mm.style.setProperty("--lo", aa < step / 2 ? 1 : 0);
      mm.style.setProperty("--shine", (-60 + (ang / 60) * 120).toFixed(1) + "%");
    }
  }
  requestAnimationFrame(frame);
})();
