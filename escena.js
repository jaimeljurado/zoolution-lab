import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Si algún día tenéis un modelo 3D completo de la cabra, basta con sustituir este archivo.
const MODEL_URL = "assets/cabra.glb";

const canvas = document.getElementById("webgl");
const cine = document.querySelector(".cine");
const heroEl = document.querySelector(".hero-stage");
const spaceEl = document.querySelector(".scroll-space");
const loadingEl = document.querySelector(".loading3d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 900px)").matches;

let scene, camera, renderer, modelPivot, sparks;
const clock = new THREE.Clock();
let viewShift = 0, currentScroll = 0, mouseX = 0, mouseY = 0, tMouseX = 0, tMouseY = 0;
let cx = innerWidth / 2, cy = innerHeight / 2, ocx = cx, ocy = cy;
const sizes = { width: innerWidth, height: innerHeight };
const uniforms = { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }, uMouse: { value: new THREE.Vector2() }, uScroll: { value: 0 } };
const sparkCount = small ? 260 : 450, sparkData = [];

// ---------- títulos letra a letra ----------
document.querySelectorAll(".slide-title").forEach(t => {
  let html = "", n = 0;
  t.innerHTML.split(/(<br\s*\/?>)/i).forEach(part => {
    if (/^<br/i.test(part)) { html += part; return; }
    for (const ch of part) html += ch === " " ? " " : `<span class="char" style="transition-delay:${(n++ * 0.035).toFixed(3)}s">${ch}</span>`;
  });
  t.innerHTML = html;
});

// ---------- escena ----------
scene = new THREE.Scene();
scene.background = new THREE.Color("#000000");
scene.fog = new THREE.FogExp2("#000000", 0.01);
camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0.2, 3.0);
scene.add(camera);

renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.shadowMap.enabled = !small;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.2;

// reflejos suaves para que el metal tenga brillo
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environmentIntensity = 0.18;

// fondo: olas de metal líquido, en blanco y negro
(function background() {
  const vertexShader = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
  const fragmentShader = `
    varying vec2 vUv; uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uScroll;
    void main(){
      vec2 uv=(gl_FragCoord.xy-0.5*uResolution.xy)/uResolution.y; float aspect=uResolution.x/uResolution.y;
      float time=uTime*0.08; float scroll=uScroll;
      float angle1=0.6, angle2=-0.7, angle3=1.2; float freq1=2.4, freq2=3.2, freq3=4.0;
      vec2 w=uv; float sd=scroll*5.0;
      w.x+=sin(uv.y*2.5+time*0.2+sd)*0.35; w.y+=cos(uv.x*2.5-time*0.15-sd*0.8)*0.35;
      w.x+=sin(uv.y*1.2-time*0.1-sd*1.5)*0.25; w.y+=cos(uv.x*1.2+time*0.18+sd*1.2)*0.25;
      w+=vec2(scroll*0.04,-scroll*0.02)+vec2(uMouse.x*aspect*0.05,uMouse.y*0.05);
      vec2 d1=vec2(cos(angle1),sin(angle1)), d2=vec2(cos(angle2),sin(angle2)), d3=vec2(cos(angle3),sin(angle3));
      float w1=sin(dot(w,d1)*freq1+time); float w2=cos(dot(w,d2)*freq2-time*1.4+w1*0.4); float w3=sin(dot(w,d3)*freq3+time*1.8+w2*0.5);
      float f=w1*0.50+w2*0.35+w3*0.15;
      float wide=pow(max(0.0,1.0-abs(f-0.1)),2.5); float spec=pow(max(0.0,1.0-abs(f-0.15)),8.0); float crest=wide*0.5+spec*0.9;
      // paleta en grises: plata cálida arriba, grafito al final
      vec3 s0=vec3(0.0006), a0=vec3(0.030), b0=vec3(0.016), c0=vec3(0.17);
      vec3 s1=vec3(0.0005), a1=vec3(0.022), b1=vec3(0.012), c1=vec3(0.14);
      float t=smoothstep(0.0,1.0,scroll);
      vec3 col=mix(s0,s1,t);
      col=mix(col,mix(b0,b1,t),smoothstep(-0.6,0.2,f));
      col=mix(col,mix(a0,a1,t),smoothstep(0.0,0.8,f));
      col+=mix(c0,c1,t)*crest*1.4;
      col*=1.0-dot(uv,uv)*0.12;
      gl_FragColor=vec4(col,1.0);
    }`;
  const mat = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthWrite: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), mat);
  mesh.position.set(0, 0, -8); mesh.renderOrder = -10; camera.add(mesh);
})();

// luces en claroscuro, todas neutras
scene.add(new THREE.AmbientLight("#ffffff", 0.1));
const key = new THREE.SpotLight("#ffffff", 18.0);
key.position.set(4, 6, 3); key.angle = Math.PI / 4; key.penumbra = 0.9; key.castShadow = !small;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 1; key.shadow.camera.far = 15; key.shadow.bias = -0.001;
scene.add(key);
const rim = new THREE.DirectionalLight("#ffffff", 10.0); rim.position.set(-5, 3, -4); scene.add(rim);
const fill = new THREE.DirectionalLight("#ffffff", 0.8); fill.position.set(-2, -4, 2); scene.add(fill);

