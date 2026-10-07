(function () {
  "use strict";

  const data = window.__BRAND__ || {};
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  function safe(fn, name) {
    try { const r = fn(); return r === undefined ? true : r; }
    catch (e) { console.warn("[" + name + "] failed:", e); return false; }
  }

  // Enlaces de contacto desde el manifest (el HTML ya trae el email hardcodeado)
  function initContact() {
    const mail = data.contact && data.contact.email;
    if (!mail) return;
    $$("[data-mail]").forEach(a => { a.href = "mailto:" + mail; });
  }

  // Escena animada: mar, puerta, cabra y niebla (canvas 2D, un único rAF)
  function initScene() {
    if ($("#scene").dataset.ready) return;
    $("#scene").dataset.ready = "1";
    const cv=document.getElementById('scene'),ctx=cv.getContext('2d');
    let W,H,dpr,L,up,upx,rocks,glow,fogS,grain,grainPat,fog=[],sparks=[],t=0,last=0;

    function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}}
    const R=Math.random;

    function layout(){
      dpr=Math.min(window.devicePixelRatio||1,2);
      W=Math.floor(innerWidth*dpr);H=Math.floor(innerHeight*dpr);
      cv.width=W;cv.height=H;
      const mobile=innerWidth/innerHeight<0.8;
      const hz=Math.floor(H*(mobile?0.80:0.73));
      let dh=H*(mobile?0.30:0.51),dw=dh*0.38;
      if(dw>W*0.3){dw=W*0.3;dh=dw/0.38}
      L={hz,dh,dw,cx:W/2,dx:W/2-dw/2,dy:hz-dh};
      up=document.createElement('canvas');up.width=W;up.height=hz+2;upx=up.getContext('2d');
      buildRocks();buildGlow();
      if(!fogS)buildFog();
      if(!grain)buildGrain();
      fog=[];for(let i=0;i<70;i++)fog.push(newFog(true));
      sparks=[];for(let i=0;i<110;i++)sparks.push(newSpark(true));
    }

    function buildRocks(){
      const{hz,cx,dw,dh}=L,r=rng(11);
      rocks=document.createElement('canvas');rocks.width=W;rocks.height=up.height;
      const c=rocks.getContext('2d');c.fillStyle='#fff';
      for(const side of[-1,1]){
        let x=cx+side*dw*0.42;
        while(side<0?x>-W*0.15:x<W*1.15){
          const far=Math.min(1,Math.abs(x-cx)/(W*0.5));
          const rx=(0.6+r()*0.8)*dh*0.22,ry=(0.55+r()*0.55)*dh*0.19*(1-far*0.25);
          c.beginPath();c.ellipse(x+side*rx*0.6,hz+ry*0.28,rx,ry,(r()-0.5)*0.15,0,Math.PI*2);c.fill();
          x+=side*rx*(0.8+r()*0.6);
        }
      }
      c.globalCompositeOperation='source-in';
      const g=c.createRadialGradient(cx,hz,0,cx,hz,W*0.55);
      g.addColorStop(0,'rgb(125,130,140)');g.addColorStop(0.2,'rgb(60,63,70)');g.addColorStop(1,'rgb(10,11,13)');
      c.fillStyle=g;c.fillRect(0,0,W,rocks.height);
      c.globalCompositeOperation='source-atop';
      const v=c.createLinearGradient(0,hz-dh*0.22,0,hz);
      v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.6)');
      c.fillStyle=v;c.fillRect(0,0,W,rocks.height);
      c.globalCompositeOperation='source-over';
      const y0=Math.max(0,Math.floor(hz-dh*0.3)),h=rocks.height-y0;
      const id=c.getImageData(0,y0,W,h),d=id.data;
      for(let i=0;i<d.length;i+=4){
        if(!d[i+3])continue;
        const k=R(),m=k<0.45?0.1+k:(k>0.975?2.4:0.85+k*0.45);
        d[i]=Math.min(255,d[i]*m);d[i+1]=Math.min(255,d[i+1]*m);d[i+2]=Math.min(255,d[i+2]*m);
      }
      c.putImageData(id,0,y0);
    }

    function buildGlow(){
      const{dw,dh}=L,pad=Math.ceil(dh*0.8);
      glow=document.createElement('canvas');glow.width=Math.ceil(dw)+pad*2;glow.height=Math.ceil(dh)+pad*2;glow.pad=pad;
      const c=glow.getContext('2d');c.shadowColor='rgba(215,228,255,1)';
      for(const[b,a]of[[dh*0.55,0.22],[dh*0.22,0.45],[dh*0.05,0.9]]){c.shadowBlur=b;c.fillStyle=`rgba(255,255,255,${a})`;c.fillRect(pad,pad,dw,dh)}
      c.shadowBlur=0;c.fillStyle='#f5f5f4';c.fillRect(pad,pad,dw,dh);
    }

    function buildFog(){
      fogS=document.createElement('canvas');fogS.width=fogS.height=192;
      const c=fogS.getContext('2d'),g=c.createRadialGradient(96,96,0,96,96,96);
      g.addColorStop(0,'rgba(215,222,235,1)');g.addColorStop(0.5,'rgba(200,210,225,.45)');g.addColorStop(1,'rgba(200,210,225,0)');
      c.fillStyle=g;c.fillRect(0,0,192,192);
      const id=c.getImageData(0,0,192,192),d=id.data;
      for(let i=3;i<d.length;i+=4)d[i]*=0.25+R()*0.75;
      c.putImageData(id,0,0);
    }

    function buildGrain(){
      grain=document.createElement('canvas');grain.width=grain.height=256;
      const c=grain.getContext('2d'),id=c.createImageData(256,256);
      for(let i=0;i<id.data.length;i+=4){const v=R()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}
      c.putImageData(id,0,0);grainPat=null;
    }

    function newFog(init){
      const{cx,dw,dh,hz}=L,side=R()<0.5?-1:1,life=9+R()*9;
      return{x:cx+side*dw*(0.3+R()*0.25),y:hz-dh*(0.02+R()*0.13),
        vx:side*dh*(0.035+R()*0.085),vy:-dh*(0.002+R()*0.006),
        s0:dw*(0.4+R()*0.4),s1:dw*(1.6+R()*1.6),age:init?R()*life:0,life,a:0.035+R()*0.05};
    }
    function newSpark(init){
      const{cx,dw,hz}=L,g=(R()+R()+R()-1.5)/1.5,dn=Math.pow(R(),0.8);
      return{x:cx+g*dw*(0.6+dn*0.5),dn,y:hz+dn*(H-hz),w:dw*(0.015+R()*0.06)*(0.6+dn),life:0.4+R()*0.9,age:init?R()*1.3:0};
    }

    function goat(c,cx,fy,s,ph){
      const bob=-Math.abs(Math.sin(ph))*1.4,sway=Math.sin(ph)*0.9;
      c.save();c.translate(cx+sway*s,fy);c.scale(s,s);
      c.fillStyle=c.strokeStyle='#040404';c.lineCap='round';c.lineJoin='round';
      // patas: traseras (detrás) y delanteras
      for(const[lx,base,o,wd]of[[-8.5,-2.2,0,2.4],[8.5,-2.2,Math.PI,2.4],[-4.8,0,Math.PI,2.9],[4.8,0,0,2.9]]){
        const k=Math.sin(ph+o),lift=Math.max(0,k)*5.5,top=-40+bob,foot=base-lift+Math.min(0,k)*-0.8;
        const kn=lx+Math.sign(lx)*0.7*Math.max(0,k),my=(top+foot)/2;
        c.beginPath();c.moveTo(lx-wd,top);c.lineTo(lx+wd,top);
        c.quadraticCurveTo(kn+wd*0.9,my,lx+wd*0.6,foot);c.lineTo(lx-wd*0.6,foot);
        c.quadraticCurveTo(kn-wd*0.9,my,lx-wd,top);c.fill();
      }
      c.translate(0,bob);
      // cuerpo
      c.beginPath();c.ellipse(0,-40,13,6.5,0,0,Math.PI*2);c.fill();
      c.beginPath();c.moveTo(-4,-80);
      c.bezierCurveTo(-8,-74,-15,-67,-15.5,-57);c.bezierCurveTo(-16,-47,-13.5,-40,-10,-35);
      c.lineTo(10,-35);c.bezierCurveTo(13.5,-40,16,-47,15.5,-57);c.bezierCurveTo(15,-67,8,-74,4,-80);
      c.closePath();c.fill();
      // cabeza
      c.translate(0,Math.sin(ph*2+0.6)*0.6);
      c.beginPath();c.moveTo(-5.5,-90);c.quadraticCurveTo(0,-92.5,5.5,-90);
      c.quadraticCurveTo(5,-82,3,-76.5);c.quadraticCurveTo(0,-74.5,-3,-76.5);
      c.quadraticCurveTo(-5,-82,-5.5,-90);c.fill();
      c.beginPath();c.ellipse(-8.6,-86.5,4.3,1.6,0.28,0,Math.PI*2);c.fill();
      c.beginPath();c.ellipse(8.6,-86.5,4.3,1.6,-0.28,0,Math.PI*2);c.fill();
      // cuernos
      for(const sd of[-1,1]){
        c.lineWidth=2.6;c.beginPath();c.moveTo(sd*2.5,-90.5);c.bezierCurveTo(sd*6,-99.5,sd*14,-101.5,sd*20,-96.5);c.stroke();
        c.lineWidth=1.5;c.beginPath();c.moveTo(sd*19.5,-96.8);c.quadraticCurveTo(sd*22.3,-94.6,sd*22.6,-92);c.stroke();
      }
      c.restore();
    }

    function frame(now){if(!L)return;
      const dt=Math.min(0.05,(now-last)/1000||0.016);last=now;t+=dt;
      const{hz,dh,dw,cx,dx,dy}=L,breathe=0.94+0.06*Math.sin(t*0.9),ph=t*4.2;
      const gs=dh*0.28/101,gy=hz+dh*0.027;

      // ---- escena superior (se usa también para el reflejo)
      const u=upx;u.globalCompositeOperation='source-over';u.globalAlpha=1;
      u.fillStyle='#000';u.fillRect(0,0,W,up.height);
      let g=u.createRadialGradient(cx,hz-dh*0.5,0,cx,hz-dh*0.5,dh*1.35);
      g.addColorStop(0,`rgba(170,190,225,${0.14*breathe})`);g.addColorStop(1,'rgba(170,190,225,0)');
      u.fillStyle=g;u.fillRect(0,0,W,up.height);
      u.save();u.translate(cx,hz);u.scale(1,0.12);
      g=u.createRadialGradient(0,0,0,0,0,W*0.45);
      g.addColorStop(0,`rgba(165,190,230,${0.4*breathe})`);g.addColorStop(1,'rgba(165,190,230,0)');
      u.fillStyle=g;u.fillRect(-W,-W,W*2,W*2);u.restore();
      u.drawImage(rocks,0,0);
      u.globalAlpha=breathe;u.drawImage(glow,dx-glow.pad,dy-glow.pad);u.globalAlpha=1;
      goat(u,cx,gy,gs,ph);
      u.globalCompositeOperation='lighter';
      for(const f of fog){
        f.age+=dt;if(f.age>f.life)Object.assign(f,newFog(false));
        const p=f.age/f.life,x=f.x+f.vx*f.age,y=f.y+f.vy*f.age,s=f.s0+(f.s1-f.s0)*p;
        const a=f.a*Math.sin(Math.PI*p)*Math.max(0.12,1-Math.abs(x-cx)/(W*0.5)*0.9);
        if(a<0.002)continue;u.globalAlpha=a;u.drawImage(fogS,x-s*1.1,y-s*0.35,s*2.2,s*0.7);
      }
      u.globalAlpha=1;u.globalCompositeOperation='source-over';

      // ---- composición
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.drawImage(up,0,0,W,hz,0,0,W,hz);
      const wh=H-hz;
      g=ctx.createLinearGradient(0,hz,0,H);g.addColorStop(0,'rgb(4,10,20)');g.addColorStop(1,'rgb(5,14,28)');
      ctx.fillStyle=g;ctx.fillRect(0,hz,W,wh);

      // agua: reflejo ondulado fila a fila
      const step=Math.max(1,Math.round(2*dpr));
      for(let y=hz;y<H;y+=step){
        const d=y-hz,dn=d/wh,sy=hz-1-d*0.85;if(sy<1)break;
        const dd=d/dpr,amp=(0.6+dn*7)*dpr;
        const off=Math.sin(dd*0.09-t*1.6)*amp+Math.sin(dd*0.031+t*0.9)*amp*1.4;
        const sh=0.5+0.5*Math.sin(dd*0.16+t*1.7+Math.sin(dd*0.05-t*0.6)*2);
        const e=dn*0.18;
        ctx.globalAlpha=(0.5+0.4*sh)*(1-dn*0.25);
        ctx.drawImage(up,0,sy,W,1,cx-cx*(1+e)+off,y,W*(1+e),step);
      }
      ctx.globalAlpha=1;
      ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgb(140,170,210)';ctx.fillRect(0,hz,W,wh);
      ctx.globalCompositeOperation='screen';
      ctx.save();ctx.translate(cx,hz);ctx.scale(1,0.5);
      g=ctx.createRadialGradient(0,0,0,0,0,W*0.5);
      g.addColorStop(0,'rgba(35,75,125,.45)');g.addColorStop(0.5,'rgba(20,45,80,.22)');g.addColorStop(1,'rgba(20,40,70,0)');
      ctx.fillStyle=g;ctx.fillRect(-W,0,W*2,wh*2.2);ctx.restore();

      // destellos en el agua
      ctx.globalCompositeOperation='lighter';ctx.fillStyle='#fff';
      for(const s of sparks){
        s.age+=dt;if(s.age>s.life)Object.assign(s,newSpark(false));
        const a=Math.sin(Math.PI*s.age/s.life)*0.55*(1-s.dn*0.3);if(a<=0)continue;
        const sw=Math.sin(s.y/dpr*0.09-t*1.6)*(0.6+s.dn*7)*dpr;
        ctx.globalAlpha=a;ctx.fillRect(s.x+sw-s.w/2,s.y,s.w,Math.max(1,dpr*(1+s.dn)));
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';

      // patas de la cabra sobre el agua
      ctx.save();ctx.beginPath();ctx.rect(0,hz,W,wh);ctx.clip();goat(ctx,cx,gy,gs,ph);ctx.restore();

      // viñeta + grano
      g=ctx.createRadialGradient(cx,H*0.55,H*0.2,cx,H*0.55,Math.max(W,H)*0.85);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.75)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      if(!grainPat)grainPat=ctx.createPattern(grain,'repeat');
      const ox=(R()*256)|0,oy=(R()*256)|0;
      ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=0.12;ctx.translate(ox,oy);
      ctx.fillStyle=grainPat;ctx.fillRect(-ox,-oy,W,H);ctx.restore();

    }
    function loop(n){if(safe(()=>{frame(n);return true},'frame')===false)cv.style.display='none';else requestAnimationFrame(loop)}

    let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>safe(layout,'layout'),150)});
    if(cv.getContext&&safe(()=>{layout();return true},'layout'))requestAnimationFrame(loop);
    else cv.style.display='none';
  }

  // Menú móvil
  function initMenu() {
    const btn = $("#burger"), menu = $("#menu"), root = document.documentElement;
    if (!btn || !menu || btn.dataset.ready) return;
    btn.dataset.ready = "1";
    const set = open => {
      root.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", !open);
    };
    btn.addEventListener("click", () => set(!root.classList.contains("is-open")));
    $$("a", menu).forEach(a => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    addEventListener("resize", () => { if (innerWidth > 640) set(false); });
  }

  // Vídeo HD renderizado en Blender. Si no se puede reproducir, se usa la escena en código.
  function initVideo() {
    const v = $("#heroVideo");
    if (!v || v.dataset.ready) return;
    v.dataset.ready = "1";
    const fallback = () => {
      if (document.documentElement.classList.contains("no-video")) return;
      document.documentElement.classList.add("no-video");
      safe(initScene, "initScene");
    };
    const fuentes = $$("source", v);
    let fallos = 0;
    fuentes.forEach(s => s.addEventListener("error", () => { if (++fallos >= fuentes.length) fallback(); }));
    v.addEventListener("error", fallback);
    if (!v.canPlayType("video/webm") && !v.canPlayType("video/mp4")) fallback();
    const p = v.play && v.play(); if (p && p.catch) p.catch(() => {});
  }

  function boot() {
    safe(initVideo, "initVideo");
    safe(initContact, "initContact");
    safe(initMenu, "initMenu");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
