(function () {
  "use strict";
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); } }

  // 1-2. Entradas: cada elemento marca .is-in al terminar; si no hay animaciones, se fuerza
  function initAppear() {
    const els = $$(".appear, .hero-photo");
    els.forEach(el => el.addEventListener("animationend", () => el.classList.add("is-in"), { once: true }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const anyRunning = els.some(el => el.getAnimations && el.getAnimations().some(a => a.playState === "running" || a.playState === "finished"));
      if (!anyRunning) els.forEach(el => el.classList.add("is-in"));
    }));
  }

  // 3-5. Menú móvil
  function initMenu() {
    const btn = $(".burger"), nav = $("#site-nav"), body = document.body;
    if (!btn || !nav || btn.dataset.ready) return;
    btn.dataset.ready = "1";
    const set = open => {
      body.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    };
    btn.addEventListener("click", () => set(!body.classList.contains("menu-open")));
    $$("a", nav).forEach(a => a.addEventListener("click", () => set(false)));
    $(".menu-backdrop") && $(".menu-backdrop").addEventListener("click", () => set(false));
    addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    const mq = matchMedia("(min-width: 901px)");
    (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(e => { if (e.matches) set(false); });
  }

  // Aparición suave del contenido de las páginas interiores (con red de seguridad)
  function initReveal() {
    const els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-visible")); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    }), { threshold: 0.05 });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(el => el.classList.add("is-visible")), 6000);
  }

  // Vídeo de fondo: reanuda si el navegador lo pausa
  function initVideo() {
    const v = $(".hero-photo video");
    if (!v) return;
    const p = v.play && v.play(); if (p && p.catch) p.catch(() => {});
  }

  // Formulario de contacto → abre el correo con el mensaje ya escrito
  function initForm() {
    const f = $("#contact-form");
    if (!f || f.dataset.ready) return;
    f.dataset.ready = "1";
    f.addEventListener("submit", e => {
      e.preventDefault();
      const d = new FormData(f);
      const nombre = (d.get("nombre") || "").toString().trim();
      const empresa = (d.get("empresa") || "").toString().trim();
      const interes = (d.get("interes") || "").toString().trim();
      const mensaje = (d.get("mensaje") || "").toString().trim();
      if (!nombre || !mensaje) { f.querySelector(!nombre ? "[name=nombre]" : "[name=mensaje]").focus(); return; }
      const asunto = "Contacto web · " + nombre + (empresa ? " (" + empresa + ")" : "");
      const cuerpo = "Nombre: " + nombre + "\nEmpresa: " + (empresa || "-") + "\nMe interesa: " + (interes || "-") + "\n\n" + mensaje;
      location.href = "mailto:central@zoolutionslab.com?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    });
  }

  function boot() {
    safe(initAppear, "initAppear");
    safe(initMenu, "initMenu");
    safe(initReveal, "initReveal");
    safe(initVideo, "initVideo");
    safe(initForm, "initForm");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