// chispas blancas y grises
(function makeSparks() {
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const g = c.getContext("2d"), gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.85)"); gr.addColorStop(.6, "rgba(255,255,255,.3)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(sparkCount * 3), col = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    pos[i * 3] = (Math.random() - .5) * 6.5; pos[i * 3 + 1] = (Math.random() - .5) * 5 - .5; pos[i * 3 + 2] = (Math.random() - .5) * 6.5;
    const v = Math.random() < .6 ? 1.0 : .55 + Math.random() * .2;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
    sparkData.push({ sx: (Math.random() - .5) * .4, sy: .15 + Math.random() * .3, sz: (Math.random() - .5) * .4, sw: .5 + Math.random() * 1.5, sr: .05 + Math.random() * .15, ph: Math.random() * Math.PI * 2 });
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: .025, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, map: new THREE.CanvasTexture(c) }));
  scene.add(sparks);
})();

// roca de base, hecha por código
function makeRock() {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 5.1) * Math.cos(v.y * 4.3) * Math.sin(v.z * 6.7) * .22 + Math.sin(v.x * 13 + v.z * 9) * .05 + (Math.random() - .5) * .04;
    v.multiplyScalar(1 + n);
    if (v.y > .25) v.y = .25 + (v.y - .25) * .25; // parte de arriba casi plana para apoyar las patas
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#0c0c0c", roughness: .75, metalness: .45, flatShading: true }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// la cabra
function loadModel() {
  if (loadingEl) loadingEl.classList.add("show");
  new GLTFLoader().load(MODEL_URL, gltf => {
    const goat = gltf.scene;
    goat.traverse(ch => {
      if (ch.isMesh) {
        ch.castShadow = ch.receiveShadow = true;
        const m = ch.material;
        if (m) { m.roughness = .42; m.metalness = .92; m.flatShading = false; m.side = THREE.DoubleSide; if (m.map) { m.map.anisotropy = 16; m.map.colorSpace = THREE.SRGBColorSpace; } m.needsUpdate = true; }
      }
    });
    const group = new THREE.Group();
    group.add(goat);
    // roca bajo las pezuñas
    goat.updateMatrixWorld(true);
    const gb = new THREE.Box3().setFromObject(goat), gs = gb.getSize(new THREE.Vector3());
    const rock = makeRock();
    rock.scale.set(gs.x * .62, gs.y * .16, Math.max(gs.x * .5, .5));
    rock.position.set((gb.min.x + gb.max.x) / 2 + gs.x * .06, gb.min.y - gs.y * .03, 0);
    group.add(rock);

    modelPivot = new THREE.Group(); scene.add(modelPivot); modelPivot.add(group);
    const b0 = new THREE.Box3().setFromObject(group), s0 = b0.getSize(new THREE.Vector3());
    group.scale.setScalar(3.1 / Math.max(s0.x, s0.y, s0.z, .0001));
    group.updateMatrixWorld(true);
    const c1 = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
    group.position.sub(c1);
    modelPivot.position.y = -0.25;
    if (loadingEl) loadingEl.remove();
  }, undefined, err => { console.error("No se pudo cargar la cabra 3D:", err); if (loadingEl) loadingEl.textContent = ""; });
}
loadModel();

// ---------- interacción ----------
const cin = document.querySelector(".cursor-in"), cout = document.querySelector(".cursor-out");
addEventListener("mousemove", e => {
  cx = e.clientX; cy = e.clientY;
  if (cin) { cin.style.left = cx + "px"; cin.style.top = cy + "px"; }
  tMouseX = e.clientX / innerWidth * 2 - 1; tMouseY = e.clientY / innerHeight * 2 - 1;
});
document.querySelectorAll("a, button, input, textarea, select").forEach(el => {
  el.addEventListener("mouseenter", () => { if (cout) { cout.style.width = "56px"; cout.style.height = "56px"; } });
  el.addEventListener("mouseleave", () => { if (cout) { cout.style.width = "40px"; cout.style.height = "40px"; } });
});
addEventListener("resize", () => {
  sizes.width = innerWidth; sizes.height = innerHeight;
  camera.aspect = sizes.width / sizes.height; camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height); uniforms.uResolution.value.set(sizes.width, sizes.height);
});

// progreso de la escena: 0 cuando acaba la portada, 1 al final de la página
function sceneRange() {
  const start = heroEl.offsetHeight, end = document.documentElement.scrollHeight - innerHeight;
  return { start, end };
}
function targetScroll() {
  const { start, end } = sceneRange();
  return Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
}
// navegación a cada parte
const marks = { "#que-hacemos": 0.0, "#manada": 0.36, "#proyectos": 0.58, "#metodo": 0.84, "#contacto": 0.98 };
document.querySelectorAll('a[href^="#"]').forEach(a => {
  const h = a.getAttribute("href");
  if (h === "#inicio") { a.addEventListener("click", e => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }); return; }
  if (!(h in marks)) return;
  a.addEventListener("click", e => {
    e.preventDefault();
    const { start, end } = sceneRange();
    scrollTo({ top: start + (end - start) * marks[h] + 2, behavior: "smooth" });
  });
});
if (location.hash in marks) setTimeout(() => { const { start, end } = sceneRange(); scrollTo(0, start + (end - start) * marks[location.hash] + 2); }, 300);

