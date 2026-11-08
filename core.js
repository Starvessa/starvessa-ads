// Copyright © 2026 Starvessa Games. All rights reserved.
// Shared shell: save data, audio + music, welcome screen, age gate, login, tutorial, menu, shop, help, ads, results.
// Each game defines window.GAME before this file loads (see game.js).
const $=s=>document.querySelector(s), ui=$("#ui"), cv=$("#c");
let cx=cv.getContext("2d");
let KEY=GAME.id,profileReady=false,resetInProgress=false;
const DEF={name:null,birth:null,tut:false,best:0,runs:0,total:0,owned:[],skin:0,muted:false,streak:0,lastDay:"",streakBest:0,tokens:0,gifts:[],cm:0,chests:0,legend:0,trails:[0],trail:0,mis:null,boost:0,storyRead:[]};
const freshState=()=>({...DEF,owned:[],gifts:[],trails:[0],storyRead:[]});
let S=freshState();
const save=()=>{if(profileReady&&!resetInProgress)localStorage.setItem(KEY,JSON.stringify(S))};
// Retire the local-only email/password pseudo-account without resetting saves.
function migrateLocalProfile(state){
 let changed=false;
 if(Object.prototype.hasOwnProperty.call(state,"pw")){delete state.pw;changed=true}
 if(typeof state.name==="string"&&state.name!=="Guest"&&state.name!=="Play Games player"){
  state.name="Guest";changed=true;
 }
 return changed;
}
// Explicit, disclosed premium review access. Never writes fake purchases to S.owned.
// This local code is an access convenience, not server-backed entitlement security.
let REVIEW_ACCESS_KEY=KEY+"_premium_review_v1",FB_QUEUE=KEY+"_fbq";
const REVIEW_ACCESS_HASH="1ec291df41ccdb92e8852d13aad299235d2408e20392a6f71d2b31a28b4d5e15";
let reviewAccessActive=false;
function localProfileBridge(){
 const bridge=window.Capacitor?.Plugins?.HFPlayGames;
 if(!bridge)throw new Error("The native privacy bridge is unavailable.");
 return bridge;
}
function deleteStoredGameKeys(keepKey=null){
 for(let i=localStorage.length-1;i>=0;i--){
  const key=localStorage.key(i);
  const belongs=key===GAME.id||key?.startsWith(GAME.id+"_");
  const keep=keepKey&&(key===keepKey||key?.startsWith(keepKey+"_"));
  if(belongs&&!keep)localStorage.removeItem(key);
 }
}
function loadLocalProfile(epoch){
 if(typeof epoch!=="string"||(epoch!==""&&!/^[0-9a-f-]{36}$/.test(epoch)))throw new Error("Invalid local reset marker.");
 // A native, synchronously committed epoch chooses the only trusted namespace.
 // Old WebView writes cannot resurrect an earlier profile after process death.
 KEY=epoch?GAME.id+"_reset_"+epoch:GAME.id;
 REVIEW_ACCESS_KEY=KEY+"_premium_review_v1";FB_QUEUE=KEY+"_fbq";
 if(epoch)deleteStoredGameKeys(KEY);
 const saved=JSON.parse(localStorage.getItem(KEY)||"{}");
 if(!saved||typeof saved!=="object"||Array.isArray(saved))throw new Error("Invalid local save.");
 S=Object.assign(freshState(),saved);
 const migrated=migrateLocalProfile(S);
 reviewAccessActive=localStorage.getItem(REVIEW_ACCESS_KEY)===REVIEW_ACCESS_HASH;
 profileReady=true;
 if(migrated)save();
}
const purchased=id=>S.owned.includes(id)||S.owned.includes("everythingbundle");
const reviewOwns=id=>reviewAccessActive&&PRODUCTS.some(p=>p.id===id);
const owns=id=>purchased(id)||reviewOwns(id);
const ownershipLabel=id=>purchased(id)?"Owned":reviewOwns(id)?"Review access":"";
async function enableReviewAccess(code){
 const value=String(code||"").trim().toUpperCase().replace(/\s+/g,"");
 if(await hash(value)!==REVIEW_ACCESS_HASH)return false;
 // Write first: do not report persistent access if device storage rejected it.
 localStorage.setItem(REVIEW_ACCESS_KEY,REVIEW_ACCESS_HASH);
 reviewAccessActive=true;
 Platform.ads.suspend();
 return true;
}
function disableReviewAccess(){
 localStorage.removeItem(REVIEW_ACCESS_KEY);
 reviewAccessActive=false;
 // An unpurchased premium look must not remain equipped after access ends.
 if(!skinsUnlocked().includes(GAME.skins[S.skin])){S.skin=0;save()}
}
const validBirth=year=>Number.isInteger(year)&&year>=1900&&year<=new Date().getFullYear();
// A year alone gives a range of possible ages: use its youngest age.
const minimumAge=()=>validBirth(S.birth)?Math.max(0,new Date().getFullYear()-S.birth-1):-1;
const isChild=()=>minimumAge()<16;
const feedbackAllowed=()=>!isChild();
const gamesAllowed=()=>!isChild();
function grant(id){ if(!profileReady||resetInProgress)return; const changed=!S.owned.includes(id); if(changed){S.owned.push(id);save()} if(id==="removeads"||id==="everythingbundle")Platform.ads.suspend();
 // Repaint the shop after a real purchase/restore so cards update immediately.
 if(changed)setTimeout(()=>{if(ui.querySelector("#sB"))shop()},0) }
// Ranks: non-monetary rewards that grow with your best score
const rank=()=>{let r=0;GAME.ranks.forEach((x,i)=>{if(S.best>=x.at)r=i});return r};
const skinsUnlocked=()=>GAME.skins.filter(s=>S.best>=s.at||(s.premium&&owns("premiumskins"))||(s.streak&&(S.streakBest||0)>=s.streak));

// ---------- Screen ----------
// Performance: phones render at a lower pixel density; if the game still runs slowly it switches to Low-FX automatically.
const MOBILE=matchMedia("(pointer:coarse)").matches; let LOWFX=false; try{LOWFX=localStorage.getItem("lowfx3")==="1"}catch(e){} window.LOWFX=LOWFX;
// Soft background art (sky, nebula, mist) is painted into its own layer at a lower resolution and refreshed every
// 2nd frame, then copied in one fast step. Ships, gates, terrain, text and effects stay at full sharp resolution.
const BGL={c:document.createElement("canvas"),n:0,dirty:true}; BGL.x=BGL.c.getContext("2d");
function bgLayer(fn){ const s=Math.min(DPR,LOWFX?1.25:1.75), w=Math.ceil(W*s), h=Math.ceil(H*s);
 if(BGL.c.width!==w||BGL.c.height!==h){BGL.c.width=w;BGL.c.height=h;BGL.dirty=true}
 if(BGL.dirty||(++BGL.n%(LOWFX?3:2))===0){ const m=cx; cx=BGL.x; cx.setTransform(s,0,0,s,0,0); cx.globalAlpha=1; cx.globalCompositeOperation="source-over"; try{fn()}finally{cx=m} BGL.dirty=false }
 cx.drawImage(BGL.c,0,0,W,H) }
