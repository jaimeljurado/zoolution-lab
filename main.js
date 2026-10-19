(function () {
  "use strict";
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); } }
  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><";
  const rnd = () => CH[Math.floor(Math.random() * CH.length)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Texto que aparece "descifrándose" (ScrambleIn)
  function scrambleIn(el, delay) {
    const text = el.textContent; el.setAttribute("aria-label", text); el.textContent = " ";
    if (reduce) { el.textContent = text; return; }
    setTimeout(() => {
      let p = 0;
      const id = setInterval(() => {
        p += 0.5; const n = Math.floor(p); let out = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === " ") out += " ";
          else if (i < n) out += c;
          else if (i < n + 3) out += rnd();
        }
        el.textContent = out || " ";
        if (n >= text.length) { el.textContent = text; clearInterval(id); }
      }, 25);
    }, delay);
  }
  // Texto que se descifra al pasar el ratón (ScrambleText)
  function hoverScramble(el, text, host) {
    let id = null;
    host.addEventListener("mouseenter", () => {
      if (reduce) return; clearInterval(id); let f = 0;
      id = setInterval(() => {
        f++; const n = Math.floor(f / 4); let out = "";
        for (let i = 0; i < text.length; i++) out += text[i] === " " ? " " : (i < n ? text[i] : rnd());
        el.textContent = out; if (n >= text.length) { el.textContent = text; clearInterval(id); }
      }, 25);
    });
    host.addEventListener("mouseleave", () => { clearInterval(id); el.textContent = text; });
  }
  function initScramble() {
    $$("[data-scramble-in]").forEach(el => scrambleIn(el, 800 + parseInt(el.dataset.delay || "0", 10) * 0 + parseInt(el.dataset.delay || "0", 10)));
    $$("[data-scramble]").forEach(a => hoverScramble(a, a.textContent, a));
    $$("[data-scramble-host]").forEach(h => { const l = $(".scr-label", h); if (l) hoverScramble(l, l.dataset.scrambleText || l.textContent, h); });
  }

  // Entrada: a los 800 ms aparece todo el contenido de la portada y la barra
  function initEntrance() {
    setTimeout(() => { $$(".fade-in-on").forEach(e => e.classList.add("in")); $("#topbar") && $("#topbar").classList.add("in"); }, 800);
  }

  // Menú: píldora que se expande
  function initMenu() {
    const pill = $("#menu-pill"), btn = $("#hamb"), left = $(".tb-left");
    if (!pill || !btn) return;
    const set = o => { pill.classList.toggle("open", o); left.classList.toggle("menu-open", o); document.body.classList.toggle("menu-open", o); btn.setAttribute("aria-expanded", String(o)); btn.setAttribute("aria-label", o ? "Cerrar menú" : "Abrir menú"); };
    btn.addEventListener("click", e => { e.stopPropagation(); set(!pill.classList.contains("open")); });
    document.addEventListener("click", e => { if (!e.target.closest("#menu-pill")) set(false); });
    addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  }

  // Vídeo de portada: se mueve con el ratón (de lado a lado). En táctil se reproduce solo.
  function initScrub() {
    const v = $("video[data-scrub]");
    if (!v) return;
    const coarse = matchMedia("(pointer: coarse)").matches;
    if (coarse || reduce) { v.setAttribute("autoplay", ""); const p = v.play(); p && p.catch && p.catch(() => {}); return; }
    v.pause();
    let target = 0, seeking = false, ready = false, last = null;
    const apply = () => { if (!ready || seeking) return; if (Math.abs(v.currentTime - target) < 0.01) return; seeking = true; v.currentTime = target; };
    v.addEventListener("loadedmetadata", () => { ready = true; target = 0; });
    v.addEventListener("seeked", () => { seeking = false; apply(); });
    addEventListener("mousemove", e => {
      if (last === null) { last = e.clientX; return; }
      const dx = e.clientX - last; last = e.clientX;
      if (!ready || !v.duration) return;
      target = Math.max(0, Math.min(v.duration - 0.05, target + (dx / innerWidth) * v.duration * 0.8));
      apply();
    }, { passive: true });
    v.load();
  }
  // Vídeos de las secciones: solo se reproducen cuando se ven
  function initLazyVideos() {
    const vs = $$("video[data-lazy]");
    if (!("IntersectionObserver" in window)) { vs.forEach(v => { const p = v.play(); p && p.catch && p.catch(() => {}); }); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { const v = en.target; if (en.isIntersecting) { const p = v.play(); p && p.catch && p.catch(() => {}); } else v.pause(); }), { threshold: 0.1 });
    vs.forEach(v => io.observe(v));
  }

  // Texto cinematográfico en 3D que sube con el scroll
  function initCine() {
    const sec = $(".cine"), t = $("#cine-text");
    if (!sec || !t) return;
    if (reduce) { t.style.opacity = 1; t.style.transform = "none"; return; }
    let cur = 0;
    function tick() {
      const r = sec.getBoundingClientRect(), vh = innerHeight;
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
      cur += (p - cur) * 0.08;
      const y = 60 + (-120 - 60) * cur;
      const o = Math.max(0, Math.min(1, (cur - 0.3) / 0.2));
      t.style.transform = "rotateX(24deg) translateY(" + y.toFixed(1) + "px) translateZ(15px)";
      t.style.opacity = o.toFixed(3);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Aparición al hacer scroll
  function initReveal() {
    const els = $$(".rv, .reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } }), { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(el => el.classList.add("is-visible")), 8000);
  }

  // Formulario de contacto → abre el correo ya escrito
  function initForm() {
    const f = $("#contact-form"); if (!f) return;
    const q = new URLSearchParams(location.search).get("email"); if (q && f.elements.email) f.elements.email.value = q;
    f.addEventListener("submit", e => {
      e.preventDefault();
      const d = new FormData(f), g = k => (d.get(k) || "").toString().trim();
      if (!g("nombre") || !g("mensaje")) { f.querySelector(!g("nombre") ? "[name=nombre]" : "[name=mensaje]").focus(); return; }
      const asunto = "Contacto web · " + g("nombre") + (g("empresa") ? " (" + g("empresa") + ")" : "");
      const cuerpo = "Nombre: " + g("nombre") + "\nEmail: " + (g("email") || "-") + "\nEmpresa: " + (g("empresa") || "-") + "\nMe interesa: " + (g("interes") || "-") + "\n\n" + g("mensaje");
      location.href = "mailto:central@zoolutionslab.com?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    });
  }

  // Ajusta el rótulo de fondo para que quepa siempre en pantalla
  function initWatermark() {
    const els = $$(".watermark"); if (!els.length) return;
    const fit = () => els.forEach(el => {
      el.style.fontSize = ""; let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
      const s = el.firstElementChild || el;
      while (s.getBoundingClientRect().width > innerWidth * 0.94 && fs > 40 && n++ < 60) { fs *= 0.94; el.style.fontSize = fs + "px"; }
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);
    addEventListener("resize", fit);
  }

  function initScrolled() {
    const f = () => document.body.classList.toggle("scrolled", scrollY > 60);
    addEventListener("scroll", f, { passive: true }); f();
  }

  function boot() {
    [initEntrance, initScrolled, initWatermark, initScramble, initMenu, initScrub, initLazyVideos, initCine, initReveal, initForm].forEach(f => safe(f, f.name));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