const slides = [["s1", -0.10, 0.12], ["s2", 0.29, 0.42], ["s3", 0.51, 0.64], ["s4", 0.79, 0.88], ["s5", 0.93, 1.05]];
const manada = document.getElementById("manada");
const dots = [...document.querySelectorAll(".grid-dot")];
const fills = [...document.querySelectorAll(".story-dash i")];

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  const ts = targetScroll();
  currentScroll += (ts - currentScroll) * (reduce ? 1 : 0.025);

  // visibilidad de la escena según lo que queda de portada
  const heroH = heroEl.offsetHeight;
  const vis = Math.max(0, Math.min(1, (scrollY - heroH * .35) / (heroH * .55)));
  canvas.style.opacity = vis.toFixed(3);
  const on = scrollY > heroH * .85;
  cine.classList.toggle("on", on);
  document.body.classList.toggle("on-3d", on);
  document.body.classList.toggle("past", scrollY > heroH * .6);
  ocx += (cx - ocx) * .2; ocy += (cy - ocy) * .2;
  if (cout) { cout.style.left = ocx + "px"; cout.style.top = ocy + "px"; }
  if (vis <= 0) return; // la portada tapa la escena: no gastamos en dibujar

  mouseX += (tMouseX - mouseX) * .05; mouseY += (tMouseY - mouseY) * .05;
  if (modelPivot) { modelPivot.rotation.y = mouseX * .25; modelPivot.rotation.x = mouseY * .15; }

  if (sparks) {
    const p = sparks.geometry.attributes.position.array, time = clock.getElapsedTime();
    const vel = Math.abs(ts - currentScroll), mul = 1 + vel * 9, turb = vel * .8;
    for (let i = 0; i < sparkCount; i++) {
      const k = i * 3, d = sparkData[i];
      p[k] += d.sx * dt * mul; p[k + 1] += d.sy * dt * mul; p[k + 2] += d.sz * dt * mul;
      const sw = d.sr * (1 + turb * 4);
      p[k] += Math.sin(time * d.sw + d.ph) * sw * dt; p[k + 2] += Math.cos(time * d.sw + d.ph) * sw * dt;
      if (p[k + 1] > 3 || Math.abs(p[k]) > 3.5 || Math.abs(p[k + 2]) > 3.5) { p[k + 1] = -2.5; p[k] = (Math.random() - .5) * 3; p[k + 2] = (Math.random() - .5) * 3; }
    }
    sparks.geometry.attributes.position.needsUpdate = true;
  }

  // la cámara da una vuelta completa a la cabra
  const phi = currentScroll * Math.PI * 2 - 0.45 * Math.sin(currentScroll * Math.PI * 4); // pasa rápido por los perfiles y se recrea de frente y de espaldas
  const y = .35 + Math.sin(currentScroll * Math.PI) * .8;
  const r = 4.2 - Math.sin(currentScroll * Math.PI) * .6;
  const look = new THREE.Vector3(0, -.15, 0);
  // desplaza el encuadre para que la cabra quede al lado contrario del texto
  const sc = currentScroll;
  const want = small ? 0 : (sc < .2 ? .2 : sc < .47 ? 0.02 : sc < .7 ? .2 : sc < .9 ? -.2 : .2);
  viewShift += (want - viewShift) * (reduce ? 1 : .04);
  camera.setViewOffset(sizes.width, sizes.height, -viewShift * sizes.width, 0, sizes.width, sizes.height);
  camera.position.lerp(new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi)), reduce ? 1 : .025);
  camera.lookAt(look);

  uniforms.uTime.value = clock.getElapsedTime();
  uniforms.uMouse.value.set(mouseX, -mouseY);
  uniforms.uScroll.value = currentScroll;

  // textos
  slides.forEach(([id, a, b]) => {
    const act = currentScroll >= a && currentScroll <= b;
    document.getElementById(id).classList.toggle("active", act);
    if (id === "s2" && manada) manada.classList.toggle("active", act);
  });
  fills.forEach((f, i) => { const n = fills.length, s = i / n, e = (i + 1) / n; f.style.height = Math.max(0, Math.min(1, (currentScroll - s) / (e - s))) * 100 + "%"; });
  dots.forEach((d, i) => { const st = (i * 17) % 80 + 10; let sp = 90 + (i * 55) % 180; if (i % 2 === 0) sp = -sp; let yy = st + currentScroll * sp; yy = ((yy % 100) + 100) % 100; d.style.top = yy + "%"; });

  renderer.render(scene, camera);
}
animate();
