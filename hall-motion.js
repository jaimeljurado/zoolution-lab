/* Mirror Hall: scroll reversible y pilotos articulados de cinco segundos. */
(function () {
 'use strict';
 const hall=document.querySelector('.motion-hall'); if(!hall)return;
 const viewport=hall.querySelector('.scene-viewport'), cards=Array.from(hall.querySelectorAll('.scene-card'));
 const counter=hall.querySelector('.scene-counter'), progressBar=hall.querySelector('.scene-progress>span');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 let stride=400, range=1, width=0,height=0,cardW=0,cardH=0,shown=0,raf=0,drag=null,suppressClick=false,onScreen=false,lastActive=-1;
 const models=[];
 function layout(){
  width=innerWidth; height=hall.querySelector('.hall-stage').clientHeight;
  stride=Math.max(260,Math.min(480,height*.58));range=(cards.length+.35)*stride;
  hall.style.setProperty('--hall-height',(range+height)+'px');
  const mobile=width<=760;
  cardH=Math.min(mobile?height*.43:height*.47,mobile?350:460);cardW=cardH*.72;
  hall.style.setProperty('--card-w',cardW+'px');hall.style.setProperty('--card-h',cardH+'px');
  request();
 }
 function sectionTop(){return hall.getBoundingClientRect().top+scrollY;}
 function position(){return clamp((scrollY-sectionTop())/stride,0,cards.length+.35);}
 function jump(i){window.scrollTo({top:sectionTop()+clamp(i,0,cards.length-1)*stride,behavior:reduced.matches?'instant':'smooth'});}
 function request(){if(!raf)raf=requestAnimationFrame(frame);}
 function frame(now){
  raf=0; if(document.hidden)return;
  const rect=hall.getBoundingClientRect();onScreen=rect.top<innerHeight&&rect.bottom>0;
  if(!onScreen)return;
  const target=position();shown=target; // El scroll es la única fuente de posición: también funciona al regresar.
  const mobile=width<=760, spacing=mobile?cardW*.95:width*.185, anchor=mobile?width*.57:width*.76;
  const vh=viewport.clientHeight;
  cards.forEach((card,i)=>{
   const x=mobile?anchor+(shown-i)*spacing:(width*.98)*Math.exp(clamp((shown-i)*.28,-8,3))-width*.22;
   const n=clamp(x/width,0,1.2), scale=mobile?clamp(.82+n*.21,.78,1.05):.40+.64*Math.pow(n,1.1);
   const visible=x>-cardW&&x<width+cardW;
   const y=vh*.55-(n-.5)*vh*.12;
   card.style.transform=`translate3d(${(x-cardW/2).toFixed(2)}px,${(y-cardH/2).toFixed(2)}px,0) rotateY(${-12+n*9}deg) rotateZ(${-1.2+n*.7}deg) scale(${scale})`;
   card.style.opacity=visible?String(clamp(Math.min((x+cardW*.55)/(cardW*.6),(width+cardW*.6-x)/(cardW*.6)),0,1)):0;
   card.style.zIndex=String(100-i);
   card.style.visibility=visible?'visible':'hidden';card.inert=!visible;
   card._visible=visible;card.tabIndex=i===clamp(Math.round(shown),0,cards.length-1)?0:-1;
  });
  const active=clamp(Math.round(shown),0,cards.length-1);
  if(active!==lastActive){counter.innerHTML=String(active+1).padStart(2,'0')+' <span>/ 20</span>';lastActive=active;}
  progressBar.style.transform='scaleX('+clamp(shown/(cards.length-1),0,1)+')';
  models.forEach(m=>{if(m.card._visible)m.draw(reduced.matches?0:((now-m.started)%5000)/1000);});
  if(!reduced.matches&&models.some(m=>m.card._visible))request();
 }
 addEventListener('scroll',request,{passive:true});addEventListener('resize',layout);
 reduced.addEventListener('change',request);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});
 new IntersectionObserver(entries=>{if(entries[0].isIntersecting)request();},{rootMargin:'100px'}).observe(hall);
 // La rueda vertical conserva el scroll normal. El gesto horizontal lo traduce al mismo recorrido.
 hall.addEventListener('wheel',e=>{
  if(document.querySelector('.sheet.open'))return;
  const r=hall.getBoundingClientRect();
  if(r.top>2||r.bottom<innerHeight-2||Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
  const delta=e.deltaX*(e.deltaMode===1?16:1);e.preventDefault();scrollBy({top:delta,behavior:'instant'});
 },{passive:false});
 viewport.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:scrollY,moved:false};suppressClick=false;
 });
 viewport.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)){
   drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');
  }
  if(drag.moved){e.preventDefault();const factor=stride/(width<=760?cardW*.95:width*.185);scrollTo({top:clamp(drag.scroll+dx*factor,sectionTop(),sectionTop()+range),behavior:'instant'});}
 });
 function endDrag(){if(drag?.moved)suppressClick=true;drag=null;viewport.classList.remove('dragging');}
 viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
 viewport.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 viewport.addEventListener('dragstart',e=>e.preventDefault());
 hall.querySelector('.scene-prev').addEventListener('click',()=>jump(Math.round(position())-1));
 hall.querySelector('.scene-next').addEventListener('click',()=>jump(Math.round(position())+1));
 hall.addEventListener('keydown',e=>{
  if(e.target.closest('.hall-skip')||document.querySelector('.sheet.open'))return;
  if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){
   e.preventDefault();jump(e.key==='Home'?0:e.key==='End'?cards.length-1:Math.round(position())+(e.key==='ArrowRight'?1:-1));
  }
 });
 hall.querySelector('.hall-skip').addEventListener('click',()=>{
  const next=document.getElementById('proyectos');next.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
  next.setAttribute('tabindex','-1');next.focus({preventScroll:true});
 });

 // Pilotos: raster original para cuerpo/cabeza y articulaciones vectoriales para las patas.
 function curve(ctx,points,width,color='#000'){
  ctx.beginPath();ctx.moveTo(points[0],points[1]);ctx.bezierCurveTo(...points.slice(2));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
 }
 function limb(ctx,hip,knee,foot,thick,color='#000'){
  ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(...hip);ctx.lineTo(...knee);ctx.lineWidth=thick;ctx.stroke();
  ctx.beginPath();ctx.moveTo(...knee);ctx.lineTo(...foot);ctx.lineWidth=thick*.6;ctx.stroke();
  ctx.beginPath();ctx.ellipse(foot[0]+4,foot[1],9,4,-.13,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
 }
 function ik(hip,foot,l1,l2,side){
  const dx=foot[0]-hip[0],dy=foot[1]-hip[1],dist=clamp(Math.hypot(dx,dy),Math.abs(l1-l2)+.1,l1+l2-.1);
  const a=Math.atan2(dy,dx)+side*Math.acos(clamp((l1*l1+dist*dist-l2*l2)/(2*l1*dist),-1,1));
  return [hip[0]+Math.cos(a)*l1,hip[1]+Math.sin(a)*l1];
 }
 function footAt(phase,anchor,stride,ground,lift,stance=.60){
  const u=((phase%1)+1)%1;
  return u<stance?[anchor+stride*(.5-u/stance),ground]:[anchor+stride*(-.5+(u-stance)/(1-stance)),ground-lift*Math.sin(Math.PI*(u-stance)/(1-stance))];
 }
 function pilot(canvas){
  const key=canvas.dataset.animal,card=canvas.closest('.scene-card'),img=card.querySelector('img');
  const ctx=canvas.getContext('2d'),layer=document.createElement('canvas');layer.width=600;layer.height=400;const g=layer.getContext('2d');
  const model={card,started:performance.now(),draw(t){
   g.clearRect(0,0,600,400);g.fillStyle='#000';
   if(key==='correo'){
    // Ondulación creciente hacia la cola, manteniendo la cabeza estable.
    const phase=t/2.5*Math.PI*2;
    for(let x=0;x<600;x+=2){const wave=22*Math.pow(1-x/600,2)*Math.sin(phase+x/600*4);g.drawImage(img,x,0,Math.min(3,600-x),326,x,34+wave,Math.min(3,600-x),326);}
   }else if(key==='presu'){
    const phase=t,theta=phase*Math.PI*2,bob=6*Math.sin(theta*2),shift=55;
    const legs=[{hip:[283,86],anchor:285,phase:.06,rear:true,far:true},{hip:[432,95],anchor:430,phase:.43,far:true},{hip:[283,86],anchor:290,phase:.18,rear:true},{hip:[432,95],anchor:438,phase:.55}];
    for(const l of legs){const h=[l.hip[0],l.hip[1]+bob+shift],f=footAt(phase+l.phase,l.anchor,110,shift+220,70,.45);const k=ik(h,f,80,78,l.rear?-1:1);limb(g,h,k,f,l.far?18:23);}
    // Cola flexible; el torso y la cabeza se conservan del logo.
    curve(g,[280,shift+59+bob,190,shift+41+bob,100,shift+92+14*Math.sin(theta),22,shift+24+18*Math.sin(theta-.5)],11);
    g.save();g.translate(0,shift+bob);g.beginPath();g.moveTo(245,0);g.lineTo(600,0);g.lineTo(600,108);g.lineTo(481,100);g.bezierCurveTo(449,106,432,140,389,122);g.bezierCurveTo(350,107,335,101,315,115);g.bezierCurveTo(269,118,235,102,245,65);g.closePath();g.clip();g.drawImage(img,0,0,600,233);g.restore();
   }else if(key==='crm'){
    const phase=t/2.5,bob=1.5*Math.sin(phase*Math.PI*4);
    for(const l of [{x:215,p:0,side:-1},{x:415,p:.5,side:1},{x:231,p:.5,side:-1},{x:432,p:0,side:1}]){
     const hip=[l.x,232+bob],f=footAt(phase+l.p,l.x+25,42,335,16,.72),k=ik(hip,f,65,63,l.side);limb(g,hip,k,f,15);
    }
    g.save();g.translate(0,bob);g.beginPath();g.moveTo(0,0);g.lineTo(600,0);g.lineTo(600,245);g.lineTo(465,244);g.lineTo(420,259);g.lineTo(350,247);g.lineTo(285,258);g.lineTo(222,250);g.lineTo(190,253);g.lineTo(150,275);g.lineTo(0,290);g.closePath();g.clip();g.drawImage(img,0,0,600,360);g.restore();
    g.globalCompositeOperation='source-in';const grad=g.createLinearGradient(50,60,560,280),h=t/5*360;
    grad.addColorStop(0,`hsl(${h+135} 80% 30%)`);grad.addColorStop(.5,`hsl(${h+190} 78% 38%)`);grad.addColorStop(1,`hsl(${h+270} 72% 40%)`);g.fillStyle=grad;g.fillRect(0,0,600,400);g.globalCompositeOperation='source-over';
    curve(g,[40,344,230,335,425,348,570,328],4,'#171717');curve(g,[496,337,520,327,529,315,538,307],2,'#171717');
   }
   ctx.clearRect(0,0,800,600);ctx.drawImage(layer,40,60,720,480);
  }};
  const ready=()=>{if(!img.naturalWidth)return;model.draw(0);card.querySelector('.scene-art').classList.add('ready');models.push(model);request();};
  if(img.complete)ready();else img.addEventListener('load',ready,{once:true});
 }
 hall.querySelectorAll('canvas[data-animal]').forEach(pilot);
 layout();
})();
