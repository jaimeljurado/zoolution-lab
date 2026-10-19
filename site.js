(function () {
  document.documentElement.classList.add("js");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Vídeo de fondo en bucle (si el navegador bloquea el autoplay, queda la imagen fija)
  var v = document.getElementById("bg");
  if (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); }
    else {
      var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
      play();
      document.addEventListener("visibilitychange", function () { if (document.hidden) v.pause(); else play(); });
    }
  }

  // Menú móvil
  var burger = document.getElementById("burger");
  if (burger) {
    var set = function (o) { document.body.classList.toggle("menu-open", o); burger.setAttribute("aria-expanded", String(o)); burger.setAttribute("aria-label", o ? "Cerrar menú" : "Abrir menú"); };
    burger.addEventListener("click", function () { set(!document.body.classList.contains("menu-open")); });
    document.querySelectorAll(".drawer a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  }

  // Aparición suave al hacer scroll
  var els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 0.07 + "s"; io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add("in"); }); }

  // Formulario de contacto: prepara el correo a central@zoolutionslab.com
  var f = document.getElementById("contact-form");
  if (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var g = function (n) { var x = f.elements[n]; return x ? x.value.trim() : ""; };
      if (!g("nombre") || !g("mensaje")) { f.querySelector(".form-note").textContent = "Pon al menos tu nombre y qué te gustaría resolver."; return; }
      var body = "Nombre: " + g("nombre") + "\nEmpresa: " + g("empresa") + "\nEmail: " + g("email") + "\nMe interesa: " + g("interes") + "\n\n" + g("mensaje");
      location.href = "mailto:central@zoolutionslab.com?subject=" + encodeURIComponent("Contacto web — " + g("nombre")) + "&body=" + encodeURIComponent(body);
      f.querySelector(".form-note").textContent = "Se ha abierto tu correo con el mensaje listo para enviar.";
    });
  }
})();