let W,H,DPR; function resize(){DPR=Math.min(devicePixelRatio||1,LOWFX?2:MOBILE?2.25:2.5); BGL.dirty=true;W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener("resize",resize); resize();
function img(src){const i=new Image();i.src=src;return i}

// ---------- Audio: WebAudio, all music and sounds synthesized in code (fully owned) ----------
let AC,master,musicBus,sfxBus,panner;
function audio(){ if(AC){AC.state==="suspended"&&AC.resume();return} AC=new (window.AudioContext||window.webkitAudioContext)();
 master=AC.createGain();master.gain.value=S.muted?0:1;master.connect(AC.destination);
 musicBus=AC.createGain();musicBus.gain.value=.22;musicBus.connect(master); sfxBus=AC.createGain();sfxBus.gain.value=.6;sfxBus.connect(master);
 panner=new PannerNode(AC,{panningModel:"HRTF",distanceModel:"inverse"});panner.connect(sfxBus); Music.start() }
function tone(f,t0,d,type="sine",vol=.25,out){ const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(g);g.connect(out||sfxBus);o.start(t0);o.stop(t0+d+.05) }
function noise(t0,d,vol,freq,out){ const b=AC.createBuffer(1,AC.sampleRate*d,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
 const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;f.type="bandpass";f.frequency.value=freq;g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
 s.connect(f);f.connect(g);g.connect(out||sfxBus);s.start(t0) }
function place(x){ if(panner){panner.positionX.value=(x/W-.5)*4;panner.positionZ.value=-1} }
const Sfx={
 // Bright, jingly, sparkly "gate passed" sound: rising major arpeggio + bell overtones + shimmer
 sparkle(x=W/2,combo=0){ if(!AC)return; place(x); const t=AC.currentTime, base=[1046.5,1318.5,1568,2093][0]*Math.pow(2,(combo%5)/12);
  [1,1.26,1.5,2,2.52].forEach((m,i)=>{tone(base*m,t+i*.045,.5,"sine",.16,panner);tone(base*m*2.01,t+i*.045,.25,"triangle",.05,panner)});
  noise(t,.35,.08,9000,panner); tone(base*4,t+.22,.4,"sine",.04,panner) },
 flap(){ if(!AC)return; const t=AC.currentTime; noise(t,.12,.12,900); tone(660+Math.random()*60,t,.12,"sine",.05) },
 thrust(){ if(!AC)return; const t=AC.currentTime; noise(t,.09,.05,180+Math.random()*60) },
 // Steering jets: a soft, airy "pssh" of gas (like the main engine's whoosh, only lighter and higher).
 // Smooth fade in/out and one puff every ~0.14s, so holding a tilt key sounds like a steady hiss instead of crackle.
 // It plays from the side of the jet that fires (spatial audio).
 rcs(dir=0){ if(!AC)return; const t=AC.currentTime; if(t-(this._rcsT||0)<.14)return; this._rcsT=t; const d=.26;
  const b=AC.createBuffer(1,AC.sampleRate*d,AC.sampleRate),a=b.getChannelData(0); let l=0; for(let i=0;i<a.length;i++){ l=l*.55+(Math.random()*2-1)*.45; a[i]=l }
  const src=AC.createBufferSource(),bp=AC.createBiquadFilter(),lp=AC.createBiquadFilter(),g=AC.createGain(),pn=AC.createStereoPanner(); src.buffer=b;
  bp.type="bandpass"; bp.frequency.value=1100+Math.random()*120; bp.Q.value=.6; lp.type="lowpass"; lp.frequency.value=2600; pn.pan.value=dir*.6;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.0225,t+.05); g.gain.linearRampToValueAtTime(.018,t+.16); g.gain.linearRampToValueAtTime(0,t+d);
  src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(pn); pn.connect(sfxBus); src.start(t); src.stop(t+d+.02) },
 land(){ if(!AC)return; const t=AC.currentTime;[523,659,784,1046,1318].forEach((f,i)=>tone(f,t+i*.07,.5,"triangle",.14)); noise(t,.4,.06,8000) },
 best(){ if(!AC)return; const t=AC.currentTime;[784,988,1175,1568,1976,2349].forEach((f,i)=>{tone(f,t+i*.08,.6,"sine",.14);tone(f*1.5,t+i*.08+.04,.4,"triangle",.05)}) },
 boom(){ if(!AC)return; const t=AC.currentTime; noise(t,.9,.5,120); tone(70,t,.6,"sawtooth",.15) },
 click(){ if(!AC)return; tone(1400,AC.currentTime,.06,"sine",.08) }
};
// Joyful looping music: major-key melody, bass and sparkle bells, scheduled ahead with the WebAudio clock.
const Music={ on:false, step:0, next:0, timer:null, tempo:GAME.music.tempo,
 start(){ if(this.on)return; this.on=true; this.next=AC.currentTime+.1; this.timer=setInterval(()=>this.tick(),60) },
 tick(){ const spb=60/this.tempo/2; while(this.next<AC.currentTime+.3){ this.play(this.step,this.next,spb); this.step++; this.next+=spb } },
 play(i,t,spb){ const M=GAME.music, bar=Math.floor(i/8)%M.chords.length, ch=M.chords[bar], k=i%8, root=M.key;
  const f=n=>root*Math.pow(2,n/12);
  const mel=M.melody[i%M.melody.length]; if(mel!==null) tone(f(mel+12),t,spb*1.8,M.lead,.2,musicBus);
  if(k===0||k===4) tone(f(ch[0]-12),t,spb*3.5,"triangle",.28,musicBus);
  if(k%2===1) ch.forEach(n=>tone(f(n),t,spb*.9,"sine",.06,musicBus));
  if(k===6) tone(f(ch[2]+24),t,spb*2,"sine",.05,musicBus) },
 duck(v){ if(musicBus) musicBus.gain.setTargetAtTime(v,AC.currentTime,.3) } };
function setMuted(m){S.muted=m;save();if(master)master.gain.value=m?0:1; sndIcon()}
function sndIcon(){ const b=$("#bSnd"); if(b){ b.textContent=S.muted?"🔇":"🔊"; b.classList.toggle("off",S.muted); b.setAttribute("aria-pressed",S.muted?"true":"false") } }

// ---------- Input: touch/mouse and keyboard (phones, tablets, PC) ----------
const input={down:false,left:false,right:false,tap:0};
// Multi-touch: every finger is tracked on its own, so lifting one finger never cancels another.
const cvPtrs=new Set(); window.btnThrust=false;
cv.addEventListener("pointerdown",e=>{e.preventDefault();audio();cvPtrs.add(e.pointerId);input.down=true;input.tap++;input.px=e.clientX;GAME.press&&GAME.press(e.clientX,e.clientY)});
const cvUp=e=>{ if(!cvPtrs.delete(e.pointerId))return; if(!cvPtrs.size&&!window.btnThrust){input.down=false;GAME.release&&GAME.release()} };
addEventListener("pointerup",cvUp); addEventListener("pointercancel",cvUp);
addEventListener("keydown",e=>{ if(e.repeat)return; audio(); if(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"){input.down=true;input.tap++;GAME.press&&GAME.press(-1,-1)}
 if(e.code==="ArrowLeft"||e.code==="KeyA")input.left=true; if(e.code==="ArrowRight"||e.code==="KeyD")input.right=true; if(e.code==="Escape"&&Run)pause(); if(e.code==="KeyM"){ setMuted(!S.muted); toast(S.muted?"🔇 Sound off":"🔊 Sound on") } });
addEventListener("keyup",e=>{ if(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"){input.down=false;GAME.release&&GAME.release()}
 if(e.code==="ArrowLeft"||e.code==="KeyA")input.left=false; if(e.code==="ArrowRight"||e.code==="KeyD")input.right=false });

// ---------- Main loop ----------
let Run=null,last=0,paused=false,welcomeT=0;
let pfT=0,pfN=0,pfS=0; function perfCheck(ms){ if(LOWFX||!Run||Run.over||paused)return; pfN++; pfS+=ms; pfT+=ms; if(pfT>2500){ const avg=pfS/pfN; pfT=pfS=pfN=0; if(avg>21){ LOWFX=true; window.LOWFX=true; try{localStorage.setItem("lowfx3","1")}catch(e){} resize() } } }
function loop(ts){ requestAnimationFrame(loop); const ms=last?ts-last:16; const dt=last?Math.min(.05,ms/1000):1/60; last=ts; if(ms<200)perfCheck(ms);
 if(Run&&!paused){ if(!Run.over)GAME.step(Run,dt); else GAME.stepOver&&GAME.stepOver(Run,dt); GAME.draw(Run); hud() }
 else if(!Run){ welcomeT+=dt; GAME.idle(welcomeT,dt) } }
requestAnimationFrame(loop);

function startRun(){ ui.innerHTML=""; Platform.ads.banner(false); Music.duck(.12); paused=false; Run=GAME.newRun(); Run.score=0; Run.over=false; Run.continued=false; Run.t=0; Run.stats={}; missions();
 if(S.boost>0){ S.boost--; save(); Run.shield=1; setTimeout(()=>toast(`🛡️ Head-start ${GAME.shieldName} active! (${S.boost} left)`),300) }
 $("#hud").classList.remove("hidden"); $("#controls")&&$("#controls").classList.toggle("hidden",!GAME.touchControls) }
const HC={}; function hset(id,prop,v){ const k=id+prop; if(HC[k]===v)return; HC[k]=v; const e=$(id); if(!e)return; if(prop==="t")e.textContent=v; else e.style[prop]=v }
function hud(){ const r=Run; hset("#hScore","t",String(r.score)); hset("#hBest","t","BEST "+Math.max(S.best,r.score));
 const g=GAME.gauge?GAME.gauge(r):null; if(HC.gv!==!!g){HC.gv=!!g;$("#hBar").parentElement.classList.toggle("hidden",!g)} if(g){hset("#hBar","width",(Math.round(g.v*200)/2)+"%");hset("#hBar","background",g.v<.2?"#ff4d4d":g.c);hset("#hBarT","t",g.label)}
 hset("#hMsg","t",r.msg||""); const fx=GAME.effects?GAME.effects(r):[]; let hf=$("#hFx"); if(!hf){hf=document.createElement("div");hf.id="hFx";$("#hud").appendChild(hf)} const fh=fx.join(""); if(hf._h!==fh){hf._h=fh;hf.innerHTML=fh} }
function gameOver(why){ const r=Run; if(r.over)return; r.over=true; r.why=why; Sfx.boom(); Platform.haptic("error"); setTimeout(()=>result(),900) }
let adCount=0,lastAd=0; const bootTime=Date.now();
function adDue(){ if(owns("removeads")||owns("everythingbundle")||S.runs<3)return false; return ++adCount>=3&&Date.now()-lastAd>60000 }
async function afterRunAd(){ if(!adDue())return false; adCount=0; lastAd=Date.now(); Music.duck(0); let shown=false; try{shown=Platform.ads.interstitialReady===true&&Platform.ads.usable()===true}catch(e){} await Platform.ads.interstitial(); Music.duck(.22); return shown }
function result(){ const r=Run, prev=S.best, nb=r.score>prev, prk=rank(); S.runs++; S.total+=r.score; if(nb){S.best=r.score;Sfx.best();Platform.haptic("success")}
 stat("runs"); for(const m of missions().list) if(m.max&&!m.done&&(m.k==="score"?r.score:(r.stats[m.k]||0))>=m.goal){m.prog=m.goal;misDone(m)}
 const add=Math.round(r.score*(GAME.chestPer||1)); r._cm=add; S.cm+=add; chestCheck();
 const nrk=rank(), up=nrk>prk; if(up){ S.legend+=nrk-prk } save();
 const newPU=GAME.powerups.filter(p=>p.at>prev&&p.at<=S.best);
 if(gamesAllowed()){Platform.games.score(GAME.leaderboard,r.score)} // Play Games achievements are not set up yet; re-add unlocks with real Play Console IDs in a later update.
 const nxt=GAME.ranks.find(x=>x.at>S.best), close=!nb&&prev>0&&prev-r.score<=Math.max(3,prev*.1);
 const canCont=!r.continued&&(owns("removeads")||S.tokens>0||Platform.ads.rewardReady);
 ui.innerHTML=`<div class="overlay"><div class="panel center"><div class="title" style="font-size:40px">${nb?"NEW BEST!":"GAME OVER"}</div>
 <div class="big">${r.score}</div><div class="small">${r.why||""}</div><div>Best: <b>${S.best}</b> · Rank: <b>${GAME.ranks[rank()].name}</b></div>
 ${close?`<div class="card">So close! Only <b>${prev-r.score+1}</b> more to beat your best.</div>`:""}
 ${nxt?`<div class="small">Next rank "${nxt.name}" at ${nxt.at}</div><div class="prog"><div style="width:${Math.min(100,S.best/nxt.at*100)}%"></div></div>`:""}
 ${up?`<div class="card rankup"><div class="ru1">⭐ RANK UP! ⭐</div><b>${GAME.ranks[nrk].name}</b><div class="small">Legendary ${CW().toLowerCase()} earned · New story chapter unlocked${newPU.length?` · New power-up: ${newPU.map(p=>p.icon+" "+p.name).join(", ")}`:""}</div></div>`:(newPU.length?`<div class="card rankup"><div class="ru1">NEW POWER-UP!</div>${newPU.map(p=>p.icon+" <b>"+p.name+"</b>: "+p.desc).join("<br>")}</div>`:"")}
 ${chestBar()}
 ${S.chests+S.legend>0?`<button class="btn chestbtn" id="rChest">🎁 Open ${S.legend>0?"Legendary":"Treasure"} ${CW()}${S.chests+S.legend>1?` (${S.chests+S.legend})`:""}</button>`:""}
 ${canCont?`<button class="btn" id="rCont">${owns("removeads")?"Continue":S.tokens>0?`Use a Lucky Continue (${S.tokens} left)`:"Watch an ad to continue"}</button>`:""}
 <button class="btn" id="rAgain">Play again</button><div class="tabs">${gamesAllowed()?'<button class="btn alt" id="rLb">🏆 World ranks</button>':""}<button class="btn alt" id="rShare">Challenge a friend</button><button class="btn alt" id="rMenu">Menu</button></div></div></div>`;
 $("#rAgain").onclick=async()=>{Sfx.click();const shown=await afterRunAd();startRun();if(shown)getReady("Your next run starts when you're ready.")}; if($("#rChest"))$("#rChest").onclick=()=>openChest(menu); $("#rMenu").onclick=async()=>{Sfx.click();await afterRunAd();menu()}; if($("#rLb"))$("#rLb").onclick=()=>leaderboard(null);
 $("#rShare").onclick=()=>Platform.share(`I scored ${r.score} in ${GAME.title}! Can you beat me?`);
 if($("#rCont"))$("#rCont").onclick=async()=>{ if(owns("removeads")||(S.tokens>0&&(S.tokens--,true))||await Platform.ads.rewarded()){ ui.innerHTML="";r.over=false;r.continued=true;GAME.revive(r);S.runs--;S.total-=r.score;S.cm=Math.max(0,S.cm-(r._cm||0));if(nb)S.best=prev;save();getReady() } };
 if(S.runs===8||S.runs===40)Platform.review(); }
// After a continue or a between-runs ad, wait for the player before the run moves.
function getReady(note="Your run continues from here."){ if(!Run||Run.over)return; paused=true; try{GAME.draw(Run);hud()}catch(e){}
 ui.innerHTML=`<div class="overlay" id="gR" style="cursor:pointer"><div class="panel center"><div class="title" style="font-size:40px">Get ready</div>
 <div class="card">${note}</div><button class="btn" id="gRb">Tap to continue</button></div></div>`;
 const go=e=>{ if(e){e.preventDefault();e.stopPropagation()} if(!paused||!$("#gR"))return; ui.innerHTML="";paused=false;last=0;input.down=false };
 $("#gR").addEventListener("pointerdown",go); }
function pause(){ if(!Run||Run.over)return; paused=true; ui.innerHTML=`<div class="overlay"><div class="panel center"><div class="title" style="font-size:40px">Paused</div>
 <button class="btn" id="pR">Resume</button><button class="btn alt" id="pQ">Quit to menu</button></div></div>`;
 $("#pR").onclick=()=>{ui.innerHTML="";paused=false;last=0}; $("#pQ").onclick=()=>{paused=false;menu()} }
$("#bPause").onclick=pause; $("#bSnd").onclick=e=>{ audio(); setMuted(!S.muted); if(!S.muted)Sfx.click(); toast(S.muted?"🔇 Sound off":"🔊 Sound on"); e.currentTarget.blur() }; sndIcon();

// ---------- Screens ----------
function welcome(){ Run=null; $("#hud").classList.add("hidden"); $("#controls")&&$("#controls").classList.add("hidden"); welcomeT=0;
 ui.innerHTML=`<div class="welcome" id="wTap"><div class="wtitle">${GAME.title.split(" ").map((w,i)=>`<span style="animation-delay:${i*.25}s">${w}</span>`).join(" ")}</div>
 ${GAME.lore.portrait?`<img class="whero" src="${GAME.lore.portrait}" alt="">`:""}<div class="wsub">${GAME.tagline}</div><div class="wtap">Tap to begin</div><div class="small wfoot">© 2026 Starvessa Games</div></div>`;
 $("#wTap").onclick=()=>{audio();Sfx.sparkle();route(true)} }
function ageGate(){ const y=new Date().getFullYear(); ui.innerHTML=`<div class="panel center card-bg"><div class="title">Welcome</div><div class="card">What year were you born?</div>
 <select id="aY" aria-label="Birth year"><option selected disabled value="">Select year</option>${Array.from({length:y-1899},(_,i)=>`<option value="${y-i}">${y-i}</option>`).join("")}</select><div class="small" id="aErr" role="status"></div><button class="btn" id="aOk">Continue</button></div>`;
 $("#aOk").onclick=()=>{const raw=$("#aY").value,v=Number(raw);if(!raw||!validBirth(v)){$("#aErr").textContent="Please select your birth year.";return}S.birth=v;save();Platform.games.syncAge();Platform.ads.init(isChild());route(true)} }
async function hash(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function login(){ ui.innerHTML=`<div class="panel card-bg"><div class="title">${GAME.title}</div>
 <div class="card small">${gamesAllowed()?"You can play without an account. Google Play Games is optional and used for leaderboards.":"Play without an account. Your progress and best score are saved on this device."}</div>
 <button class="btn" id="lGuest">Play as guest</button>
 ${Platform.native&&gamesAllowed()?`<button class="btn alt" id="lG">Sign in with Google Play Games</button>`:""}
 <div class="small center"><a href="privacy.html" style="color:inherit">Privacy Policy</a> · <a href="terms.html" style="color:inherit">Terms of Use</a></div></div>`;
 ui.scrollTop=0;
 if($("#lG"))$("#lG").onclick=async()=>{
  if(!gamesAllowed())return;
  const button=$("#lG");button.disabled=true;
  try{
   if(await Platform.games.signIn()&&gamesAllowed()){S.name="Play Games player";save();route(true)}
   else toast("Play Games sign-in was unavailable. You can still play as guest.");
  }finally{if(button.isConnected)button.disabled=false}
 };
 $("#lGuest").onclick=()=>{S.name="Guest";save();route(true)} }
const tipText=t=>typeof t==="string"?t:(t.title+": "+t.text.replace(/<[^>]+>/g,"")+(t.pc?" "+t.pc+".":""));
function tutorial(){ const tips=GAME.tips; let i=0;
 const show=()=>{ const t=tips[i], last=i===tips.length-1, art=/\.(webp|png|jpg)$/.test(t.art)?`<img src="${t.art}" alt="">`:`<span>${t.art}</span>`;
  ui.innerHTML=`<div class="panel center tut"><div class="tutcard" key="${i}"><div class="tutstep">How to play · ${i+1} of ${tips.length}</div>
   <div class="tutart a-${t.anim||"float"} ${t.fx?"fx-"+t.fx:""}">${art}</div><div class="tuttitle">${t.title}</div><div class="tuttext">${t.text}</div>
   ${t.pc?`<div class="tutpc">⌨️ ${t.pc}</div>`:""}<div class="tutdots">${tips.map((_,j)=>`<i class="${j===i?"on":j<i?"done":""}"></i>`).join("")}</div></div>
   <div class="tabs"><button class="btn alt" id="tS">Skip</button><button class="btn tutgo" id="tN">${last?(GAME.tutStart||"Play")+" ➜":"Next ➜"}</button></div></div>`;
  $("#tS").onclick=()=>{S.tut=true;save();route(true)}; $("#tN").onclick=()=>{ if(last)Sfx.sparkle(); else Sfx.click(); Platform.haptic&&Platform.haptic("light"); if(++i<tips.length)show();else{S.tut=true;save();route(true)}} }; show() }
// ---------- Daily login streak with gifts at 3, 7 and 30 days ----------
const STREAK_GIFTS=[{d:30,name:"Legendary 30-day gift",tokens:10,skin:30},{d:7,name:"7-day gift",tokens:3,skin:7},{d:3,name:"3-day gift",tokens:1}];
function giftFor(day){ if(day%30===0)return STREAK_GIFTS[0]; if(day%7===0)return STREAK_GIFTS[1]; if(day%3===0)return STREAK_GIFTS[2]; return null }
function nextGift(day){ for(let n=day+1;n<day+31;n++){const g=giftFor(n); if(g)return {in:n-day,g}} }
function daily(){ const d=new Date().toDateString();
 if(S.lastDay!==d){ const y=new Date(Date.now()-864e5).toDateString(); S.streak=S.lastDay===y?S.streak+1:1; S.lastDay=d; S.streakBest=Math.max(S.streakBest||0,S.streak);
  const g=giftFor(S.streak); if(g){ S.tokens=(S.tokens||0)+g.tokens; const sk=g.skin&&GAME.skins.find(s=>s.streak===g.skin); window.__gift={g,day:S.streak,skin:sk&&!S.gifts.includes(g.skin)?sk:null}; if(sk&&!S.gifts.includes(g.skin))S.gifts.push(g.skin) } save() }
 return streakCard() }
// Gift artwork per game (GAME.giftArt = {3:"assets/gift3.webp",7:...,30:...}); falls back to an emoji.
const giftIcon=(d,cls="")=>{ const a=GAME.giftArt&&GAME.giftArt[d]; return a?`<img class="gicon ${cls}" src="${a}" alt="">`:`<span class="gicon ${cls}">${d===30?"👑":d===7?"🎁":"✨"}</span>` };
const giftTier=day=>day%30===0?30:day%7===0?7:day%3===0?3:0;
function giftText(t){ const g=STREAK_GIFTS.find(x=>x.d===t), sk=g.skin&&GAME.skins.find(s=>s.streak===g.skin); return `+${g.tokens} Lucky Continue${g.tokens>1?"s":""}${sk?` + ${sk.name} ${GAME.skinLabel.toLowerCase().includes("paint")?"paint":"wings"}`:""}` }
function streakCard(){ const n=nextGift(S.streak), t=giftTier(S.streak+n.in), base=Math.floor((S.streak-1)/7)*7;
 const wk=[1,2,3,4,5,6,7].map(i=>{ const day=base+i, gt=giftTier(day), done=day<=S.streak;
  return `<div class="sday ${done?"done":""} ${day===S.streak?"today":""} ${gt?"gift":""}">${gt?giftIcon(gt,"mini"):""}<b>${done?"✓":day}</b><small>${done?"Day "+day:""}</small></div>`}).join("");
 let pv=S.streak; while(pv>0&&!giftTier(pv))pv--; const pct=Math.round((S.streak-pv)/(S.streak+n.in-pv)*100);
 return `<div class="card streak2"><div class="shead"><div class="sflame">🔥<span>${S.streak}</span></div>
  <div class="sinfo"><b>${S.streak}-day streak</b><small>Best ${S.streakBest||S.streak} · Lucky Continues: <b>${S.tokens||0}</b></small></div>
  <div class="snext">${giftIcon(t,"float")}<small>${n.in===1?"Tomorrow!":"In "+n.in+" days"}</small></div></div>
  <div class="sweek">${wk}</div>
  <button class="btn cal" onclick="openCal()">📅 View 30-day calendar</button></div>` }
function openCal(){ Sfx&&Sfx.tap&&Sfx.tap(); const base=Math.floor((Math.max(1,S.streak)-1)/30)*30, o=document.createElement("div"); o.className="overlay calw";
 const cells=Array.from({length:30},(_,i)=>{ const day=base+i+1, gt=giftTier(day), done=day<=S.streak, today=day===S.streak;
  return `<div class="cday ${done?"done":""} ${today?"today":""} ${gt?"g"+gt:""}"><small>Day ${day}</small>${gt?giftIcon(gt):""}${done?`<i class="chk">✓</i>`:""}</div>`}).join("");
 o.innerHTML=`<div class="panel center calp"><div class="title" style="font-size:30px">Daily Streak Calendar</div>
  <div class="small">Play once a day. Days you've played get a green check. Miss a day and the streak starts over.</div>
  <div class="cgrid">${cells}</div>
  <div class="clegend">${[3,7,30].map(d=>`<div class="lg">${giftIcon(d)}<div><b>${d===30?"Day 30: Legendary gift":d===7?"Every 7th day":"Every 3rd day"}</b><small>${giftText(d)}</small></div></div>`).join("")}</div>
  <button class="btn" id="calX">Close</button></div>`;
 document.body.appendChild(o); o.querySelector("#calX").onclick=()=>o.remove(); o.onclick=e=>{if(e.target===o)o.remove()};
 const t=o.querySelector(".cday.today"); t&&t.scrollIntoView({block:"center"}) }
window.openCal=openCal;
function giftPopup({g,day,skin}){ const o=document.createElement("div"); o.className="overlay gift";
 o.innerHTML=`<div class="panel center"><div class="giftbox">${giftIcon(giftTier(day)||3,"big")}</div><div class="title" style="font-size:34px">Day ${day} gift!</div><div class="tip">${g.name}</div>
 <div class="card">+${g.tokens} Lucky Continue${g.tokens>1?"s":""} (continue a run without an ad)${skin?`<br><b>New look unlocked: ${skin.name}</b>`:""}</div>
 <button class="btn play" id="gOk">Collect</button></div>`; document.body.appendChild(o); Sfx.best(); setTimeout(()=>Sfx.sparkle(W*.5,3),300); Platform.haptic("success");
 o.querySelector("#gOk").onclick=()=>{Sfx.sparkle();o.remove();menu()} }
// ---------- Living background: slow camera drift so flat art feels deep ----------
function livingBg(b,scroll,par){ const t=performance.now()/1000, h=H*1.08, w=b.naturalWidth*h/b.naturalHeight, off=-(scroll*par)%(w*2)+Math.sin(t*.13)*W*.012, oy=-H*.04+Math.sin(t*.21)*H*.02;
 for(let x=off-w*2;x<W;x+=w*2){ cx.drawImage(b,x,oy,w,h); cx.save();cx.translate(x+w*2,oy);cx.scale(-1,1);cx.drawImage(b,0,0,w,h);cx.restore() } return t }

// ---------- Rewards: power-ups, daily missions, treasure chests, trails and story ----------
const CW=()=>GAME.chestWord||"Chest";
const puOn=()=>GAME.powerups.filter(p=>S.best>=p.at);
const pickPU=r=>{ const held=(r&&r.shield)|0; const l=puOn().map(p=>({id:p.id,w:p.id==="shield"?(held>=(GAME.maxShield||3)?0:(p.w||1)/(1+held*1.5)):(p.w||1)})).filter(p=>p.w>0);
 const tot=l.reduce((a,p)=>a+p.w,0); let x=Math.random()*tot, id=l.length?l[l.length-1].id:null; for(const p of l){ if((x-=p.w)<=0){id=p.id;break} }
 // Shields are rare on purpose: only ~55% of shield rolls appear, and far fewer while you already hold some.
 if(id==="shield"&&Math.random()>.55/(1+held*1.2)){ const o=l.filter(p=>p.id!=="shield"); return o.length?o[Math.floor(Math.random()*o.length)].id:null } return id };
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.innerHTML=msg; document.body.appendChild(t); setTimeout(()=>t.classList.add("out"),2300); setTimeout(()=>t.remove(),2800) }
function missions(){ const d=new Date().toDateString(); if(S.mis&&S.mis.day===d)return S.mis;
 let seed=[...d].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7); const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
 const pool=GAME.missions.filter(m=>!m.need||S.best>=m.need), list=[];
 while(list.length<3&&pool.length){ const m=pool.splice(Math.floor(rnd()*pool.length),1)[0], goal=typeof m.goal==="function"?m.goal(S.best):m.goal; list.push({k:m.k,max:!!m.max,goal,prog:0,done:false,t:m.t.replace("#",goal.toLocaleString())}) }
 S.mis={day:d,list,bonus:false}; save(); return S.mis }
function stat(k,n=1){ const r=Run; if(!r)return; r.stats[k]=(r.stats[k]||0)+n; for(const m of missions().list){ if(m.done||m.max||m.k!==k)continue; m.prog=Math.min(m.goal,m.prog+n); if(m.prog>=m.goal)misDone(m) } }
function misDone(m){ m.done=true; S.cm+=Math.ceil(GAME.chestGoal*.2); let msg=`✅ Mission complete!<br><b>${m.t}</b>`;
 if(!S.mis.bonus&&S.mis.list.every(x=>x.done)){ S.mis.bonus=true; S.chests++; msg+=`<br>🎁 All missions done: bonus ${CW().toLowerCase()}!` } chestCheck(); save(); toast(msg); Sfx.sparkle(W*.5,3); Platform.haptic("success") }
function chestCheck(){ while(S.cm>=GAME.chestGoal){ S.cm-=GAME.chestGoal; S.chests++ } }
function chestBar(){ const p=Math.min(100,Math.round(S.cm/GAME.chestGoal*100)); return `<div class="chestbar"><img src="${GAME.chestArt}" alt=""><div><div class="small">Next ${CW().toLowerCase()} · ${p}%</div><div class="prog"><div style="width:${p}%"></div></div></div></div>` }
const RAR={Common:"#b9c2cf",Rare:"#4db8ff",Epic:"#c06bff",Legendary:"#ffc83d"};
function rollChest(leg){ const locked=GAME.trails.map((_,i)=>i).filter(i=>!S.trails.includes(i)), x=leg?.7+Math.random()*.3:Math.random(), tr=()=>{ const i=locked[Math.floor(Math.random()*locked.length)]; S.trails.push(i); return GAME.trails[i] };
 // Odds per normal chest: 1% jackpot, 10% new trail, 15% +2 continues, 24% head-start shield, 50% +1 continue.
 // Legendary chests (rank-ups) roll in the top 30%: about 3% jackpot, 33% trail, 50% +2 continues, 13% shield.
 if(x>=.99||(leg&&x>=.99)){ const t=locked.length?tr():null; S.tokens+=2; S.boost++; return {rar:"Legendary",icon:"👑",title:"JACKPOT!",desc:`${t?`New trail: <b>${t.name}</b><br>`:""}+2 Lucky Continues<br>+1 Head-start ${GAME.shieldName}`} }
 if(x>=.89&&locked.length){ const t=tr(); return {rar:"Epic",icon:`<span class="tsw big" style="background:${t.swatch}"></span>`,title:`New trail: ${t.name}`,desc:"Equip it in Rewards → Trails and show it off!"} }
 if(x>=.74){ S.tokens+=2; return {rar:"Rare",icon:"🍀",title:"+2 Lucky Continues",desc:"Keep going after a crash, no ad needed."} }
 if(x>=.5){ S.boost++; return {rar:"Rare",icon:"🛡️",title:`Head-start ${GAME.shieldName}`,desc:"Your next run starts already protected."} }
 S.tokens++; return {rar:"Common",icon:"🍀",title:"+1 Lucky Continue",desc:"Keep going after a crash, no ad needed."} }
function openChest(back){ if(S.chests+S.legend<=0)return back(); const leg=S.legend>0; if(leg)S.legend--; else S.chests--; const rw=rollChest(leg); save();
 const o=document.createElement("div"); o.className="overlay chestov"+(leg?" leg":"");
 o.innerHTML=`<div class="panel center"><div class="title" style="font-size:32px">${leg?"Legendary "+CW():"Treasure "+CW()}</div><div class="chestwrap"><div class="rays"></div><img class="chestimg shake" src="${leg&&GAME.chestArtL?GAME.chestArtL:GAME.chestArt}" alt=""></div><div class="small" id="cT">Tap the ${CW().toLowerCase()} to open it!</div></div>`;
 document.body.appendChild(o); Sfx.click(); let done=false;
 const open=()=>{ if(done)return; done=true; Sfx.best(); [0,150,300,450].forEach((d,i)=>setTimeout(()=>Sfx.sparkle(W*.5,i+2),d)); Platform.haptic("success");
  const c=RAR[rw.rar], left=S.chests+S.legend;
  o.querySelector(".panel").innerHTML=`<div class="confetti">${Array.from({length:36},(_,i)=>`<i style="left:${Math.random()*100}%;background:hsl(${i*37%360},90%,60%);animation-delay:${Math.random()*.4}s;animation-duration:${1.4+Math.random()*1.2}s"></i>`).join("")}</div>
   <div class="reward" style="--rc:${c}"><div class="rar">${rw.rar.toUpperCase()}</div><div class="ricon">${rw.icon}</div><h2>${rw.title}</h2><div>${rw.desc}</div></div>
   ${left>0?`<button class="btn chestbtn" id="cN">🎁 Open next ${CW().toLowerCase()} (${left})</button>`:""}<button class="btn ${left>0?"alt":""}" id="cOk">Awesome!</button>`;
  o.querySelector("#cOk").onclick=()=>{Sfx.click();o.remove();back()}; const n=o.querySelector("#cN"); if(n)n.onclick=()=>{o.remove();openChest(back)} };
 o.querySelector(".chestimg").onclick=open; setTimeout(open,1600) }
function rewards(){ Run=null; $("#hud").classList.add("hidden"); $("#controls")&&$("#controls").classList.add("hidden"); const m=missions(), rk=rank(), box=S.chests+S.legend;
 ui.innerHTML=`<div class="panel rw"><div class="title" style="font-size:36px">Rewards</div>
 <div class="card center"><img class="bigchest ${box?"shake":""}" src="${GAME.chestArt}" alt=""><div>${chestBar()}</div>
  ${box?`<button class="btn chestbtn" id="wC">🎁 Open ${S.legend>0?"Legendary":"Treasure"} ${CW()} (${box})</button>`:`<div class="small">Every point you score fills the ${CW().toLowerCase()} meter. Missions fill it faster!</div>`}
  <div class="small">🍀 Lucky Continues: <b>${S.tokens||0}</b> · 🛡️ Head-start ${GAME.shieldName}s: <b>${S.boost}</b></div></div>
 <div class="card"><b>Today's missions</b><div class="small">New missions every day. Finish all 3 for a bonus ${CW().toLowerCase()}!</div>
  ${m.list.map(x=>`<div class="mis ${x.done?"done":""}"><span>${x.done?"✅":"🎯"} ${x.t}</span><div class="prog"><div style="width:${x.prog/x.goal*100}%"></div></div><small>${x.max?(x.done?"Done!":"Best this run counts"):`${x.prog.toLocaleString()} / ${x.goal.toLocaleString()}`}</small></div>`).join("")}
  ${m.bonus?`<div class="small center">🎉 Bonus ${CW().toLowerCase()} claimed. See you tomorrow!</div>`:""}</div>
 <div class="card"><b>Power-ups</b><div class="small">They appear during your runs. Grab them! New ones unlock as your rank grows.</div>
  <div class="pus">${GAME.powerups.map(p=>{const ok=S.best>=p.at;return `<div class="pu ${ok?"":"lock"}"><span class="orb">${ok?p.icon:"🔒"}</span><div><b>${p.name}</b><small>${ok?p.desc:`Unlocks at best score ${p.at.toLocaleString()} (${(GAME.ranks.find(r=>r.at>=p.at)||{}).name||""})`}</small></div></div>`}).join("")}</div></div>
 <div class="card"><b>${GAME.trailLabel}</b><div class="small">Find new ones in ${CW().toLowerCase()}s.</div><div class="skins">${GAME.trails.map((t,i)=>{const ok=S.trails.includes(i);return `<button class="skin trail ${S.trail===i?"on":""}" data-t="${i}" ${ok?"":"disabled"}><span style="background:${t.swatch}"></span>${t.name}<small>${ok?(S.trail===i?"Equipped":""):"In "+CW().toLowerCase()+"s"}</small></button>`}).join("")}</div></div>
 <div class="card"><b>📖 ${GAME.storyTitle}</b><div class="small">A new chapter unlocks with every rank.</div>
  ${GAME.story.map((c,i)=>`<button class="chap ${i<=rk?"":"lock"} ${i<=rk&&!S.storyRead.includes(i)?"new":""}" data-c="${i}" ${i<=rk?"":"disabled"}><span>${i<=rk?"📜":"🔒"}</span><div><b>Chapter ${i+1}: ${i<=rk?c.t:"???"}</b><small>${i<=rk?(S.storyRead.includes(i)?"Read again":"NEW! Tap to read"):"Reach "+GAME.ranks[i].name}</small></div></button>`).join("")}</div>
 <button class="btn" id="wB">Back</button><div style="height:60px"></div></div>`;
 if($("#wC"))$("#wC").onclick=()=>openChest(rewards); $("#wB").onclick=()=>{Sfx.click();menu()};
 ui.querySelectorAll(".trail").forEach(e=>e.onclick=()=>{S.trail=+e.dataset.t;save();Sfx.sparkle();rewards()});
 ui.querySelectorAll(".chap:not(.lock)").forEach(e=>e.onclick=()=>chapter(+e.dataset.c)) }
function chapter(i){ const c=GAME.story[i]; if(!S.storyRead.includes(i)){S.storyRead.push(i);save()} Sfx.click();
 const o=document.createElement("div"); o.className="overlay"; o.innerHTML=`<div class="panel"><div class="card story"><div class="small">CHAPTER ${i+1} OF ${GAME.story.length}</div><h2>${c.t}</h2>${c.p.map(x=>`<p>${x}</p>`).join("")}</div><button class="btn" id="chX">Close</button></div>`;
 document.body.appendChild(o); o.querySelector("#chX").onclick=()=>{o.remove();rewards()} }
// ---------- World leaderboard (Google Play Games: worldwide and friends, today / this week / all time) ----------
async function leaderboard(back){ if(!gamesAllowed()){toast("Online leaderboards are unavailable for this profile. Your best score is saved on this device.");return} Sfx.click(); if(await Platform.games.show(GAME.leaderboard,S.best))return;
 if(!gamesAllowed())return;
 const native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
 const o=document.createElement("div"); o.className="overlay"; o.innerHTML=`<div class="panel center"><div class="title" style="font-size:34px">🏆 World Leaderboard</div>
  <div class="card lbme"><div class="small">YOUR BEST SCORE</div><div class="big">${S.best.toLocaleString()}</div><div>Rank: <b>${GAME.ranks[rank()].name}</b></div></div>
  <div class="card">See how your best score stacks up against ${GAME.title} players around the world, or just your friends. Rankings reset <b>daily</b> and <b>weekly</b>, plus an <b>all-time</b> board, so everyone gets a shot at the top.</div>
  <div class="small">${native?"Leaderboards use Google Play Games. Sign in to join, then open this again.":"The world leaderboard is available in the Android app from Google Play, using Google Play Games."}</div>
  ${native?`<button class="btn" id="lbIn">Sign in with Play Games</button>`:""}<button class="btn alt" id="lbX">Close</button></div>`;
 document.body.appendChild(o); o.querySelector("#lbX").onclick=()=>o.remove(); const i=o.querySelector("#lbIn"); if(i)i.onclick=async()=>{o.remove(); Platform.games.signIn(); setTimeout(()=>Platform.games.show(GAME.leaderboard,S.best),1500)} }
function menu(){ Run=null; $("#hud").classList.add("hidden"); $("#controls")&&$("#controls").classList.add("hidden"); Music.duck(.22); if(!owns("removeads"))Platform.ads.banner(true);
 const rk=rank(), nxt=GAME.ranks[rk+1], sk=skinsUnlocked();
 ui.innerHTML=`<div class="panel"><div class="title">${GAME.title}</div>${reviewAccessActive?'<div class="card small center" role="status">Premium review access is active. Manage it in About &gt; Review access.</div>':""}${daily()}
 <button class="btn play" id="mPlay">PLAY</button>
 <button class="btn rewardsbtn" id="mRw">🎁 Rewards${S.chests+S.legend>0?`<span class="badge">${S.chests+S.legend}</span>`:""}<small>${CW()}s · Missions · Power-ups · Trails · Story</small></button>
 <div class="card center"><div class="small">BEST SCORE</div><div class="big">${S.best}</div><div>Rank: <b>${GAME.ranks[rk].name}</b></div>
 ${nxt?`<div class="small">Next: ${nxt.name} at ${nxt.at}</div><div class="prog"><div style="width:${Math.min(100,S.best/nxt.at*100)}%"></div></div>`:"<div class='small'>Top rank reached!</div>"}</div>
 <div class="card"><b>${GAME.skinLabel}</b><div class="skins">${GAME.skins.map((s,i)=>{const ok=sk.includes(s);return `<button class="skin ${S.skin===i?"on":""}" data-i="${i}" ${ok?"":"disabled"}><span style="background:${s.swatch}"></span>${s.name}<small>${ok?"":s.premium?"Shop":s.streak?s.streak+"-day streak":"Best "+s.at}</small></button>`}).join("")}</div></div>
 ${!owns("removeads")?`<button class="btn" id="mAds">${isChild()?"Shop: extra continue":"Remove Ads"}</button>`:""}
 <div class="tabs"><button class="btn alt" id="mShop">Shop</button>${gamesAllowed()?'<button class="btn alt" id="mLb">🏆 Leaderboard</button>':""}<button class="btn alt" id="mHow">How to play</button><button class="btn alt" id="mHelp">Help</button></div>
 <div class="tabs"><button class="btn alt" id="mAbout">About</button>${feedbackAllowed()?'<button class="btn alt" id="mFb">💬 Feedback</button>':""}<button class="btn alt" id="mSnd">${S.muted?"Sound off":"Sound on"}</button></div><div style="height:60px"></div></div>`;
 $("#mPlay").onclick=()=>{Sfx.sparkle();startRun()}; $("#mRw").onclick=()=>{Sfx.click();rewards()};
 ui.querySelectorAll(".skin").forEach(e=>e.onclick=()=>{S.skin=+e.dataset.i;save();Sfx.click();menu()}); if(window.__gift){const g=window.__gift;window.__gift=null;giftPopup(g)} else checkUpdate();
 [$("#mAds"),$("#mShop")].forEach(e=>e&&(e.onclick=shop)); $("#mHelp").onclick=help; if($("#mLb"))$("#mLb").onclick=()=>leaderboard(menu); $("#mAbout").onclick=about; if($("#mFb"))$("#mFb").onclick=feedback; $("#mHow").onclick=()=>{S.tut=false;tutorial()};
 $("#mSnd").onclick=()=>{setMuted(!S.muted);menu()} }
function shop(){ const singles=PRODUCTS.filter(p=>!p.bundle),bun=PRODUCTS[0],total=singles.reduce((a,p)=>a+parseFloat(p.price.replace(/[^0-9.]/g,"")),0);
 ui.innerHTML=`<div class="panel"><div class="title" style="font-size:36px">Shop</div>
 ${isChild()?'<div class="card small">Ads are already disabled for this profile. Remove Ads still includes one free continue per run. Premium Looks unlocks the two premium appearances.</div>':""}
 ${!owns(bun.id)?`<div class="card best"><span class="tag">BEST VALUE</span><h2>${bun.name}</h2><div class="small">${bun.desc}</div><p><s>$${total.toFixed(2)}</s></p><button class="btn" data-id="${bun.id}">${bun.price}</button></div>`:""}
 ${reviewAccessActive?'<div class="card small" role="status">Premium review access is active. No purchase was made. Turn it off in About &gt; Review access to test the normal shop.</div>':""}
 ${singles.map(p=>`<div class="card"><b>${p.name}</b><div class="small">${p.desc}</div>${owns(p.id)?`<p>${ownershipLabel(p.id)}</p>`:`<button class="btn alt" data-id="${p.id}">${p.price}</button>`}</div>`).join("")}
 <div class="small center">Purchases are cosmetic or convenience only. Scores are never for sale.</div>
 <button class="btn alt" id="sR">Restore purchases</button><button class="btn" id="sB">Back</button></div>`;
 ui.scrollTop=0;
 ui.querySelectorAll("[data-id]").forEach(e=>e.onclick=()=>Platform.buy(e.dataset.id)); $("#sR").onclick=()=>Platform.restore(); $("#sB").onclick=menu }
function help(){ const faq=[["How do I play?",GAME.tips.map(tipText).join(" ")],["My purchase is missing","Tap Restore purchases in the Shop. Purchases are tied to your Google account or Microsoft account."],
 ["I want a refund","Google Play: play.google.com → Order history → Request a refund. Microsoft Store: account.microsoft.com → Order history."],
 ["Move my progress to another device","Tap Copy transfer code on your old device, then Paste transfer code on the new one."],
 ["Too many ads?","Ads never show during a run. Buy Remove Ads once to turn them off for good."],
 ["Game is laggy","Close other apps, turn off battery saver, and restart the device."],
 ["Keyboard controls (PC)",GAME.keyHelp],["Delete my data","Tap Delete my data below. This erases your save on this device."]];
 ui.innerHTML=`<div class="panel"><div class="title" style="font-size:36px">Help</div><input id="hQ" placeholder="Search help">
 <div id="hL">${faq.map(f=>`<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join("")}</div>
 <button class="btn alt" id="hC">Copy transfer code</button><button class="btn alt" id="hP">Paste transfer code</button>
 <button class="btn alt" id="hAd">Ad privacy choices</button><button class="btn alt" id="hD">Delete my data</button><a class="small" href="privacy.html" style="color:inherit">Privacy Policy</a><a class="small" href="terms.html" style="color:inherit">Terms of Use</a><button class="btn" id="hB">Back</button></div>`;
 $("#hQ").oninput=e=>ui.querySelectorAll("details").forEach(d=>d.style.display=d.textContent.toLowerCase().includes(e.target.value.toLowerCase())?"":"none");
 $("#hC").onclick=()=>{const c=btoa(unescape(encodeURIComponent(JSON.stringify(portableProgress(S)))));navigator.clipboard?.writeText(c);prompt("Your progress code (purchases restore through Google Play):",c)};
 $("#hP").onclick=()=>{const c=prompt("Paste your transfer code:");if(!c)return;try{const d=JSON.parse(decodeURIComponent(escape(atob(c.trim()))));
  const progress=portableProgress(d);progress.best=Math.max(progress.best||0,S.best);S=Object.assign({},S,progress);if(!skinsUnlocked().includes(GAME.skins[S.skin]))S.skin=0;save();alert("Progress transferred. Your privacy settings are unchanged. Use Restore purchases for items bought with your Google account.");menu()}catch(e){alert("That code didn't work. Copy it again.")}};
 $("#hAd").onclick=()=>Platform.ads.privacy(); $("#hD").onclick=async()=>{if(confirm("Delete this device's game data and unsent feedback? Already sent feedback and Google-managed data are not deleted here. Purchases can be restored from Google Play. The Android app may close; reopen it to set up a new profile.")){
  ui.innerHTML='<div class="panel center"><h2>Resetting local data</h2><p>Please wait. The app may close when the reset is recorded.</p></div>';
  try{const reset=await deleteLocalGameData();if(!reset?.restartRequired)location.reload()}
  catch(e){ui.innerHTML='<div class="panel center"><h2>Reset needs attention</h2><p>The reset could not be completed. Close and reopen the app before trying again. Play Games and ads remain blocked in this screen.</p></div>'}
 }}; $("#hB").onclick=menu }
function portableProgress(data){
 if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("Invalid progress");
 const out={};
 for(const key of ["best","runs","total","streak","streakBest","tokens","cm","chests","legend","boost","skin","trail"]){
  const value=data[key];if(Number.isSafeInteger(value)&&value>=0)out[key]=value;
 }
 for(const key of ["gifts","trails","storyRead"]){
  if(Array.isArray(data[key]))out[key]=data[key].filter(v=>Number.isSafeInteger(v)&&v>=0).slice(0,1000);
 }
 if(typeof data.lastDay==="string"&&/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{2} \d{4}$/.test(data.lastDay))out.lastDay=data.lastDay;
 return out;
}
async function deleteLocalGameData(){
 if(resetInProgress)throw new Error("A reset is already in progress.");
 resetInProgress=true;profileReady=false;
 feedbackEpoch++;for(const controller of feedbackRequests)controller.abort();
 Platform.ads.suspend();
 reviewAccessActive=false;
 S=freshState();
 Platform.games.configure(()=>null);
 // Persist the reset independently of WebView BEFORE deleting keys or closing.
 if(Platform.native)await localProfileBridge().beginLocalReset();
 let result;
 try{deleteStoredGameKeys()}
 finally{
  result=await Platform.games.reset();
  if(Platform.native&&!result)throw new Error("The native reset was not acknowledged.");
 }
 return result;
}
function about(){ ui.innerHTML=`<div class="panel"><div class="card">${GAME.lore.portrait?`<img src="${GAME.lore.portrait}" alt="${GAME.lore.hero}" style="width:45%;float:right;margin:0 0 8px 10px">`:""}<h2>${GAME.lore.hero}</h2><p>${GAME.lore.bio}</p></div><div class="card"><h3>How it works</h3><p>${GAME.lore.systems}</p></div>
 <div class="small">${GAME.title}™ © 2026 Starvessa Games. All rights reserved. All characters, artwork, music, and code are original works.</div><div class="small">Version ${GAME.version}</div><button class="btn alt" id="cW">✨ What's new</button><button class="btn alt" id="cReview">Review access</button><button class="btn" id="cB">Back</button></div>`; $("#cB").onclick=menu; $("#cW").onclick=()=>patchNotes(true); $("#cReview").onclick=reviewAccess }
function reviewAccess(){
 if(document.getElementById("reviewAccessDialog"))return;
 const o=document.createElement("div"),focusBefore=document.activeElement;
 o.id="reviewAccessDialog";o.className="overlay";
 o.style.cssText="padding:16px;box-sizing:border-box;z-index:100";
 o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-labelledby","reviewAccessTitle");
 o.innerHTML=`<div class="panel" style="max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain">
  <h2 id="reviewAccessTitle">Review access</h2>
  <div class="card small">A developer-issued code grants access to the same Remove Ads benefits and Premium Looks sold in the Shop. It does not make a purchase, alter scores, or change the game rules.</div>
  <div class="card small">The live leaderboard still requires Google Play Games sign-in. This code does not sign you in to Google or replace the live leaderboard.</div>
  ${reviewAccessActive?`<div class="card" role="status"><b>Premium review access is active</b><p class="small">Access stays on after reopening the game. Turning it off keeps your actual purchases and progress. An unpurchased premium look will be unequipped.</p></div><button class="btn alt" id="reviewDisable">Turn off review access</button>`:
  `<form id="reviewAccessForm"><label for="reviewCode">Review access code</label><input id="reviewCode" type="text" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="reviewMsg" style="width:100%;box-sizing:border-box" required><button class="btn" id="reviewEnable" type="submit" style="width:100%">Enable premium review access</button></form>`}
  <div class="small" id="reviewMsg" role="status" aria-live="polite" style="min-height:1.5em;margin:12px 0"></div>
  <button class="btn alt" id="reviewClose">Back</button>
 </div>`;
 document.body.appendChild(o);
 let busy=false;
 const close=()=>{if(busy)return;document.removeEventListener("keydown",keys,true);o.remove();if(focusBefore&&focusBefore.isConnected)focusBefore.focus()};
 const keys=e=>{
  if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();close()}
  if(e.key==="Tab"){
   const list=[...o.querySelectorAll("input,button")].filter(x=>!x.disabled),first=list[0],last=list[list.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 };
 document.addEventListener("keydown",keys,true);
 o.querySelector("#reviewClose").onclick=close;
 const msg=o.querySelector("#reviewMsg"),form=o.querySelector("#reviewAccessForm");
 if(form)form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;busy=true;
  const button=o.querySelector("#reviewEnable");button.disabled=true;button.textContent="Checking code...";
  try{
   if(!await enableReviewAccess(o.querySelector("#reviewCode").value)){msg.textContent="That code did not match. Check it and try again.";return}
   busy=false;close();menu();toast("Premium review access enabled. No purchase was made.");
  }catch(error){msg.textContent="Access could not be saved. Close and reopen the game, then try again."}
  finally{busy=false;if(button.isConnected){button.disabled=false;button.textContent="Enable premium review access"}}
 };
 const disable=o.querySelector("#reviewDisable");
 if(disable)disable.onclick=()=>{
  try{disableReviewAccess();close();menu();toast("Review access turned off. Actual purchases are unchanged.")}
  catch(error){msg.textContent="Access could not be turned off. Close and reopen the game, then try again."}
 };
 (o.querySelector("#reviewCode")||disable||o.querySelector("#reviewClose")).focus();
}
// ---------- What's new (patch notes) ----------
// Each game lists updates in GAME.patchNotes, newest first. Write them in plain, friendly words.
function checkUpdate(){ const v=GAME.version; if(S.seenVer===v)return; if(!S.seenVer&&!S.runs){S.seenVer=v;save();return} patchNotes(false) }
function patchNotes(all){ const list=all?GAME.patchNotes:GAME.patchNotes.filter(n=>!S.seenVer||vcmp(n.v,S.seenVer)>0), o=document.createElement("div"); if(!list.length)return;
 o.className="overlay pnw"; o.innerHTML=`<div class="panel pnp"><button class="pnx" aria-label="Close">✕</button><div class="pnhead">✨ What's new</div>
 ${list.map(n=>`<div class="pnv"><div class="pntag">Update ${n.v}<small>${n.date}</small></div>${n.title?`<h3>${n.title}</h3>`:""}<ul>${n.notes.map(x=>`<li><span>${x[0]}</span><div>${x[1]}</div></li>`).join("")}</ul></div>`).join("")}
 <button class="btn" id="pnOk">Awesome, let's play!</button></div>`; document.body.appendChild(o);
 const close=()=>{S.seenVer=GAME.version;save();o.remove();Sfx.click()}; o.querySelector(".pnx").onclick=close; o.querySelector("#pnOk").onclick=close; o.onclick=e=>{if(e.target===o)close()} }
const vcmp=(a,b)=>{a=a.split(".").map(Number);b=b.split(".").map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)-(b[i]||0)}return 0};
// ---------- Feedback (sent inside the game, no email app) ----------
// Messages go to your inbox through Web3Forms (free). Put your access key below. See Docs/FEEDBACK_SETUP.md.
const FEEDBACK_KEY="8bfd5701-dd13-4011-96c4-3d3ccfa62f9d";
const under13=()=>minimumAge()<13;
let feedbackEpoch=0,feedbackFlushing=false;
const feedbackRequests=new Set();
function feedbackQueue(){
 if(!feedbackAllowed()){localStorage.removeItem(FB_QUEUE);return []}
 try{
  const q=JSON.parse(localStorage.getItem(FB_QUEUE)||"[]");
  const safe=Array.isArray(q)?q.filter(d=>d&&d.Age_group==="16+").slice(-5):[];
  if(JSON.stringify(q)!==JSON.stringify(safe))localStorage.setItem(FB_QUEUE,JSON.stringify(safe));
  return safe;
 }catch(e){localStorage.removeItem(FB_QUEUE);return []}
}
async function sendFb(d,epoch=feedbackEpoch){
 if(epoch!==feedbackEpoch)throw new Error("Feedback deleted");
 if(!feedbackAllowed()||!d||d.Age_group!=="16+")throw new Error("Feedback is not enabled for this profile");
 const controller=new AbortController();feedbackRequests.add(controller);
 try{
  const r=await fetch("https://api.web3forms.com/submit",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(d)});
  const j=await r.json().catch(()=>({}));if(epoch!==feedbackEpoch)throw new Error("Feedback deleted");
  if(!r.ok||j.success===false)throw new Error(j.message||"send failed");
 }finally{feedbackRequests.delete(controller)}
}
async function flushFb(){
 if(!feedbackAllowed()){feedbackQueue();return}
 if(feedbackFlushing||!navigator.onLine)return;
 const epoch=feedbackEpoch;feedbackFlushing=true;
 try{
  const batch=feedbackQueue();
  for(const d of batch){
   if(epoch!==feedbackEpoch)return;
   try{
    await sendFb(d,epoch);if(epoch!==feedbackEpoch)return;
    const q=feedbackQueue(),i=q.findIndex(item=>JSON.stringify(item)===JSON.stringify(d));
    if(i>=0)q.splice(i,1);localStorage.setItem(FB_QUEUE,JSON.stringify(q));
   }catch(e){if(epoch!==feedbackEpoch)return}
  }
 }finally{feedbackFlushing=false}
}
// Retry listeners are installed only after the native reset marker is read.
function feedback(){
 if(!feedbackAllowed()){
  ui.innerHTML='<div class="panel"><div class="title">Feedback</div><div class="card">In-app feedback is not enabled for this profile.</div><button class="btn" id="fB">Back</button></div>';
  ui.scrollTop=0;$("#fB").onclick=menu;return;
 }
 const kid=false; let kind="Idea", stars=0, last=+(localStorage.getItem(KEY+"_fbt")||0);
 ui.innerHTML=`<div class="panel"><div class="title" style="font-size:36px">Feedback</div>
 <div class="card"><b>How much do you like ${GAME.title}?</b><div class="fstars">${[1,2,3,4,5].map(i=>`<button data-s="${i}" aria-label="${i} stars">★</button>`).join("")}</div></div>
 <div class="card"><b>What kind of feedback?</b><div class="fkinds">${[["😍","Love it"],["💡","Idea"],["🐞","Something's broken"],["😤","Too hard"],["😴","Too easy"]].map(k=>`<button class="${k[1]==="Idea"?"on":""}" data-k="${k[1]}">${k[0]} ${k[1]}</button>`).join("")}</div></div>
 ${kid?`<div class="card small">Thanks for helping! Just tap your stars and a feedback type, then Send. To write a longer message, ask a parent or guardian.</div>`:
 `<div class="card"><b>Tell us more</b><textarea id="fT" maxlength="600" rows="5" placeholder="What happened, or what would make the game more fun?"></textarea><div class="fcount small"><span id="fN">0</span>/600</div>
 <input id="fE" type="email" maxlength="100" placeholder="Your email (optional)" autocomplete="email">
 <div class="small">Please don't share your address, phone number or other private details.</div></div>`}
 <input id="fBot" type="checkbox" tabindex="-1" autocomplete="off" style="display:none">
 <div id="fMsg" class="small center" style="min-height:1.2em"></div>
 <button class="btn" id="fS">Send feedback</button>${Platform.review?`<button class="btn alt" id="fR">⭐ Rate us on Google Play</button>`:""}<button class="btn alt" id="fB">Back</button></div>`;
 ui.scrollTop=0;
 const msg=t=>$("#fMsg").textContent=t;
 ui.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{stars=+b.dataset.s;ui.querySelectorAll("[data-s]").forEach(x=>x.classList.toggle("on",+x.dataset.s<=stars));Sfx.click()});
 ui.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{kind=b.dataset.k;ui.querySelectorAll("[data-k]").forEach(x=>x.classList.toggle("on",x===b));Sfx.click()});
 $("#fT")&&($("#fT").oninput=e=>$("#fN").textContent=e.target.value.length);
 $("#fS").onclick=async()=>{ const t=kid?"":$("#fT").value.trim(), em=kid?"":$("#fE").value.trim();
  if(!t&&!stars)return msg("Pick some stars or write a note first.");
  if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return msg("That email doesn't look right. Check it or leave it blank.");
  if(Date.now()-last<60000)return msg("Thanks! Please wait a minute before sending another message.");
  if($("#fBot").checked)return;
  const d={access_key:FEEDBACK_KEY,subject:`${GAME.title} feedback: ${kind}${stars?` (${stars}★)`:""}`,from_name:`${GAME.title} player`,
   Game:`${GAME.title} ${GAME.version}`,Rating:stars?stars+"/5":"-",Type:kind,Message:t||"(no message)",Best_score:S.best,Rank:GAME.ranks[rank()]?.name||"",
   Age_group:kid?"Under 13 (no text allowed)":isChild()?"13-15":"16+",Device:(navigator.userAgentData?.platform||navigator.platform||"")+" · "+innerWidth+"x"+innerHeight};
  if(em){d.email=em;d.replyto=em}
  const b=$("#fS"),epoch=feedbackEpoch; b.disabled=true; b.textContent="Sending…";
  try{ if(!navigator.onLine)throw new Error("offline"); await sendFb(d,epoch);if(epoch===feedbackEpoch)done(true) }
  catch(e){if(epoch!==feedbackEpoch||!feedbackAllowed())return;const q=feedbackQueue();q.push(d);localStorage.setItem(FB_QUEUE,JSON.stringify(q.slice(-5)));done(false)} };
 function done(sent){ localStorage.setItem(KEY+"_fbt",Date.now()); Sfx.sparkle();
  ui.innerHTML=`<div class="panel center"><div class="giftbox">💌</div><div class="title" style="font-size:32px">Thank you!</div><div class="card">${sent?"Your message was sent. We read every one and use your ideas to make the game better.":navigator.onLine?"We couldn't reach our mailbox just now, so your message is saved. It will send by itself the next time you open the game.":"You're offline right now, so your message is saved. It will send by itself next time you're connected."}</div><button class="btn" id="fB">Back to menu</button></div>`; $("#fB").onclick=menu }
 $("#fR")&&($("#fR").onclick=()=>Platform.review()); $("#fB").onclick=menu }
function route(fromWelcome){ if(!fromWelcome)return welcome(); if(!validBirth(S.birth))return ageGate(); if(!S.name)return login(); if(!S.tut)return tutorial(); menu() }
async function initializeLocalProfile(){
 try{
  const state=Platform.native?await localProfileBridge().getLocalDataEpoch():{epoch:""};
  loadLocalProfile(state?.epoch);
  sndIcon();
  Platform.ads.configure(()=>profileReady&&!resetInProgress&&!isChild()&&!owns("removeads"));
  Platform.games.configure(()=>S.birth);
  Platform.games.syncAge();
  // Drop queued child/unknown-age feedback before any startup retry.
  feedbackQueue();
  addEventListener("online",flushFb);setTimeout(flushFb,4000);
  Platform.initStore(grant);if(validBirth(S.birth))Platform.ads.init(isChild());route(false);
 }catch(e){
  profileReady=false;S=freshState();reviewAccessActive=false;
  ui.innerHTML='<div class="panel center"><h2>Unable to open local profile</h2><p>Local profile setup could not be completed. Close and reopen the app before continuing.</p></div>';
 }
}
initializeLocalProfile();
// The Android app ships its files inside the app, so it must not use the offline cache (it would keep
// serving old files after updates). Remove any cache left by earlier versions; keep it for the web/PWA build.
{ const nativeApp=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
 if("serviceWorker"in navigator){
  if(nativeApp||window.NO_SW){
   navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
   if(window.caches)caches.keys().then(ks=>ks.filter(k=>k.startsWith("heavensflight-")).forEach(k=>caches.delete(k))).catch(()=>{});
  } else if(location.protocol==="https:")navigator.serviceWorker.register("sw.js");
 } }
