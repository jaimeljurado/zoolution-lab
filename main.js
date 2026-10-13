(function () {
  "use strict";
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); } }

  // Menú móvil
  function initMenu() {
    const btn = $(".burger"), body = document.body;
    if (!btn) return;
    const set = o => { body.classList.toggle("menu-open", o); btn.setAttribute("aria-expanded", String(o)); };
    btn.addEventListener("click", e => { e.stopPropagation(); set(!body.classList.contains("menu-open")); });
    $$(".nav-links a").forEach(a => a.addEventListener("click", () => set(false)));
    document.addEventListener("click", e => { if (!e.target.closest(".nav")) set(false); });
    addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  }

  // Aparición al hacer scroll (con red de seguridad)
  function initReveal() {
    const els = $$(".rv, .reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } }), { threshold: 0.08, rootMargin: "0px 0px -60px 0px" });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(el => el.classList.add("is-visible")), 7000);
  }

  // Vídeo de portada: entra con fundido y hace bucle con fundido a negro (como el prompt)
  function fade(v, to, ms) {
    const from = parseFloat(v.style.opacity || "0"), t0 = performance.now();
    cancelAnimationFrame(v._raf);
    (function step(t) { const k = Math.min(1, (t - t0) / ms); v.style.opacity = String(from + (to - from) * k); if (k < 1) v._raf = requestAnimationFrame(step); })(t0);
  }
  function initHeroVideo() {
    $$("video[data-fade]").forEach(v => {
      let fadingOut = false;
      v.addEventListener("canplay", () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); fade(v, 1, 500); }, { once: true });
      v.addEventListener("timeupdate", () => { if (v.duration && v.duration - v.currentTime <= 0.55 && !fadingOut) { fadingOut = true; fade(v, 0, 500); } });
      v.addEventListener("ended", () => { v.style.opacity = "0"; setTimeout(() => { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); fadingOut = false; fade(v, 1, 500); }, 100); });
      v.removeAttribute("loop");
      v.load();
    });
  }
  // Vídeos de secciones: solo se reproducen cuando se ven
  function initLazyVideos() {
    const vs = $$("video[data-lazy]");
    if (!("IntersectionObserver" in window)) { vs.forEach(v => { const p = v.play(); p && p.catch && p.catch(() => {}); }); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { const p = v.play(); p && p.catch && p.catch(() => {}); } else v.pause();
    }), { threshold: 0.15 });
    vs.forEach(v => io.observe(v));
  }

  // Formulario de contacto → abre el correo con el mensaje ya escrito (y recoge el email de la portada)
  function initForm() {
    const f = $("#contact-form");
    if (!f) return;
    const q = new URLSearchParams(location.search).get("email");
    if (q && f.elements.email) f.elements.email.value = q;
    f.addEventListener("submit", e => {
      e.preventDefault();
      const d = new FormData(f), g = k => (d.get(k) || "").toString().trim();
      if (!g("nombre") || !g("mensaje")) { f.querySelector(!g("nombre") ? "[name=nombre]" : "[name=mensaje]").focus(); return; }
      const asunto = "Contacto web · " + g("nombre") + (g("empresa") ? " (" + g("empresa") + ")" : "");
      const cuerpo = "Nombre: " + g("nombre") + "\nEmail: " + (g("email") || "-") + "\nEmpresa: " + (g("empresa") || "-") + "\nMe interesa: " + (g("interes") || "-") + "\n\n" + g("mensaje");
      location.href = "mailto:central@zoolutionslab.com?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    });
  }

  function boot() {
    safe(initMenu, "menu"); safe(initReveal, "reveal"); safe(initHeroVideo, "hero"); safe(initLazyVideos, "lazy"); safe(initForm, "form");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
