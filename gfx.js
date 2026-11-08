// Copyright © 2026 Starvessa Games. All rights reserved.
// gfx.js — mobile GPU helpers for the 2D canvas renderer.
//  • Texture atlas: every character sprite lives in ONE sheet (assets/atlas.webp), so the GPU keeps one texture bound.
//  • Mipmaps: each sprite is stored at 100%, 50% and 25%. We pick the smallest level that is still sharp on screen,
//    which stops shimmering on small/far sprites and saves texture bandwidth.
//  • Baking: colour filters (skins), glows, and shadows are rendered ONCE into cached bitmaps instead of every frame.
const GFX=(()=>{
 const sheet=new Image(); sheet.src=ATLAS.src; let ready=false; sheet.onload=()=>{ready=true;cache.clear()};
 const cache=new Map();
 const canFilter="filter" in CanvasRenderingContext2D.prototype;
 const mk=(w,h)=>{const c=document.createElement("canvas");c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c};
 // Pick a mip level: the first level whose pixels still cover the on-screen size (×device pixel ratio).
 function level(f,screenW){ const need=screenW*(typeof DPR!=="undefined"?DPR:1)/f.w; return need>.3?0:need>.15?1:2 }
 // A frame at a given mip level with a baked colour filter (cached — filter work happens once, not per frame).
 function tex(name,lv,filter){ const key=name+"|"+lv+"|"+filter; let c=cache.get(key); if(c)return c;
  const f=ATLAS.frames[name], [x,y,w,h]=f.m[lv]; c=mk(w,h); const g=c.getContext("2d");
  if(filter&&filter!=="none"&&canFilter) g.filter=filter; g.drawImage(sheet,x,y,w,h,0,0,w,h);
  if(ready) cache.set(key,c); return c }
 return {
  get ready(){return ready},
  frame:n=>ATLAS.frames[n],
  // Draw part of a sprite. (sx,sy,sw,sh) are in full-size pixels; the chosen mip is scaled automatically.
  draw(ctx,name,sx,sy,sw,sh,dx,dy,dw,dh,filter,lvHint){ if(!ready)return; const f=ATLAS.frames[name];
   const lv=lvHint??level(f,dw*f.w/sw), t=tex(name,lv,filter), s=f.m[lv][2]/f.w;
   ctx.drawImage(t,sx*s,sy*s,Math.max(1,sw*s),Math.max(1,sh*s),dx,dy,dw,dh) },
  level:(name,screenW)=>level(ATLAS.frames[name],screenW),
  // Baked soft glow (replaces per-frame radial gradients). Drawn scaled; one 128px bitmap per colour.
  glow(ctx,x,y,r,rgb,alpha){ const key="glow|"+rgb; let c=cache.get(key);
   if(!c){ c=mk(128,128); const g=c.getContext("2d"), gr=g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,`rgba(${rgb},1)`); gr.addColorStop(.6,`rgba(${rgb},.55)`); gr.addColorStop(1,`rgba(${rgb},0)`); g.fillStyle=gr; g.fillRect(0,0,128,128); cache.set(key,c) }
   const a=ctx.globalAlpha; ctx.globalAlpha=a*alpha; ctx.drawImage(c,x-r,y-r,r*2,r*2); ctx.globalAlpha=a },
  // Generic "bake once, reuse" for any procedurally drawn sprite (gates, fuel cans, pad lights).
  baked(key,w,h,paint){ const D=Math.min(typeof DPR!=="undefined"?DPR:1,2.5); let c=cache.get(key+"|"+D); if(!c){ c=mk(w*D,h*D); c.cw=w; c.ch=h; const g=c.getContext("2d"); g.scale(D,D); paint(g,w,h); cache.set(key+"|"+D,c) } return c }, // baked at screen sharpness; draw with c.cw x c.ch
  clear:()=>cache.clear()
 } })();
addEventListener("resize",()=>GFX.clear());
