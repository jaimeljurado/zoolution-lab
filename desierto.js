(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hero = document.querySelector(".hero-stage");
  var desert = document.querySelector(".desert");
  var dv = desert && desert.querySelector("video");
  var playing = false;

  // tarjetas que aparecen al hacer scroll (con pequeño escalonado dentro de cada grupo)
  document.querySelectorAll("[data-stagger]").forEach(function (g) {
    g.querySelectorAll(".pop").forEach(function (el, i) { el.style.setProperty("--i", i % 8); });
  });
  var pops = document.querySelectorAll(".pop");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    pops.forEach(function (el) { io.observe(el); });
  } else pops.forEach(function (el) { el.classList.add("in"); });

  // frases que se van iluminando palabra a palabra, como en Apple
  var leads = [].slice.call(document.querySelectorAll(".lead2"));
  leads.forEach(function (p) {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
  });

  function frame() {
    var y = scrollY, vh = innerHeight, H = hero.offsetHeight;
    // el desierto aparece al dejar la portada y se acerca suavemente
    var vis = Math.max(0, Math.min(1, (y - H * 0.25) / (H * 0.6)));
    desert.style.opacity = vis.toFixed(3);
    var total = Math.max(1, document.documentElement.scrollHeight - vh - H);
    var p = Math.max(0, Math.min(1, (y - H) / total));
    desert.style.setProperty("--dz", (1.12 - p * 0.12).toFixed(4));
    desert.style.setProperty("--dk", (0.18 + Math.sin(p * Math.PI) * 0.12).toFixed(3));
    if (dv) {
      if (vis > 0 && !playing && !reduce) { var q = dv.play(); if (q && q.catch) q.catch(function () {}); playing = true; }
      if (vis === 0 && playing) { dv.pause(); playing = false; }
    }
    document.body.classList.toggle("past", y > H * 0.6);
    leads.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var prog = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.5)));
      var ws = el.children, n = ws.length, lit = Math.round(prog * n);
      for (var i = 0; i < n; i++) ws[i].classList.toggle("lit", i < lit);
    });
  }
  var ticking = false;
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { frame(); ticking = false; }); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
})();
