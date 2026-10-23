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
  // aurora boreal blanca: cortinas de luz que ondulan despacio (se pinta a baja resolución y se escala: queda suave)
  var aur = document.createElement("canvas"), ax = aur.getContext("2d"), aSprite = document.createElement("canvas");
  aSprite.width = 1; aSprite.height = 96;
  (function () { var g = aSprite.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 96);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.55, "rgba(255,255,255,.22)"); gr.addColorStop(.86, "rgba(255,255,255,.85)"); gr.addColorStop(.93, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 1, 96); })();
  function drawAurora(t) {
    var aw = aur.width, ah = aur.height;
    ax.clearRect(0, 0, aw, ah);
    for (var b = 0; b < 3; b++) {
      var wgt = [1, .7, .45][b], yb = [.30, .38, .24][b], ph = b * 2.1;
      for (var x = 0; x < aw; x++) {
        var u = x / aw;
        var base = ah * (yb + .075 * Math.sin(u * 4.6 + t * .05 + ph) + .03 * Math.sin(u * 11.5 - t * .08 + ph * 1.3) + .012 * Math.sin(u * 31 + t * .2));
        var hgt = ah * (.2 + .09 * Math.sin(u * 6.8 + t * .07 + ph));
        var I = Math.pow(.5 + .5 * Math.sin(u * 7.7 - t * .09 + ph * 1.7), 1.4) * (.65 + .35 * Math.sin(u * 37 + t * .4 + ph)) * Math.pow(Math.sin(Math.PI * u), .8);
        if (I < .02) continue;
        ax.globalAlpha = Math.min(1, I * wgt * 1.1);
        ax.drawImage(aSprite, x, base - hgt, 1.6, hgt * 1.08);
      }
    }
    ax.globalAlpha = 1;
  }
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
    aur.width = Math.max(120, Math.round(W / 5)); aur.height = Math.max(80, Math.round(H / 5));
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
    // aurora
    drawAurora(reduce ? 0 : t);
    sx.save(); sx.globalCompositeOperation = "lighter"; sx.globalAlpha = .85; sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = "high";
    sx.drawImage(aur, 0, 0, W, H); sx.restore();
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
    if (nextShoot <= 0 && !reduce) { shoot(); nextShoot = rnd(1, 3); }
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

  /* ================= portada: pocas estrellas fijas muy tenues y una fugaz cada 10–15 s, lejos de la puerta ================= */
  (function () {
    var c = document.getElementById("heroSky"); if (!c) return;
    var g = c.getContext("2d"), w = 0, hh = 0, st = [], sh = null, next = 4, lt = performance.now();
    function away(x, y) { return Math.abs(x - w / 2) > w * .2 || y < hh * .08; } // fuera de la franja de la puerta
    function size() {
      w = c.clientWidth; hh = c.clientHeight; c.width = Math.round(w * DPR); c.height = Math.round(hh * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
      st = []; var n = Math.round(w * hh / 26000);
      while (st.length < n) { var x = Math.random() * w, y = Math.pow(Math.random(), 1.4) * hh * .55; if (away(x, y)) st.push({ x: x, y: y, r: rnd(.3, .9), b: rnd(.08, .28), sp: rnd(.3, 1.2), ph: Math.random() * 6.28 }); }
    }
    function tick(now) {
      requestAnimationFrame(tick);
      var dt = Math.min(.05, (now - lt) / 1000); lt = now;
      if (scrollY > innerHeight * 1.2) return;
      var t = now / 1000; g.clearRect(0, 0, w, hh); g.fillStyle = "#fff";
      for (var i = 0; i < st.length; i++) { var s = st[i]; g.globalAlpha = s.b * (.6 + .4 * Math.sin(t * s.sp + s.ph)); g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      next -= dt;
      if (!sh && next <= 0 && !reduce) {
        var left = Math.random() < .5;
        sh = { x: left ? rnd(w * .03, w * .18) : rnd(w * .82, w * .97), y: rnd(hh * .05, hh * .22), vx: (left ? -1 : 1) * rnd(260, 380), vy: rnd(90, 160), life: 0, max: rnd(.7, 1) }; // siempre se aleja de la puerta
        next = rnd(10, 15);
      }
      if (sh) {
        sh.life += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        var f = sh.life / sh.max; if (f >= 1) { sh = null; return; }
        var fade = Math.sin(f * Math.PI) * .7, sp = Math.hypot(sh.vx, sh.vy), tx = sh.x - sh.vx / sp * 120, ty = sh.y - sh.vy / sp * 120;
        var gr = g.createLinearGradient(sh.x, sh.y, tx, ty); gr.addColorStop(0, "rgba(255,255,255," + fade + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.strokeStyle = gr; g.lineWidth = 1.1; g.lineCap = "round"; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(tx, ty); g.stroke();
      }
    }
    size(); addEventListener("resize", size); requestAnimationFrame(tick);
  })();

  /* ================= Family App: el móvil tacha una tarea dibujando la línea, suma puntos y baja la lista ================= */
  (function () {
    var fam = document.querySelector(".phone .fam"); if (!fam) return;
    var list = fam.querySelector(".fam-list ul"), items = [].slice.call(list.children), pts = fam.querySelector(".fam-pts"), bar = fam.querySelector(".fam-bar i"), bubble = document.querySelector(".phone .bubble");
    var on = false, timers = [], wrap = fam.querySelector(".fam-list");
    function fit() { wrap.style.height = (items[3].offsetTop + items[3].offsetHeight - items[0].offsetTop) + "px"; }
    fit(); addEventListener("resize", fit); addEventListener("load", fit);
    function T(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function count(a, b, ms) { var t0 = performance.now(); (function s(n) { var p = Math.min(1, (n - t0) / ms); pts.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))) + " pts"; if (p < 1) requestAnimationFrame(s); })(t0); }
    function reset() { items[2].classList.remove("tick"); items[3].classList.remove("tick"); list.style.transform = ""; pts.textContent = "245 pts"; bar.style.width = ""; fam.classList.remove("bump"); }
    function cycle() {
      if (!on) return; reset();
      T(function () { items[2].classList.add("tick"); }, 900);
      T(function () { bubble.textContent = "+20 pts"; bubble.classList.remove("go"); void bubble.offsetWidth; bubble.classList.add("go"); count(245, 265, 700); bar.style.width = "76%"; fam.classList.add("bump"); }, 1500);
      T(function () { fam.classList.remove("bump"); list.style.transform = "translateY(-" + (items[1].offsetTop - items[0].offsetTop) + "px)"; }, 2700);
      T(function () { items[3].classList.add("tick"); }, 3700);
      T(function () { bubble.textContent = "+10 pts"; bubble.classList.remove("go"); void bubble.offsetWidth; bubble.classList.add("go"); count(265, 275, 600); bar.style.width = "82%"; fam.classList.add("bump"); }, 4300);
      T(cycle, 7600);
    }
    if ("IntersectionObserver" in window && !reduce) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !on) { on = true; cycle(); } else if (!e.isIntersecting && on) { on = false; timers.forEach(clearTimeout); timers = []; } });
    }, { threshold: .4 }).observe(fam);
  })();

  /* ================= menú: onda binaria breve, sin cambiar el ancho de las palabras ================= */
  [].slice.call(document.querySelectorAll(".nav a")).forEach(function (a) {
    var word = a.textContent, cells = [], frame = 0, sequence = 0;
    var motion = matchMedia("(prefers-reduced-motion: reduce)");
    a.setAttribute("aria-label", word);

    // La etiqueta original fija la medida exacta, incluido el kerning.
    // Las capas decorativas se superponen y nunca alteran el layout ni el nombre accesible.
    var label = document.createElement("span");
    label.className = "nav-code-label";
    label.setAttribute("aria-hidden", "true");
    var measure = document.createElement("span");
    measure.className = "nav-code-measure";
    measure.textContent = word;
    label.appendChild(measure);
    var glyphs = document.createElement("span");
    glyphs.className = "nav-code-glyphs";
    label.appendChild(glyphs);
    a.textContent = "";
    a.appendChild(label);

    Array.from(word).forEach(function (c) {
      var cell = document.createElement("span");
      cell.className = "nav-code-char";
      var letter = document.createElement("span");
      letter.className = "nav-code-letter";
      letter.textContent = c;
      cell.appendChild(letter);
      glyphs.appendChild(cell);
      if (c === " ") return;
      var bit = document.createElement("span");
      bit.className = "nav-code-bit";
      bit.textContent = "0";
      cell.appendChild(bit);
      cells.push({ el: cell, bit: bit });
    });

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      cells.forEach(function (c) { c.el.classList.remove("is-encoding"); });
      a.classList.remove("coding");
    }
    function play() {
      if (motion.matches || frame) return;
      sequence++;
      a.classList.add("coding");
      var start = performance.now();
      function step(now) {
        var elapsed = now - start;
        cells.forEach(function (c, i) {
          // Onda de 150 ms; cada carácter se codifica solo 190 ms.
          // Dos cambios de bit deliberados, sin parpadeo aleatorio por fotograma.
          var age = elapsed - i / Math.max(1, cells.length - 1) * 150;
          var active = age >= 0 && age < 190;
          if (active) {
            var next = String((Math.floor(age / 76) + i + sequence) % 2);
            if (c.bit.textContent !== next) c.bit.textContent = next;
          }
          c.el.classList.toggle("is-encoding", active);
        });
        if (elapsed < 490) frame = requestAnimationFrame(step);
        else reset();
      }
      frame = requestAnimationFrame(step);
    }
    a.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") play(); });
    a.addEventListener("pointerleave", reset);
    a.addEventListener("focus", function () { if (a.matches(":focus-visible")) play(); });
    a.addEventListener("blur", reset);
    a.addEventListener("click", reset);
    if (motion.addEventListener) motion.addEventListener("change", reset);

    // Conserva las posiciones de los glifos de la palabra completa (sin saltos por kerning).
    function alignGlyphs() {
      var range = document.createRange(), offset = 0;
      Array.from(word).forEach(function (c, i) {
        range.setStart(measure.firstChild, offset);
        range.setEnd(measure.firstChild, offset + c.length);
        var rect = range.getBoundingClientRect(), origin = measure.getBoundingClientRect();
        var cell = glyphs.children[i];
        cell.style.left = (rect.left - origin.left) + "px";
        cell.style.width = rect.width + "px";
        offset += c.length;
      });
      range.detach();
    }
    alignGlyphs();
    if (document.fonts) document.fonts.ready.then(alignGlyphs);
    addEventListener("resize", alignGlyphs);
  });

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
  var logos2 = document.querySelector(".logos2"), steps2 = document.querySelector(".steps2"), bento2 = document.querySelector(".bento2"), statEl = document.querySelector(".bento2 .stat"), countEl = statEl && statEl.querySelector(".count"), lastN = -1;
  function bentoOrigins() {
    if (logos2) { var lx = logos2.clientWidth / 2, ly = logos2.clientHeight / 2; [].slice.call(logos2.children).forEach(function (el) { el.style.setProperty("--ox", (el.offsetLeft + el.offsetWidth / 2 - lx).toFixed(0)); el.style.setProperty("--oy", (el.offsetTop + el.offsetHeight / 2 - ly).toFixed(0)); }); }
    if (!bento2) return;
    var cx = bento2.clientWidth / 2, cy = bento2.clientHeight / 2;
    [].slice.call(bento2.children).forEach(function (el) {
      el.style.setProperty("--ox", (el.offsetLeft + el.offsetWidth / 2 - cx).toFixed(0));
      el.style.setProperty("--oy", (el.offsetTop + el.offsetHeight / 2 - cy).toFixed(0));
    });
  }
  if (bento2) [].slice.call(bento2.children).forEach(function (el, i) { el.dataset.lag = [.1, 0, .1, .03, .13][i] || 0; });
  if (logos2) [].slice.call(logos2.children).forEach(function (el, i) { el.dataset.lag = [.06, 0, 0, .06, .06, 0, 0, .06][i] || 0;
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); }); });
  if (steps2) [].slice.call(steps2.children).forEach(function (el, i) { el.dataset.lag = [0, .07, .07, 0][i] || 0; });
  bentoOrigins(); addEventListener("resize", bentoOrigins); addEventListener("load", bentoOrigins);
  if (bento2) [].slice.call(bento2.children).forEach(function (el) {
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); });
  });
  [].slice.call(document.querySelectorAll(".bento2 .zoo .track")).forEach(function (t) { [].slice.call(t.children).forEach(function (el, k) { el.style.setProperty("--n", k % 9); }); });
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
    var ch = Math.min(cw * 1.86, innerHeight * .345);  // misma proporción que la puerta del logo (324×603)
    cw = ch / 1.86;
    ring.style.setProperty("--cw", cw + "px"); ring.style.setProperty("--ch", ch + "px");
    R = ((cw + (small ? 26 : 44)) * N) / (2 * Math.PI);
    PUSH = R * .72;
    mirrors.forEach(function (m, i) { m._b = "rotateY(" + (-i * step) + "deg) translateZ(" + (-R) + "px)"; m.style.transform = m._b; });
  }
  layoutRing(); addEventListener("resize", layoutRing);

  /* reflejo de cada espejo en el suelo: al pasar el ratón por encima tiembla como agua (el agua no se ve, solo se intuye) */
  var svgNS = "http://www.w3.org/2000/svg", rsvg = document.createElementNS(svgNS, "svg");
  rsvg.setAttribute("width", "0"); rsvg.setAttribute("height", "0"); rsvg.setAttribute("aria-hidden", "true"); rsvg.style.position = "absolute";
  var defs = document.createElementNS(svgNS, "defs"); rsvg.appendChild(defs); document.body.appendChild(rsvg);
  mirrors.forEach(function (m, i) {
    var f = document.createElementNS(svgNS, "filter"); f.setAttribute("id", "rip" + i); f.setAttribute("x", "-10%"); f.setAttribute("y", "-10%"); f.setAttribute("width", "120%"); f.setAttribute("height", "120%");
    var tb = document.createElementNS(svgNS, "feTurbulence"); tb.setAttribute("type", "fractalNoise"); tb.setAttribute("baseFrequency", "0.012 0.09"); tb.setAttribute("numOctaves", "2"); tb.setAttribute("seed", String(3 + i)); tb.setAttribute("result", "n");
    var dm = document.createElementNS(svgNS, "feDisplacementMap"); dm.setAttribute("in", "SourceGraphic"); dm.setAttribute("in2", "n"); dm.setAttribute("scale", "0"); dm.setAttribute("xChannelSelector", "R"); dm.setAttribute("yChannelSelector", "G");
    f.appendChild(tb); f.appendChild(dm); defs.appendChild(f);
    var face = m.querySelector(".face"), r = face.cloneNode(true);
    r.classList.add("refl"); r.setAttribute("aria-hidden", "true"); var no = r.querySelector(".no"); if (no) no.remove();
    [].slice.call(r.querySelectorAll("img")).forEach(function (im) { im.alt = ""; im.removeAttribute("loading"); });
    m.appendChild(r); m._r = r; m._tb = tb; m._dm = dm; m._e = 0; m._i = i;
  });
  var lpx = -1, lpy = -1;
  document.querySelector(".hall-stage").addEventListener("pointermove", function (e) {
    var sp = lpx < 0 ? 0 : Math.hypot(e.clientX - lpx, e.clientY - lpy); lpx = e.clientX; lpy = e.clientY;
    if (sp < .5) return;
    mirrors.forEach(function (m) {
      if (+m.style.opacity < .05) return;
      var b = m._r.getBoundingClientRect();
      if (e.clientX > b.left - 12 && e.clientX < b.right + 12 && e.clientY > b.top - 6 && e.clientY < b.bottom + 30) m._e = Math.min(1.6, m._e + Math.min(1, sp / 30) * .45);
    });
  });
  document.querySelector(".hall-stage").addEventListener("pointerleave", function () { lpx = -1; });
  function rippleTick(t) {
    for (var i = 0; i < mirrors.length; i++) {
      var m = mirrors[i];
      if (m._e > .01) {
        m._e *= .955;
        m._dm.setAttribute("scale", (m._e * 26).toFixed(2));
        m._tb.setAttribute("baseFrequency", (0.010 + .003 * Math.sin(t * 1.3 + i)).toFixed(4) + " " + (0.085 + .025 * Math.sin(t * 2.1 + i * 2)).toFixed(4));
        if (!m._on) { m._r.style.filter = "url(#rip" + i + ")"; m._on = true; }
      } else if (m._on) { m._e = 0; m._r.style.filter = ""; m._on = false; }
    }
  }

  /* espejos: fondo de arena en movimiento, líneas finas en blanco y negro (una textura compartida, cada espejo ve su trozo) */
  var SAND = false; // fondo de arena animado en los espejos: desactivado (espejos blancos)
  var dune = document.createElement("canvas"), dg = dune.getContext("2d"), duneW = 0, duneH = 0, faceW = 0, faceH = 0, DPRm = Math.min(devicePixelRatio || 1, 2);
  if (SAND) mirrors.forEach(function (m, i) {
    var c = document.createElement("canvas"); c.className = "sand"; c.setAttribute("aria-hidden", "true");
    m.querySelector(".face").insertBefore(c, m.querySelector(".face").firstChild); m._c = c; m._g = c.getContext("2d"); m._o = (i * 0.618) % 1;
  });
  function sizeSand() {
    if (!SAND) return;
    var r = mirrors[0].getBoundingClientRect(), f = mirrors[0].querySelector(".face");
    faceW = Math.round(f.offsetWidth * DPRm); faceH = Math.round(f.offsetHeight * DPRm);
    duneW = Math.round(faceW * 2.6); duneH = faceH; dune.width = duneW; dune.height = duneH;
    mirrors.forEach(function (m) { m._c.width = faceW; m._c.height = faceH; m._dirty = true; });
  }
  function drawDune(t) {
    var w = duneW, h = duneH, L = 46, P = 90, g = dg;
    var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#1b1b1b"); bg.addColorStop(.45, "#0e0e0e"); bg.addColorStop(1, "#050505");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var glow = g.createRadialGradient(w * .5, h * .38, 0, w * .5, h * .38, h * .7); glow.addColorStop(0, "rgba(255,255,255,.07)"); glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    for (var k = 0; k < L; k++) {
      var q = k / (L - 1), base = h * (.12 + .95 * Math.pow(q, 1.35)), amp = h * (.012 + .03 * q), ph = k * .41;
      g.beginPath();
      for (var s = 0; s <= P; s++) {
        var u = s / P, x = u * w;
        var ridge = Math.sin(u * 2.1 + t * .045 + q * .9) * h * .11 * (1 - q * .4);          // la cresta que ondula despacio
        var y = base + ridge + amp * Math.sin(u * 9 + t * .32 + ph) + amp * .45 * Math.sin(u * 23 - t * .5 + ph * 1.7);
        if (s) g.lineTo(x, y); else g.moveTo(x, y);
      }
      var a = .07 + .3 * Math.pow(1 - Math.abs(q - .42) * 1.4, 2);
      var lg = g.createLinearGradient(0, 0, w, 0), sh = (t * .035 + k * .07) % 1;
      lg.addColorStop(0, "rgba(255,255,255," + (a * .35).toFixed(3) + ")");
      lg.addColorStop(Math.max(.01, Math.min(.99, sh)), "rgba(255,255,255," + Math.min(.75, a * 1.9).toFixed(3) + ")");
      lg.addColorStop(1, "rgba(255,255,255," + (a * .35).toFixed(3) + ")");
      g.strokeStyle = lg; g.lineWidth = (.55 + q * .7) * DPRm; g.stroke();
    }
    var vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, "rgba(0,0,0,.35)"); vg.addColorStop(.25, "rgba(0,0,0,0)"); vg.addColorStop(.8, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.45)");
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }
  function paintSand(m, t) { // cada espejo enseña su trozo de la arena, que además se desliza muy despacio
    var span = duneW - faceW, ox = Math.round((((m._o + t * .006) % 1) + 1) % 1 * span);
    m._g.drawImage(dune, ox, 0, faceW, faceH, 0, 0, faceW, faceH);
  }
  var sandTick = 1;
  sizeSand(); addEventListener("resize", sizeSand); addEventListener("load", sizeSand);
  function setActive(i) {
    if (i === active) return; active = i;
    var d = MODS[i];
    nowIx.textContent = String(i).padStart(2, "0") + " / " + String(N - 1).padStart(2, "0") + (d.fam ? " · " + FAM[d.fam] : "");
    nowNm.textContent = d.n; nowAn.textContent = d.a + (d.live ? " · implantándose en un caso real" : d.s ? " · " + d.s : "");
    dots.forEach(function (x, k) { x.classList.toggle("on", k === i); });
  }

  /* ================= ficha del módulo ================= */
  var MODS = JSON.parse(document.getElementById("mods-data").textContent);
  var FAM = JSON.parse((document.getElementById("fam-data") || { textContent: "{}" }).textContent);
  var sheet = document.querySelector(".sheet"), cur = 0;
  function openSheet(i) {
    cur = (i + N) % N; var d = MODS[cur];
    sheet.querySelector(".pic").innerHTML = d.k === "goat" ? '<img class="inv" src="assets/fauna/goat.png" alt="">' : d.img ? '<img src="' + d.img + '" alt="">' : '<span class="ph">' + d.a + '</span>';
    sheet.querySelector(".fam-k").textContent = d.fam ? "Familia " + String(d.fam).padStart(2, "0") + " · " + FAM[d.fam] : "El corazón de Zoolutions Lab";
    sheet.querySelector(".st").className = "st" + (d.live ? " live" : "");
    sheet.querySelector(".st").textContent = d.live ? "Implantándose en un caso real" : (d.s || "Listo para implantar");
    sheet.querySelector("h3").textContent = d.n;
    var full = sheet.querySelector(".full"); full.textContent = d.full && d.full !== d.n ? d.full : ""; full.style.display = full.textContent ? "" : "none";
    sheet.querySelector(".what").textContent = d.d;
    var has = !!d.uc;
    sheet.querySelector(".blocks").style.display = has ? "" : "none"; sheet.querySelector(".meta").style.display = has ? "" : "none";
    if (has) {
      sheet.querySelector(".uc").textContent = d.uc; sheet.querySelector(".how").textContent = d.how; sheet.querySelector(".eco").textContent = d.eco;
      sheet.querySelector(".secs").innerHTML = d.sec.split(" · ").map(function (s) { return "<span>" + s + "</span>"; }).join("");
    }
    sheet.querySelector(".why b").textContent = "El animal · " + d.a;
    sheet.querySelector(".why p").textContent = d.w;
    sheet.querySelector(".card").scrollTop = 0;
    sheet.querySelector(".fun-tip .ft").textContent = d.c || "";
    sheet.querySelector(".fun").classList.remove("open");
    var more = sheet.querySelector(".more");
    more.classList.remove("show"); more.setAttribute("aria-hidden", "true"); sheet.querySelector(".more-btn").setAttribute("aria-expanded", "false");
    more.querySelector("ol").innerHTML = (d.cx || []).map(function (t, i) { return '<li style="--i:' + i + '"><span>' + String(i + 2).padStart(2, "0") + "</span><p>" + t + "</p></li>"; }).join("");
    sheet.querySelector(".more-btn").style.display = (d.cx && d.cx.length) ? "" : "none";
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false");
    sheet.querySelector(".x").focus({ preventScroll: true });
  }
  function closeSheet() { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); }
  mirrors.forEach(function (m, i) { m.addEventListener("click", function () { openSheet(i); }); });
  document.querySelector(".hall-now .open").addEventListener("click", function () { openSheet(active < 0 ? 0 : active); });
  sheet.querySelector(".x").addEventListener("click", closeSheet);
  var fun = sheet.querySelector(".fun"), funBtn = sheet.querySelector(".fun-btn");
  sheet.querySelector(".more-btn").addEventListener("click", function (e) {
    e.stopPropagation();
    var more = sheet.querySelector(".more"), on = !more.classList.contains("show");
    more.classList.toggle("show", on); more.setAttribute("aria-hidden", String(!on)); this.setAttribute("aria-expanded", String(on));
    fun.classList.remove("open"); funBtn.setAttribute("aria-expanded", "false");
    if (on) setTimeout(function () { var c = sheet.querySelector(".card"); c.scrollTo({ top: c.scrollHeight, behavior: "smooth" }); }, 520);
  });
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
  /* Mirror Hall: el anillo gira solo, despacio, hacia la izquierda. Con dos dedos (trackpad) se mueve a un lado y al otro;
     pinchando y arrastrando se lanza y sigue con inercia hasta volver a su ritmo. La rueda vertical baja la página normal. */
  var hallStage = document.querySelector(".hall-stage"), ringWrap = document.querySelector(".ring-wrap");
  function REST() { return innerHeight * .4; } function XL() { return innerHeight * 1.1; }
  function hallDocked() { var r = hall.getBoundingClientRect(); return r.top <= 2 && -r.top <= REST(); }
  var DRIFT = step / 3.6;          // grados por segundo: un espejo cada ~3,6 s
  var vel = DRIFT, seek = null, startX = 0, dragPid = null, dragging = false, dragMoved = false, lastX = 0, lastT = 0, dragV = 0, holdT = 0;
  function pxPerDeg() { return (mirrors[0].offsetWidth + 44) / step; }
  function nudge(deg) { seek = null; rot += deg; }
  addEventListener("wheel", function (e) {
    if (sheet.classList.contains("open")) return;
    var r = hall.getBoundingClientRect(); if (r.top > innerHeight * .5 || r.bottom < innerHeight * .5) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;          // vertical: la página baja normal
    e.preventDefault();
    var d = e.deltaX * (e.deltaMode === 1 ? 16 : 1);
    nudge(d / pxPerDeg()); vel = Math.max(-step * 4, Math.min(step * 4, d / pxPerDeg() * 12)); holdT = performance.now();
  }, { passive: false });
  ringWrap.addEventListener("pointerdown", function (e) {
    if (e.button !== 0 || sheet.classList.contains("open")) return;
    dragging = true; dragMoved = false; startX = e.clientX; lastX = e.clientX; lastT = performance.now(); dragV = 0; seek = null;
    dragPid = e.pointerId;
  });
  ringWrap.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var now = performance.now(), dx = e.clientX - lastX, dt = Math.max(1, now - lastT) / 1000;
    if (!dragMoved && Math.abs(e.clientX - startX) > 5) { dragMoved = true; try { ringWrap.setPointerCapture(dragPid); } catch (er) {} ringWrap.classList.add("grab"); }
    var deg = -dx / pxPerDeg(); rot += deg;
    dragV = dragV * .6 + (deg / dt) * .4; lastX = e.clientX; lastT = now;
  });
  function endDrag() { if (!dragging) return; dragging = false; ringWrap.classList.remove("grab"); vel = Math.max(-step * 14, Math.min(step * 14, dragV)); holdT = performance.now(); }
  ringWrap.addEventListener("pointerup", endDrag); ringWrap.addEventListener("pointercancel", endDrag);
  ringWrap.addEventListener("click", function (e) { if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; } }, true);
  function seekTo(i) { var cur = rot / step, k = Math.round((cur - i) / N); seek = (i + k * N) * step; }
  addEventListener("keydown", function (e) {
    if (sheet.classList.contains("open") || !hallDocked()) return;
    if (e.key === "ArrowRight") seek = (Math.round(rot / step) + 1) * step;
    if (e.key === "ArrowLeft") seek = (Math.round(rot / step) - 1) * step;
  });
  dots.forEach(function (d, i) { d.addEventListener("click", function () { seekTo(i); }); });
  var skipBtn = document.querySelector(".hall-skip");
  if (skipBtn) skipBtn.addEventListener("click", function () { var t = document.getElementById("proyectos"); if (t) t.scrollIntoView({ behavior: "smooth" }); });
  var ringT = performance.now();
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
      var el = gens[i], grp = el.parentNode && (el.parentNode === bento2 || el.parentNode === steps2 || el.parentNode === logos2) ? el.parentNode : null, inB = !!grp, r = (grp || el).getBoundingClientRect();
      if (r.top > vh * 1.2 || r.bottom < -vh * .2) { el.style.setProperty("--p", 0); continue; }
      var lag = parseFloat(el.dataset.lag || 0);
      if (inB) { // el bento se monta como una sola pieza
        var pin = grp === bento2 ? (vh * .80 - r.top) / (vh * .55) - lag : (vh * .98 - r.top) / (vh * (grp === steps2 ? .42 : grp === logos2 ? .48 : .72)) - lag, pout = (r.bottom - vh * .04) / (vh * .5) - lag;
      } else {
      var pin = (vh - r.top) / (vh * (el.classList.contains("gen-t") ? .32 : .55)) - lag;           // entrando por abajo
      var pout = (r.bottom - vh * .02) / (vh * .45) - lag;  // saliendo por arriba
      }
      var p = Math.max(0, Math.min(1, Math.min(pin, pout)));
      el.style.setProperty("--p", p.toFixed(3));
      if (inB && grp !== steps2) el.style.setProperty("--e", (1 - Math.pow(1 - p, 3)).toFixed(4));
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
      // se ilumina palabra a palabra en un tramo largo de scroll: empieza al entrar por abajo y termina con el texto en el tercio superior
      var r = el.getBoundingClientRect(), ws = el.children, n = ws.length;
      var pin = (vh * .95 - r.top) / (vh * .48), pout = (r.bottom - vh * .08) / (vh * .12);
      var prog = Math.max(0, Math.min(1, Math.min(pin, pout))), soft = 5, pos = prog * (n + soft);
      if (el._p === prog) return; el._p = prog;
      for (var k = 0; k < n; k++) {
        var t = Math.max(0, Math.min(1, (pos - k) / soft)); t = t * t * (3 - 2 * t);
        ws[k].style.opacity = (.14 + .86 * t).toFixed(3);
        ws[k].style.filter = t < 1 ? "blur(" + ((1 - t) * 2.2).toFixed(2) + "px)" : "";
      }
    });

    if (statEl) { var sp = parseFloat(statEl.style.getPropertyValue("--p")) || 0, nv = Math.round((+countEl.dataset.to || 16) * Math.min(1, Math.max(0, (sp - .25) / .65))); if (nv !== lastN) { countEl.textContent = nv; lastN = nv; } }
    // mirror hall: el anillo gira con el scroll y se para en cada espejo
    var hr = hall.getBoundingClientRect(), xl = XL();
    var ex = Math.max(0, Math.min(1, (-hr.top - REST()) / xl)); // salida: las cartas giran y se van
    ring.classList.toggle("out", ex > 0);
    hallNow.style.opacity = hallHead.style.opacity = dotsBox.style.opacity = (1 - Math.max(0, Math.min(1, (ex - .15) * 3))).toFixed(3);
    hallNow.style.pointerEvents = ex > .3 ? "none" : "";
    if (skipBtn) { skipBtn.style.opacity = hallNow.style.opacity; skipBtn.style.pointerEvents = hallNow.style.pointerEvents; }
    var nowR = performance.now(), dtR = Math.min(.05, (nowR - ringT) / 1000); ringT = nowR;
    if (!dragging) {
      if (seek !== null) { rot += (seek - rot) * (reduce ? 1 : .12); if (Math.abs(seek - rot) < .05) { rot = seek; seek = null; vel = DRIFT; } }
      else {
        var paused = sheet.classList.contains("open") || reduce;
        var target = paused ? 0 : DRIFT;
        if (nowR - holdT > 120) vel += (target - vel) * (1 - Math.exp(-dtR * 1.6)); // la inercia se apaga y vuelve a su ritmo
        rot += vel * dtR;
      }
    }
    rippleTick(nowR / 1000);
    ring.style.transform = "translateZ(" + (R - PUSH) + "px) rotateY(" + rot + "deg)";
    setActive(((Math.round(rot / step) % N) + N) % N);
    var sandOn = SAND && hr.bottom > 0 && hr.top < vh, tS = nowR / 1000;
    if (sandOn && (sandTick = (sandTick + 1) % 2) === 0) drawDune(reduce ? 0 : tS); // la arena va lenta: basta con 30 fps
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
      if (sandOn && sandTick === 0 && op > .01) paintSand(mm, tS);
    }
  }
  requestAnimationFrame(frame);
})();
