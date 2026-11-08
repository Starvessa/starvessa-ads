// Copyright © 2026 Starvessa Games. All rights reserved.
// Platform bridge. In the Android app (Capacitor) it uses Google Play Billing, AdMob, Play Games and native haptics.
// In a browser or the Windows Store (PWA) it falls back gracefully: no ads, purchases via Microsoft Store.
const Cap=window.Capacitor, native=!!(Cap&&Cap.isNativePlatform&&Cap.isNativePlatform()), P=(n)=>Cap&&Cap.Plugins&&Cap.Plugins[n];
const PRODUCTS=[
 {id:"everythingbundle",name:"Everything Bundle",desc:"Remove Ads + Premium Looks, forever",price:"$4.99",bundle:true},
 {id:"removeads",name:"Remove Ads",desc:"No more ads, plus a free continue every run",price:"$3.99"},
 {id:"premiumskins",name:"Premium Looks",desc:"2 exclusive glowing looks",price:"$1.99"}];
const Platform={
 native,
 haptic(kind){ const H=P("Haptics"); if(H){ kind==="error"?H.notification({type:"ERROR"}):kind==="success"?H.notification({type:"SUCCESS"}):H.impact({style:"LIGHT"}) } else if(navigator.vibrate) navigator.vibrate(kind==="error"?[60,40,60]:kind==="success"?25:8) },
 // ---- Purchases (Google Play Billing via cordova-plugin-purchase "CdvPurchase") ----
 // Billing fix 2026-09-29. No product IDs or other platform services changed.
 _billing:{onOwned:null,pluginPromise:null,store:null,initPromise:null,busy:false,lastError:""},
 _billingError(error){
  const message=typeof error==="string"?error:(error&&error.message)||"Unknown billing error";
  const code=error&&error.code!==undefined?` (code ${error.code})`:"";
  return message+code;
 },
 _recordBillingError(error){
  this._billing.lastError=this._billingError(error);
  console.warn("[Starvessa Billing]",this._billing.lastError);
 },
 _billingTimeout(promise,milliseconds,message){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error(message)),milliseconds);
   Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
  });
 },
 _waitForBilling(){
  const available=()=>window.CdvPurchase&&window.CdvPurchase.store
   &&typeof window.CdvPurchase.store.initialize==="function"
   &&window.CdvPurchase.ProductType&&window.CdvPurchase.Platform;
  if(available())return Promise.resolve(window.CdvPurchase);
  if(this._billing.pluginPromise)return this._billing.pluginPromise;
  // Cordova can create the namespace before creating store. Check both.
  // Polling also covers a deviceready event that fired before this script ran.
  const waiting=new Promise((resolve,reject)=>{
   let interval,timer;
   const clean=()=>{clearInterval(interval);clearTimeout(timer);document.removeEventListener("deviceready",check)};
   const check=()=>{if(available()){clean();resolve(window.CdvPurchase)}};
   document.addEventListener("deviceready",check);
   interval=setInterval(check,100);
   timer=setTimeout(()=>{clean();reject(new Error("The Android billing plugin did not become ready. Close and reopen the game. If this repeats, report: BILLING_PLUGIN_NOT_READY."))},12000);
   check();
  });
  this._billing.pluginPromise=waiting;
  waiting.then(()=>{this._billing.pluginPromise=null},()=>{this._billing.pluginPromise=null});
  return waiting;
 },
 _grantBillingProduct(id){
  if(PRODUCTS.some(p=>p.id===id)&&this._billing.onOwned)this._billing.onOwned(id);
 },
 _syncBillingProducts(){
  const store=this._billing.store; if(!store)return;
  PRODUCTS.forEach(p=>{
   const product=store.get(p.id,window.CdvPurchase.Platform.GOOGLE_PLAY);
   if(!product)return;
   if(product.pricing&&product.pricing.price)p.price=product.pricing.price;
   if(product.owned)this._grantBillingProduct(p.id);
  });
  // Update only shop purchase buttons; do not redraw gameplay or navigation.
  document.querySelectorAll("[data-id]").forEach(button=>{
   const id=button.getAttribute("data-id"), product=PRODUCTS.find(p=>p.id===id);
   if(!product)return;
   const owned=typeof owns==="function"&&owns(id);
   button.textContent=owned?"Owned":product.price;
   button.disabled=!!owned||this._billing.busy;
  });
 },
 async _getBillingStore(){
  if(!this.native)throw new Error("Purchases are available in the Android app installed from Google Play.");
  const plugin=await this._waitForBilling(),store=plugin.store,state=this._billing;
  if(state.store!==store){
   state.store=store;state.initPromise=null;
   store.error(error=>this._recordBillingError(error));
   store.register(PRODUCTS.map(p=>({id:p.id,type:plugin.ProductType.NON_CONSUMABLE,platform:plugin.Platform.GOOGLE_PLAY})));
   // Preserve the existing receipt verification and acknowledgement flow.
   // This project has no remote receipt validator configured.
   store.when()
    .approved(transaction=>transaction.verify())
    .verified(receipt=>receipt.finish())
    .finished(transaction=>{
     (transaction.products||[]).forEach(p=>this._grantBillingProduct(p.id));
     this._syncBillingProducts();
    })
    .productUpdated(()=>this._syncBillingProducts())
    .receiptUpdated(()=>this._syncBillingProducts());
  }
  // Share one initialization even if startup and a button run simultaneously.
  if(!state.initPromise)state.initPromise=Promise.resolve().then(()=>store.initialize([plugin.Platform.GOOGLE_PLAY]));
  const errors=await this._billingTimeout(state.initPromise,20000,"Google Play billing did not respond in time. Check your internet connection, then close and reopen the game.");
  if(errors&&errors.length)throw errors[0];
  this._syncBillingProducts();
  return store;
 },
 initStore(onOwned){
  this._billing.onOwned=onOwned;
  if(!this.native)return Promise.resolve();
  // Never prevent the game from opening because billing is unavailable.
  return this._getBillingStore().catch(error=>this._recordBillingError(error));
 },
 async buy(id){
  if(!PRODUCTS.some(p=>p.id===id))return alert("Unknown purchase item. Please report: "+id);
  if(this._billing.busy)return;
  this._billing.busy=true;
  document.querySelectorAll("[data-id]").forEach(button=>{
   button.disabled=true;
   if(button.getAttribute("data-id")===id)button.textContent="Connecting...";
  });
  try{
   const store=await this._getBillingStore(),platform=window.CdvPurchase.Platform.GOOGLE_PLAY;
   let product=store.get(id,platform),offer=product&&product.getOffer();
   if(!offer){
    // Products may have been activated after the app initially opened.
    this._billing.lastError="";
    await this._billingTimeout(store.update(),15000,"Google Play is taking too long to load products. Check your connection and try again.");
    this._syncBillingProducts();
    product=store.get(id,platform);offer=product&&product.getOffer();
   }
   if(!offer){
    const loaded=PRODUCTS.filter(p=>store.get(p.id,platform)?.getOffer()).map(p=>p.id).join(", ")||"none";
    throw new Error(`Google Play has not returned a purchase option for "${id}". Check that this app was installed from its Google Play test link using the invited account. Recently activated products may take time to appear.\n\nBilling diagnostic: loaded products: ${loaded}.${this._billing.lastError?"\n"+this._billing.lastError:""}`);
   }
   // No fake checkout, entitlement, or test mode: Google Play opens its own UI.
   const error=await offer.order();
   if(error&&error.code!==window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED)throw error;
  }catch(error){
   this._recordBillingError(error);
   if(error?.code!==window.CdvPurchase?.ErrorCode?.PAYMENT_CANCELLED
      ||error?.code===undefined)alert("Purchase could not start.\n\n"+this._billingError(error));
  }finally{
   this._billing.busy=false;
   this._syncBillingProducts();
   // Also restore buttons when the native billing store never became ready.
   if(!this._billing.store)document.querySelectorAll("[data-id]").forEach(button=>{
    const product=PRODUCTS.find(p=>p.id===button.getAttribute("data-id"));
    if(product){button.disabled=false;button.textContent=product.price}
   });
  }
 },
 async restore(){
  if(this._billing.busy)return;
  this._billing.busy=true;
  try{
   const store=await this._getBillingStore();
   const error=await this._billingTimeout(store.restorePurchases(),20000,"Google Play did not respond to the restore request. Check your connection and try again.");
   if(error)throw error;
   this._syncBillingProducts();
   alert("The restore check completed. Previously purchased items should unlock when Google Play finishes loading their receipts. Use the same Google account that bought them.");
  }catch(error){
   this._recordBillingError(error);
   alert("Purchases could not be restored.\n\n"+this._billingError(error));
  }finally{this._billing.busy=false;this._syncBillingProducts()}
 },
 // ---- Ads (AdMob via @capacitor-community/admob). Heaven's Flight production ad unit IDs. ----
 ads:{ ready:false,rewardReady:false,interstitialReady:false,child:true,
  eligible:()=>false,pending:null,loading:null,epoch:0,wantsBanner:false,lastError:"",
  configure(eligible){this.eligible=eligible},
  permitted(){try{return !this.child&&this.eligible()===true}catch(e){return false}},
  usable(epoch=this.epoch){return epoch===this.epoch&&this.ready&&this.permitted()},
  suspend(){
   this.epoch++;this.ready=false;this.rewardReady=false;this.interstitialReady=false;
   this.wantsBanner=false;this.pending=null;this.loading=null;
   const A=P("AdMob"); if(A)Promise.resolve(A.hideBanner()).catch(()=>{});
  },
  init(child){
   child=child!==false;
   // Approved policy: do not request consent or initialize Mobile Ads for
   // under-16 / unknown-age profiles, even if another caller permits ads.
   if(child){
    if(this.ready||this.pending||this.loading)this.suspend();
    this.child=true;return Promise.resolve(false);
   }
   if(this.child!==child){this.suspend();this.child=child}
   const A=P("AdMob");
   if(!A||!this.permitted())return Promise.resolve(false);
   if(this.ready)return Promise.resolve(true);
   if(this.pending)return this.pending;
   const epoch=this.epoch;
   const current=()=>epoch===this.epoch&&this.permitted();
   const task=(async()=>{
    try{
     // UMP is a separate service: pass its age flag before starting Mobile Ads.
     let consent=await A.requestConsentInfo({tagForUnderAgeOfConsent:this.child});
     if(!current())return false;
     if(consent.status==="REQUIRED"){
      if(!consent.isConsentFormAvailable)return false;
      consent=await A.showConsentForm();
     }
     if(!current()||consent.canRequestAds!==true)return false;
     // These enum strings are the Capacitor AdMob 8.1.0 values.
     await A.initialize({tagForChildDirectedTreatment:this.child,tagForUnderAgeOfConsent:this.child,maxAdContentRating:this.child?"General":"ParentalGuidance"});
     if(!current())return false;
     this.ready=true;this.lastError="";this.load();return true;
    }catch(e){
     if(epoch===this.epoch){this.ready=false;this.lastError=e?.message||"Ad privacy setup unavailable"}
     return false; // No permission means no ad requests; gameplay remains available.
    }
   })();
   this.pending=task;
   task.finally(()=>{if(this.pending===task)this.pending=null});
   return task;
  },
  opts(id){return {adId:id,npa:this.child}},
  async load(){
   const A=P("AdMob"),epoch=this.epoch;if(!A||!this.usable(epoch)||this.loading)return;
   const task=(async()=>{
    try{await A.prepareInterstitial(this.opts("ca-app-pub-5311996809457172/9946693610"));if(this.usable(epoch))this.interstitialReady=true}catch(e){}
    if(!this.usable(epoch))return;
    try{await A.prepareRewardVideoAd(this.opts("ca-app-pub-5311996809457172/9504960041"));if(this.usable(epoch))this.rewardReady=true}catch(e){}
   })();
   this.loading=task;
   await task;if(this.loading===task)this.loading=null;
  },
  async interstitial(){
   const A=P("AdMob");if(!A||!this.usable()||!this.interstitialReady)return;
   await this.banner(false);if(!this.usable())return;
   this.interstitialReady=false;
   try{await A.showInterstitial()}catch(e){}this.load();
  },
  async rewarded(){
   const A=P("AdMob");if(!A||!this.usable()||!this.rewardReady)return false;
   await this.banner(false);if(!this.usable())return false;
   this.rewardReady=false;
   try{const r=await A.showRewardVideoAd();this.load();return !!r}catch(e){this.load();return false}
  },
  async banner(show){
   this.wantsBanner=!!show;const A=P("AdMob");if(!A)return;
   if(!show){try{await A.hideBanner()}catch(e){}return}
   const epoch=this.epoch;
   if(!await this.init(this.child)||!this.usable(epoch)||!this.wantsBanner)return;
   try{
    await A.showBanner({...this.opts("ca-app-pub-5311996809457172/6527071782"),position:"BOTTOM_CENTER"});
    if(!this.usable(epoch)||!this.wantsBanner)await A.hideBanner();
   }catch(e){}
  },
  async privacy(){
   if(this.child){alert("Ads are disabled for this profile. No ad privacy form is needed.");return}
   const A=P("AdMob");if(!A){alert("Ad privacy choices are available in the Android app.");return}
   if(this.pending)await this.pending;
   const restoreBanner=this.wantsBanner;
   this.suspend();
   try{
    const info=await A.requestConsentInfo({tagForUnderAgeOfConsent:this.child});
    if(info.privacyOptionsRequirementStatus==="REQUIRED")await A.showPrivacyOptionsForm();
    else alert("Google does not currently require an ad privacy choices form for this profile.");
    if(await this.init(this.child)&&restoreBanner)await this.banner(true);
   }catch(e){this.lastError=e?.message||"Privacy choices unavailable";alert("Ad privacy choices could not be loaded. Ads will remain paused.")}
  } },
 // ---- Age-gated Google Play Games. Never fall back to the auto-starting plugin. ----
 games:{
  readBirth:null,epoch:0,pending:null,syncedBirth:null,ready:false,lastError:"",
  birth(){try{return this.readBirth?this.readBirth():null}catch(e){return null}},
  eligible(){
   const y=this.birth(),now=new Date().getFullYear();
   return Number.isInteger(y)&&y>=1900&&y<=now&&now-y-1>=16;
  },
  configure(readBirth){this.readBirth=readBirth;this.epoch++;this.ready=false;this.syncedBirth=null},
  async syncAge(){
   const G=native&&P("HFPlayGames");if(!G)return false;
   if(this.pending){await this.pending;if(this.pending)return false}
   const birth=this.birth(),eligible=this.eligible();
   if(eligible&&this.ready&&this.syncedBirth===birth)return true;
   const epoch=this.epoch;
   const task=(async()=>{
    try{
     const result=await G.setAgeGate({birthYear:Number.isInteger(birth)?birth:null});
     if(epoch!==this.epoch||birth!==this.birth())return false;
     this.ready=eligible&&result?.eligible===true;
     this.syncedBirth=birth;
     return this.ready;
    }catch(e){this.ready=false;this.lastError=e?.message||"Play Games unavailable";return false}
   })();
   this.pending=task;
   try{return await task}finally{if(this.pending===task)this.pending=null}
  },
  async invoke(method,args={}){
   if(!this.eligible())return false;
   const epoch=this.epoch;
   if(!await this.syncAge()||epoch!==this.epoch||!this.eligible())return false;
   try{
    await P("HFPlayGames")[method](args);
    return epoch===this.epoch&&this.eligible();
   }catch(e){this.lastError=e?.message||"Play Games unavailable";return false}
  },
  signIn(){return this.invoke("signIn")},
  score(board,v){return this.invoke("submitScore",{leaderboardID:board,totalScoreAmount:v})},
  unlock(id){return this.invoke("unlockAchievement",{achievementID:id})},
  async show(board,best){
   if(!await this.signIn())return false;
   if(best>0&&!await this.score(board,best))return false;
   return this.invoke("showLeaderboard",{leaderboardID:board});
  },
  async reset(){
   this.epoch++;this.readBirth=null;this.ready=false;this.syncedBirth=null;
   // Wait out a pending age update, then revoke native access. Native closes the
   // process if the SDK was initialized; a WebView reload cannot shut it down.
   if(this.pending)await this.pending;
   try{const G=native?P("HFPlayGames"):null;return await G?.setAgeGate({birthYear:null})}
   catch(e){this.lastError=e?.message||"Close and reopen the app before making a new profile"}
  }
 },
 async share(text){ const S=P("Share"); const url="https://play.google.com/store/apps/details?id=com.starvessa."+GAME.id;
  if(S) return S.share({text,url}); if(navigator.share) return navigator.share({text,url}).catch(()=>{}); navigator.clipboard?.writeText(text+" "+url); alert("Copied to clipboard") },
 review(){ P("InAppReview")?.requestReview?.() }
};

// ---------- Anti-copy check ----------
// If someone repackages the game under a different app ID (a clone), it refuses to run.
(async function officialCheck(){ if(!native||!window.OFFICIAL_ID)return; try{ const A=P("App"); if(!A)return; const i=await A.getInfo();
 if(i&&i.id&&i.id!==window.OFFICIAL_ID){ document.body.innerHTML='<div style="font:18px sans-serif;padding:40px;text-align:center;color:#fff;background:#222;height:100vh">This is an unofficial copy of this game.<br><br>Please download the official version from Google Play.</div>'; throw new Error("unofficial") } }catch(e){ if(e.message==="unofficial")throw e } })();
