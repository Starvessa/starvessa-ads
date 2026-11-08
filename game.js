// Copyright © 2026 Starvessa Games. All rights reserved.
// Heaven's Flight — endless flight through the golden gates. Tap to flap. Your high score is everything.
const _img=s=>{const i=new Image();i.src=s;return i};
const ART={bg:_img("assets/heaven_bg.webp")}; // angel body + wing come from the texture atlas (GFX)
// Sprite anchors (pixels in the source images)
const A={bodyW:520,chest:[303,128],shoulder:[296,95],wingW:420,wingRoot:[408,213]};
const GATE_W=78;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const GAME={
 id:"heavensflight", title:"Heaven's Flight", tagline:"Soar through the golden gates", leaderboard:"CgkIjejZyKoZEAIQAQ",
 music:{tempo:112,key:392,lead:"triangle",
  chords:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]],
  melody:[0,4,7,12,11,7,9,null, 5,9,12,14,12,9,7,null, 7,11,14,16,14,11,12,null, 12,11,9,7,4,2,0,null]},
 ranks:[{at:0,name:"Rising Angel"},{at:10,name:"Winged Angel"},{at:25,name:"Guardian Angel"},{at:50,name:"Archangel"},{at:100,name:"Keeper of the Golden Gates"},{at:200,name:"Crowned Angel of Heaven"}],
 giftArt:{3:"assets/gift3.webp",7:"assets/gift7.webp",30:"assets/gift30.webp"},
 version:"1.0.3",
 patchNotes:[
  {v:"1.0.0",date:"Launch day",title:"Welcome to Heaven's Flight!",notes:[
   ["🪽","Tap to flap your wings and fly through the golden gates. Every gate you pass gives you 1 point."],
   ["👼","Climb 6 angel ranks, from Rising Angel all the way up to Crowned Angel of Heaven."],
   ["🔥","Play every day to build a streak. Tap the calendar to see your green check marks and the prizes waiting for you."],
   ["😇","Grab glowing power-ups in the gates: Halo Shield, Gentle Breeze, Double Blessing and Wish Storm."],
   ["🧰","Fill the treasure chest meter as you play. Chests hold Lucky Continues, shields and 5 rare sparkle trails."],
   ["🎯","Three new daily missions every day. Finish all three for a bonus chest."],
   ["📖","Unlock a new chapter of Seraphina's Journal with every rank. Rank-ups also give a Legendary Chest."],
   ["🎁","Get free Lucky Continues on every 3rd and 7th day, plus special Dawn Streak and Eternal Flame wings."],
   ["💬","Tell us what you think. Tap Feedback on the main screen to share ideas or report a problem."]]}
 ],
 shieldName:"Halo Shield", maxShield:3,
 powerups:[{id:"shield",at:0,icon:"😇",name:"Halo Shield",desc:"Each halo protects you from one hit. Halos stack up to 3!"},
  {id:"slow",at:10,icon:"🪶",name:"Gentle Breeze",desc:"Heaven slows down for 6 seconds so you can glide through."},
  {id:"double",at:25,icon:"✨",name:"Double Blessing",desc:"Every gate is worth 2 points for 8 seconds."},
  {id:"magnet",at:50,icon:"🌟",name:"Wish Storm",desc:"A shower of wish stars: +5 bonus points instantly!"}],
 chestGoal:120, chestPer:1, chestArt:"assets/gift7.webp", chestArtL:"assets/gift30.webp",
 trailLabel:"Sparkle trails",
 trails:[{name:"Golden",swatch:"#ffe27a",c:()=>"#ffe27a"},{name:"Rose Petals",swatch:"#ff9ec7",c:i=>i%2?"#ff9ec7":"#ffd1e3"},
  {name:"Starlight",swatch:"#bfe6ff",c:i=>i%3?"#cfeeff":"#ffffff"},{name:"Emerald Grace",swatch:"#6dffb0",c:i=>i%2?"#6dffb0":"#d4ffe8"},
  {name:"Heavenly Fire",swatch:"#ff8a3c",c:i=>`hsl(${10+i%35},100%,60%)`},{name:"Rainbow",swatch:"linear-gradient(90deg,#f66,#fd6,#6f9,#6cf,#c6f)",c:(i,t)=>`hsl(${(t*240+i*37)%360},100%,70%)`}],
 missions:[{k:"gates",goal:30,t:"Pass # golden gates"},{k:"runs",goal:5,t:"Play # flights"},{k:"pu",goal:3,t:"Collect # power-ups"},
  {k:"score",max:true,goal:b=>Math.max(5,Math.round(b*.6)),t:"Score # in a single flight"},{k:"gates",goal:60,t:"Pass # golden gates"},
  {k:"saves",goal:1,t:"Get saved by a Halo Shield # time"},{k:"double",goal:10,t:"Earn # points with Double Blessing",need:25},{k:"slow",goal:2,t:"Catch # Gentle Breezes",need:10}],
 storyTitle:"Seraphina's Journal",
 story:[
  {t:"The First Wish",p:["Far above the clouds, every wish made on Earth becomes a tiny golden light. Most float up to heaven on their own. But some get lost in the wind.","Seraphina was the youngest angel in the Garden of Dawn when she caught her very first lost wish: a little girl hoping her puppy would come home. “I'll carry you through the golden gates,” she whispered. And she did."]},
  {t:"Wings of Courage",p:["The gates of heaven open and close like breathing. Only an angel with steady wings can slip through.","At first Seraphina bumped every gate. Then the old Archangel Aurelio told her: “Don't fight the sky, little one. Find its rhythm.” Tap, glide, tap, glide. The gates began to welcome her."]},
  {t:"The Guardian's Promise",p:["Word spread through the clouds about the small angel who never gave up. Wishes began following her like fireflies.","Seraphina made a promise that night: no wish would ever be left behind again, no matter how far she had to fly."]},
  {t:"Light of the Archangels",p:["The Archangels welcomed Seraphina to the Hall of Light, where every returned wish glows forever in the ceiling like a star.","She looked up and gasped. Thousands of lights. Every single one was a wish she had carried home."]},
  {t:"Keeper of the Gates",p:["When a great storm scattered a million wishes across the sky, the gates began to dim. Only a Keeper could hold them open.","Seraphina flew through the storm for seven days and seven nights. When the sun finally rose, the gates shone brighter than ever, and they had a new Keeper."]},
  {t:"The Crown of Heaven",p:["On the highest cloud, the angels gathered in a shimmering circle. They placed a crown of pure starlight on Seraphina's head.","“You gave every lost wish a way home,” they said. Seraphina smiled, spread her wings, and flew back into the sky. There were still more wishes to carry, and she wouldn't have it any other way."]}],
 skinLabel:"Wings",
 skins:[{name:"Classic",at:0,swatch:"#fff6d8",f:"none"},{name:"Rose",at:10,swatch:"#ffc0d8",f:"hue-rotate(-40deg) saturate(1.4)"},
  {name:"Silver",at:25,swatch:"#e6ecf5",f:"saturate(0.1) brightness(1.1)"},{name:"Sunfire",at:50,swatch:"#ffb347",f:"saturate(2.2) brightness(1.05)"},
  {name:"Dawn Streak",at:1e9,streak:7,swatch:"#ffd27a",f:"sepia(.4) saturate(2) hue-rotate(-10deg) brightness(1.1)"},{name:"Eternal Flame",at:1e9,streak:30,swatch:"#ff7a3c",f:"saturate(3) hue-rotate(-25deg) brightness(1.05)"},
  {name:"Celestial",at:1e9,premium:true,swatch:"#8fd3ff",f:"hue-rotate(170deg) saturate(1.8)"},{name:"Radiant",at:1e9,premium:true,swatch:"#e0b3ff",f:"hue-rotate(230deg) saturate(1.6) brightness(1.1)"}],
 tips:[
  {art:"assets/tut_angel.webp",anim:"flap",title:"Spread Your Wings!",text:"Tap anywhere to flap. Every tap lifts Seraphina higher into the golden sky. Stop tapping and she drifts down, so find your rhythm!",pc:"On a PC: click or press Space"},
  {art:"✨",anim:"glow",title:"Soar Through the Golden Gates",text:"Glide through the shining opening in each gate. Every gate carries a lost wish home and earns you <b>+1 point</b>. Don't touch the gates!"},
  {art:"👑",anim:"float",title:"Rise Through Heaven",text:"The sky never ends, and it speeds up the longer you fly. Beat your best score to rise from <b>Rising Angel</b> all the way to <b>Crowned Angel of Heaven</b> and unlock dazzling new wings."},
  {art:"😇",anim:"glow",title:"Grab Heavenly Power-ups",text:"Glowing orbs float inside some gates. Fly through them for a <b>Halo Shield</b>, a <b>Gentle Breeze</b>, <b>Double Blessing</b> points and more. New power-ups unlock as your rank grows!"},
  {art:"assets/gift7.webp",anim:"bounce",title:"Heavenly Gifts Await",text:"Every point fills your <b>treasure chest</b>, and daily <b>missions</b> fill it faster. Open chests for Lucky Continues, shields and rare sparkle trails. Rank up for a <b>Legendary Chest</b> and a new chapter of Seraphina's story!"}],
 tutStart:"Spread your wings!",
 keyHelp:"Click or press Space (or the Up arrow) to flap. Press Esc to pause and M to turn sound on or off.",
 lore:{hero:"Seraphina",bio:"Seraphina is a young guardian angel who carries lost wishes home through the golden gates of Heaven. Every gate she passes lights a new star in the sky.",
  systems:"Gravity pulls you down and each flap lifts you up. Gates slowly get closer and faster as your score grows, but the gap never gets smaller than a comfortable limit, so every gate is always passable. Your best score is saved on this device and to Google Play Games leaderboards."},
 touchControls:false,
 newRun(){ return {y:350,vy:0,x:0,dist:0,gates:[],nextGate:520,flapT:0,parts:[],pops:[],combo:0,inv:0,crashT:0,pus:[],gn:0,nextPU:5+Math.floor(Math.random()*4),shield:false,slow:0,dbl:0} },
 k(){ return H/700 },
 diff(r){ return clamp(r.score/80,0,1) },
 press(){ const r=Run; if(!r||r.over||paused)return; r.vy=-470; r.flapT=1; Sfx.flap(); Platform.haptic() },
 spawn(r){ const d=this.diff(r), prev=r.gates.length?r.gates[r.gates.length-1].c:350, gap=230-55*d;
  let c=150+Math.random()*400; c=clamp(c,prev-170,prev+170); c=clamp(c,60+gap/2,640-gap/2);
  r.gates.push({x:r.nextGate,c,gap,passed:false,ph:Math.random()*6}); if(++r.gn>=r.nextPU){ const id=pickPU(r); if(id)r.pus.push({x:r.nextGate+GATE_W/2,y:c,id,got:false}); r.nextPU=r.gn+7+Math.floor(Math.random()*6) } r.nextGate+=clamp(340-50*d,290,340) },
 step(r,dt){ const d=this.diff(r), speed=(190+80*d)*(r.slow>0?.62:1); r.t+=dt; r.slow=Math.max(0,r.slow-dt); r.dbl=Math.max(0,r.dbl-dt); r.dist+=speed*dt; r.inv=Math.max(0,r.inv-dt);
  r.vy=Math.min(r.vy+1500*dt,650); r.y+=r.vy*dt; r.flapT=Math.max(0,r.flapT-dt*3.2);
  if(r.y<20){r.y=20;r.vy=Math.max(0,r.vy)}
  while(r.nextGate<r.dist+W/this.k()+200) this.spawn(r);
  r.gates=r.gates.filter(g=>g.x>r.dist-600);
  const px=r.dist; // angel world x
  for(const g of r.gates){ const gx=g.x;
   if(!g.passed&&gx+GATE_W<px-10){ g.passed=true; const pts=r.dbl>0?2:1; r.score+=pts; stat("gates"); if(pts>1)stat("double",2); r.combo++; Sfx.sparkle(W*.3,r.combo); Platform.haptic("success");
    this.burst(r,px,r.y,40,"gold"); r.pops.push({x:px,y:r.y-40,t:1,s:"+"+pts});
    if(r.score===S.best+1&&S.best>0){r.msg="NEW BEST!";Sfx.best();setTimeout(()=>r.msg="",1800)} }
   if(r.inv<=0&&px+20>gx&&px-20<gx+GATE_W&&(r.y-18<g.c-g.gap/2||r.y+18>g.c+g.gap/2)) { if(this.saved(r))continue; return this.crash(r,"You touched a gate") } }
  for(const u of r.pus) if(!u.got&&Math.abs(u.x-px)<42&&Math.abs(u.y-r.y)<46) this.grab(r,u);
  r.pus=r.pus.filter(u=>!u.got&&u.x>r.dist-300);
  if(r.y>668){ if(this.saved(r)){r.vy=-620;r.y=660} else return this.crash(r,"You fell into the clouds") }
  // sparkle trail
  if(Math.random()<.7) r.parts.push({x:px-30,y:r.y+10+Math.random()*16,vx:-40-Math.random()*40,vy:-10+Math.random()*30,l:1,s:1+Math.random()*2.5,c:"trail",i:Math.random()*100|0});
  this.tickParts(r,dt) },
 stepOver(r,dt){ r.crashT+=dt; r.vy=Math.min(r.vy+1500*dt,700); r.y=Math.min(680,r.y+r.vy*dt); this.tickParts(r,dt) },
 tickParts(r,dt){ for(const p of r.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt*1.4} r.parts=r.parts.filter(p=>p.l>0).slice(-300);
  for(const p of r.pops){p.y-=40*dt;p.t-=dt} r.pops=r.pops.filter(p=>p.t>0) },
 burst(r,x,y,n,c){ for(let i=0;i<n;i++){const a=Math.random()*6.28,s=60+Math.random()*260;r.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,s:1.5+Math.random()*3,c})} },
 saved(r){ if(!r.shield)return false; r.shield--; r.inv=1.3; stat("saves"); this.burst(r,r.dist,r.y,70,"white"); r.pops.push({x:r.dist,y:r.y-50,t:1.4,s:"HALO SAVED YOU!"}); Sfx.best(); Platform.haptic("success"); return true },
 grab(r,u){ u.got=true; const P=GAME.powerups.find(p=>p.id===u.id); stat("pu"); Sfx.sparkle(W*.3,4); Platform.haptic("success"); this.burst(r,u.x,u.y,50,"gold");
  if(u.id==="shield")r.shield=Math.min(GAME.maxShield,(r.shield|0)+1); if(u.id==="slow"){r.slow=6;stat("slow")} if(u.id==="double")r.dbl=8; if(u.id==="magnet"){r.score+=5;for(let i=0;i<5;i++)setTimeout(()=>Sfx.sparkle(W*.3,i+2),i*90)}
  r.pops.push({x:u.x,y:u.y-40,t:1.5,s:P.icon+" "+P.name.toUpperCase()+(u.id==="magnet"?" +5":"")}) },
 effects(r){ const o=[]; if(r.shield)o.push(`<span class="fx">😇 Halo${r.shield>1?" x"+r.shield:""}</span>`); if(r.slow>0)o.push(`<span class="fx">🪶 ${Math.ceil(r.slow)}s</span>`); if(r.dbl>0)o.push(`<span class="fx">✨ x2 ${Math.ceil(r.dbl)}s</span>`); return o },
 crash(r,why){ r.combo=0; this.burst(r,r.dist,r.y,60,"white"); r.vy=-200; gameOver(why) },
 revive(r){ r.gates=r.gates.filter(g=>g.x>r.dist+500); r.y=350; r.vy=-200; r.inv=2.5; r.nextGate=Math.max(r.nextGate,r.dist+500) },
 info(r){ const d=this.diff(r); return `Speed ${Math.round(190+80*d)} · Gap ${Math.round(230-55*d)} · Difficulty ${Math.round(d*100)}%` },
 // ---------- Drawing ----------
 drawBg(scroll){ bgLayer(()=>this.sky(scroll)) },
 sky(scroll){ const b=ART.bg; if(!(b.complete&&b.naturalWidth)){ const g=cx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#8fc8ff");g.addColorStop(1,"#fff1c9");cx.fillStyle=g;cx.fillRect(0,0,W,H); return }
  const t=livingBg(b,scroll,.15), k=this.k(); cx.save(); cx.globalCompositeOperation="lighter";
  // shimmering god rays from the palace
  for(let i=0;i<6;i++){ const a=-.5+i*.22+Math.sin(t*.3+i)*.05, al=.05+.04*Math.sin(t*.8+i*1.7); cx.save(); cx.translate(W*.8,-H*.1); cx.rotate(a+1.57);
   const g=cx.createLinearGradient(0,0,H*1.4,0); g.addColorStop(0,`rgba(255,240,190,${al*2})`); g.addColorStop(1,"rgba(255,240,190,0)"); cx.fillStyle=g; cx.beginPath(); cx.moveTo(0,0); cx.lineTo(H*1.4,-60*k); cx.lineTo(H*1.4,60*k); cx.fill(); cx.restore() }
  // rising golden motes at three depths (parallax)
  for(let i=0;i<45;i++){ const d=1+i%3, x=((i*173-scroll*.1*d)%W+W)%W, y=H-((t*12*d+i*97)%(H*1.1)), s=(.8+d*.7)*k; cx.globalAlpha=.35+.35*Math.sin(t*2+i); cx.fillStyle="#fff2b0"; cx.beginPath(); cx.arc(x+Math.sin(t+i)*8,y,s,0,7); cx.fill() }
  cx.restore();
  // drifting mist layers: far (slow) and near (fast) for depth
  for(const [sp,yy,al,sz] of [[.25,.55,.22,160],[.5,.72,.28,220]]) for(let i=0;i<7;i++){ const span=W+600, x=((i*330-scroll*sp-t*15*sp*4)%span+span)%span-300, y=H*yy+Math.sin(t*.4+i)*14*k, r=sz*k;
   GFX.glow(cx,x,y,r,"255,255,255",al) } },
 clouds(scroll,t,alpha=.95){ const k=this.k(); for(let i=0;i<14;i++){ const span=W+400, x=((i*260-scroll*.6)%span+span)%span-200, y=H-40*k-(i%3)*18*k;
   const r=(90+(i*37)%70)*k; GFX.glow(cx,x,y,r,"255,250,240",alpha) } },
 gate(sx,g,t){ const k=this.k(), w=GATE_W*k, top=(g.c-g.gap/2)*k, bot=(g.c+g.gap/2)*k;
  // Baked lighting: each gate half (gold gradient + glow shadow) is painted ONCE into a bitmap and reused,
  // instead of recalculating gradients and blur shadows for every gate on every frame.
  const pad=30*k, Hc=Math.ceil(H+pad*2+40*k);
  const bake=dir=>GFX.baked("gate"+dir,w+pad*2,Hc,(c)=>{ const x0=pad;
   const metal=c.createLinearGradient(x0,0,x0+w,0); metal.addColorStop(0,"#8a5a00");metal.addColorStop(.25,"#ffe28a");metal.addColorStop(.5,"#fff6d0");metal.addColorStop(.7,"#e0a82e");metal.addColorStop(1,"#7a4a00");
   const y0=dir<0?0:pad, y1=dir<0?Hc-pad:Hc; c.shadowColor="rgba(255,210,80,.9)"; c.shadowBlur=18*k;
   c.fillStyle=metal; c.fillRect(x0,y0,w*.16,y1-y0); c.fillRect(x0+w*.84,y0,w*.16,y1-y0);
   for(let i=1;i<6;i++) c.fillRect(x0+w*(.16+i*.68/6)-2*k,y0,4*k,y1-y0);
   const ey=dir<0?y1:y0; c.fillRect(x0-6*k,ey-(dir<0?22*k:0),w+12*k,22*k);
   c.strokeStyle="#fff2b0";c.lineWidth=3*k;c.beginPath();c.arc(x0+w/2,ey+(dir<0?-22*k:22*k),w*.42,dir<0?Math.PI:0,dir<0?0:Math.PI,dir<0);c.stroke();
   for(let i=0;i<5;i++){const x=x0+w*(.1+i*.2);c.fillStyle="#fff3b8";c.beginPath();c.moveTo(x-5*k,ey);c.lineTo(x,ey+dir*14*k*-1);c.lineTo(x+5*k,ey);c.fill()}
   c.shadowBlur=0; c.fillStyle="rgba(255,255,255,.35)";c.fillRect(x0+w*.18,y0,w*.05,y1-y0) });
  { const b1=bake(-1), b2=bake(1); cx.drawImage(b1,sx-pad,top-(Hc-pad),b1.cw,b1.ch); cx.drawImage(b2,sx-pad,bot-pad,b2.cw,b2.ch) }
  // soft heavenly light in the opening
  const lg=cx.createLinearGradient(0,top,0,bot); lg.addColorStop(0,"rgba(255,240,180,0)");lg.addColorStop(.5,`rgba(255,250,220,${.18+.08*Math.sin(t*3+g.ph)})`);lg.addColorStop(1,"rgba(255,240,180,0)");
  cx.fillStyle=lg; cx.fillRect(sx,top,w,bot-top) },
 angel(x,y,vy,flap,t,scale){ const k=this.k()*scale, bs=130*k/A.bodyW, ws=112*k/A.wingW, tilt=clamp(vy*.0011,-.45,.75);
  const sk=GAME.skins[S.skin]||GAME.skins[0];
  // Wingbeat phase: a quick, full beat right after each tap, then a slow gliding flutter.
  const now=performance.now()/1000, dt=Math.min(.05,now-(this._lt||now)); this._lt=now;
  this._ph=(this._ph||0)+dt*(2.2+flap*16);
  const ph=this._ph, c=Math.cos(ph), amp=.35+flap*.75;
  const wingAng=-c*amp+.05;           // shoulder: up (c>0) / down (c<0)
  const down=Math.sin(ph)>0;          // wing sweeping downward
  cx.save(); cx.translate(x,y); cx.rotate(tilt);
  GFX.glow(cx,0,0,80*k,"255,240,170",.45);
  const sh=[(A.shoulder[0]-A.chest[0])*bs,(A.shoulder[1]-A.chest[1])*bs];
  // Flexible wing: 14 linked strips from shoulder to tip. Each joint bends with a time delay,
  // so a wave rolls out to the feather tips. On the upstroke the wing folds in (shorter strips)
  // like a real bird; on the downstroke it spreads wide and the tips trail behind.
  // LOD: full 14-joint wing up close, 7 joints when the angel is drawn small (menus, far away).
  const N=130*k>90?14:7, rootX=A.wingRoot[0], seg=rootX/N, fw=GFX.frame("wing"), ih=fw.h, lv=GFX.level("wing",A.wingW*ws);
  const wing=(dx,dy,ang,alpha,br,off)=>{ if(!GFX.ready)return; cx.save(); cx.translate(sh[0]+dx*k,sh[1]+dy*k); cx.rotate(ang); cx.globalAlpha*=alpha;
   const tf=(sk.f!=="none"?sk.f+" ":"")+(br?`brightness(${br})`:""), ry=A.wingRoot[1]*ws;
   GFX.draw(cx,"wing",rootX,0,A.wingW-rootX,ih,0,-ry,(A.wingW-rootX)*ws+1,ih*ws,tf||"none",lv);
   const fold=1-.22*Math.max(0,-Math.sin(ph+off))*(0.4+flap);
   for(let i=0;i<N;i++){ const u=(i+1)/N, w=seg*ws*(1-(1-fold)*u);
    cx.rotate(Math.sin(ph+off-1.1-u*2.2)*amp*.11*(.4+u)*(14/N));
    GFX.draw(cx,"wing",rootX-(i+1)*seg,0,seg+.5,ih,-w,-ry,w+1.5,ih*ws,tf||"none",lv); cx.translate(-w,0) }
   cx.restore() };
  wing(10,-2,wingAng*.85-.12,.9,.72,.35); // far wing
  { const fb=GFX.frame("angel"); GFX.draw(cx,"angel",0,0,fb.w,fb.h,-A.chest[0]*bs,-A.chest[1]*bs,A.bodyW*bs,fb.h*bs,"none") }
  wing(-4,2,wingAng,1,0,0); // near wing
  cx.restore() },
 parts(r,camX){ const k=this.k(); cx.save(); cx.globalCompositeOperation="lighter";
  for(const p of r.parts){ const sx=W*.3+(p.x-camX)*k, sy=p.y*k; cx.globalAlpha=Math.max(0,p.l);
   if(p.c==="trail"&&S.trail>0){ cx.globalCompositeOperation="source-over"; cx.fillStyle=GAME.trails[S.trail].c(p.i,r.t); cx.shadowColor=cx.fillStyle; cx.shadowBlur=6*k; cx.beginPath(); cx.arc(sx,sy,p.s*1.35*k,0,7); cx.fill(); cx.shadowBlur=0; cx.fillStyle="rgba(255,255,255,.7)"; cx.beginPath(); cx.arc(sx,sy,p.s*.45*k,0,7); cx.fill(); cx.globalCompositeOperation="lighter"; continue }
   cx.fillStyle=p.c==="trail"||p.c==="gold"?"#ffe27a":"#ffffff";
   cx.beginPath(); cx.arc(sx,sy,p.s*k,0,7); cx.fill(); if(p.s>2.5){cx.fillRect(sx-p.s*2*k,sy-.5,p.s*4*k,1);cx.fillRect(sx-.5,sy-p.s*2*k,1,p.s*4*k)} }
  cx.restore();
  cx.font=`900 ${28*k}px system-ui`; cx.textAlign="center"; for(const p of r.pops){cx.globalAlpha=p.t;cx.fillStyle="#fff";cx.strokeStyle="#b07800";cx.lineWidth=4;const sx=W*.3+(p.x-camX)*k;cx.strokeText(p.s,sx,p.y*k);cx.fillText(p.s,sx,p.y*k)} cx.globalAlpha=1 },
 draw(r){ const k=this.k(), camX=r.dist; this.drawBg(camX*k);
  for(const g of r.gates){ const sx=W*.3+(g.x-camX)*k; if(sx>-GATE_W*k&&sx<W+20) this.gate(sx,g,r.t) }
  // best-score marker: a glowing banner on the gate that would beat your record
  if(S.best>0&&r.score<=S.best){ const g=r.gates.filter(g=>!g.passed)[S.best-r.score]; if(g){ const sx=W*.3+(g.x-camX)*k; cx.fillStyle="#ff6fae";cx.font=`900 ${16*k}px system-ui`;cx.textAlign="center";cx.fillText("BEST",sx+GATE_W*k/2,(g.c-g.gap/2)*k-30*k) } }
  for(const u of r.pus){ const sx=W*.3+(u.x-camX)*k, sy=(u.y+Math.sin(r.t*3+u.x)*8)*k; if(sx<-50||sx>W+50)continue; const P=GAME.powerups.find(p=>p.id===u.id), pul=1+.08*Math.sin(r.t*6);
   GFX.glow(cx,sx,sy,48*k*pul,"255,240,170",.9); cx.save(); cx.strokeStyle="rgba(255,255,255,.9)"; cx.lineWidth=3*k; cx.beginPath(); cx.arc(sx,sy,24*k*pul,0,7); cx.stroke(); cx.font=`${28*k}px system-ui`; cx.textAlign="center"; cx.textBaseline="middle"; cx.fillText(P.icon,sx,sy+1*k); cx.restore() }
  this.clouds(camX*k,r.t,.22);
  if(r.shield&&!r.over){ const sy=r.y*k; cx.save(); cx.globalCompositeOperation="lighter"; GFX.glow(cx,W*.3,sy,85*k,"255,230,140",.35+.1*Math.sin(r.t*5)); cx.strokeStyle=`rgba(255,236,160,${.6+.3*Math.sin(r.t*5)})`; cx.lineWidth=3*k; for(let i=0;i<r.shield;i++){ cx.beginPath(); cx.arc(W*.3,sy,(58+i*9)*k,0,7); cx.stroke() } cx.restore() }
  if(r.slow>0){ cx.save(); cx.globalAlpha=Math.min(.18,r.slow*.05); cx.fillStyle="#bfe9ff"; cx.fillRect(0,0,W,H); cx.restore() }
  if(!(r.over&&r.crashT>.9)){ cx.globalAlpha=r.inv>0?.5+.5*Math.sin(r.t*20):1; this.angel(W*.3,r.y*k,r.vy,r.flapT,r.t,1); cx.globalAlpha=1 }
  this.parts(r,camX) },
 idle(t){ const k=this.k(); this.drawBg(t*120*k); this.clouds(t*160*k,t);
  const f=(Math.sin(t*6)+1)/2; this.angel(W*.5+Math.sin(t*.6)*W*.25,H*.62+Math.sin(t*1.7)*30*k,Math.cos(t*1.7)*120,f,t,1.35);
  cx.save();cx.globalCompositeOperation="lighter"; for(let i=0;i<40;i++){const x=(i*97+t*30)%W, y=(i*53+Math.sin(t+i)*20)%H, a=.4+.6*Math.sin(t*3+i);cx.globalAlpha=Math.max(0,a);cx.fillStyle="#fff6c0";cx.beginPath();cx.arc(x,y,1.5+(i%3),0,7);cx.fill()} cx.restore() }
};
