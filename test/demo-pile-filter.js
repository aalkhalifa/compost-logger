// Demo-pile duplication fix: sample detection, upload filtering, merge stripping,
// and the convergence property that was actually broken on the iPhone.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','beta/index.html'),'utf8');
function grab(a,b){const i=src.indexOf(a);if(i<0)throw new Error('missing '+a);const j=src.indexOf(b,i)+b.length;return src.slice(i,j);}

const CODE=[
  grab("function sampleEntryCount(){","\n}"),
  grab("function isSamplePile(p){","\n}"),
  grab("function mergeCloudData(remote,opts){","\n  migrateSites();\n}"),
  grab("function pbBuildPayload(){","\n}"),
].join("\n");

const DEF_HIST={highN:[],greens:[],browns:[]};
let uidN=0;
const FIXED=1750000000000;
Date.now=()=>FIXED;

const ctx={};
new Function('ctx','DEF_HIST','uid',`
  let piles,sites,recipes,ingHist,tempUnit,volumeUnit,containerUnit,deletedPileIds;
  let _sampleEntryCount=null;
  // Stub SAMPLE_CSV with exactly 71 entry rows, matching the real one.
  const SAMPLE_CSV="[PILE]\\nName,Demo Pile\\n\\n[ENTRIES]\\nDate,Time,Core\\n"+
    Array.from({length:71},(_,i)=>"2026-04-01,08:0"+(i%10)+",1"+(20+i%50)).join("\\n");
  let displayBasis,showPFRP,pilesSortMode,entriesSortMode;
  function migrateSites(){ if(!Array.isArray(sites))sites=[]; }
  ${CODE}
  ctx.set=(p)=>{piles=p;sites=[];recipes=[];ingHist=DEF_HIST;tempUnit="F";
    volumeUnit="gal";containerUnit={};deletedPileIds=[];
    displayBasis="avg";showPFRP=true;pilesSortMode="recent";entriesSortMode="newest";};
  ctx.piles=()=>piles;
  ctx.isSample=(p)=>isSamplePile(p);
  ctx.payload=()=>pbBuildPayload();
  ctx.merge=(r,o)=>mergeCloudData(r,o);
  ctx.entryCount=()=>sampleEntryCount();
`)(ctx,DEF_HIST,()=>"uid"+(++uidN));

const DEMO   ={id:"d1",name:"Demo Pile — 30 Days",isSample:true,entries:Array.from({length:71},(_,i)=>({id:"a"+i}))};
const DEMO_LC={id:"d2",name:"Demo Pile — 30 Days — Local Copy",isSample:true,entries:Array.from({length:71},(_,i)=>({id:"b"+i}))};
const LEGACY ={id:"d3",name:"Demo Pile — 30 Days",entries:Array.from({length:71},(_,i)=>({id:"c"+i}))};  // no flag
const ADOPTED={id:"d4",name:"Demo Pile — 30 Days",isSample:false,lastModified:123,entries:[{id:"y"}]};
const RENAMED={id:"d5",name:"My Real Pile",isSample:true,lastModified:456,entries:[]}; // old build left the flag set
const E71=Array.from({length:71},(_,i)=>({id:"s"+i}));
const VAULT_DEMO   ={id:"mqive18omnwflg94pr",name:"Demo Pile — 30 Days",entries:E71.slice()};
const VAULT_DEMO_LC={id:"mqsd5pv5lxpfmd46h5",name:"Demo Pile — 30 Days — Local Copy",entries:E71.slice()};
const ADOPTED_LEGACY={id:"adl",name:"Demo Pile — 30 Days",entries:E71.concat([{id:"mine1"},{id:"mine2"}])};
const REAL   ={id:"r1",name:"North Windrow",lastModified:999,entries:[{id:"e1"}]};

let pass=0,fail=0;
function t(n,f){uidN=0;try{f();pass++;console.log("  PASS  "+n);}catch(e){fail++;console.log("  FAIL  "+n+"\n        "+e.message);}}
function eq(a,b,w){const x=JSON.stringify(a),y=JSON.stringify(b);if(x!==y)throw new Error((w||"")+" expected "+y+" got "+x);}

console.log("-- isSamplePile --");
t("flagged demo pile IS sample",()=>eq(ctx.isSample(DEMO),true));
t("rename-on-conflict duplicate IS sample",()=>eq(ctx.isSample(DEMO_LC),true));
t("legacy unflagged demo pile IS sample",()=>eq(ctx.isSample(LEGACY),true));
t("ADOPTED demo pile (edited) is NOT sample - no data loss",()=>eq(ctx.isSample(ADOPTED),false));
t("RENAMED demo pile is NOT sample - no data loss",()=>eq(ctx.isSample(RENAMED),false));
t("real pile is NOT sample",()=>eq(ctx.isSample(REAL),false));
t("RENAMED by an OLD build (flag still true) is NOT sample - no data loss",()=>eq(ctx.isSample(RENAMED),false));
t("demo name but entries added (old build, flag still true) is NOT sample",()=>eq(ctx.isSample(
  {id:"x",name:"Demo Pile — 30 Days",isSample:true,entries:Array.from({length:80},(_,i)=>({id:"g"+i}))}),false));

console.log("-- upload filter (pbBuildPayload) --");
t("demo pile excluded from vault payload",()=>{
  ctx.set([DEMO,REAL]);
  eq(ctx.payload().piles.map(p=>p.name),["North Windrow"]);});
t("the exact iPhone vault contents get purged on next save",()=>{
  ctx.set([REAL,DEMO,DEMO_LC,{id:"d6",name:"Demo Pile — 30 Days — Local Copy",isSample:true,entries:Array.from({length:71},(_,i)=>({id:"d"+i}))},
    {id:"d7",name:"Demo Pile — 30 Days — Local Copy",isSample:true,entries:Array.from({length:71},(_,i)=>({id:"e"+i}))}]);
  eq(ctx.payload().piles.map(p=>p.name),["North Windrow"]);});
t("adopted demo pile IS uploaded",()=>{
  ctx.set([ADOPTED,REAL]);
  eq(ctx.payload().piles.length,2,"count");});
t("payload still carries settings",()=>{
  ctx.set([REAL]);
  const p=ctx.payload();
  eq(p.displayBasis,"avg");eq(p.showPFRP,true);eq(p.pilesSortMode,"recent");});

console.log("-- merge strips legacy junk already in a vault (PB only) --");
t("dropSamplePiles:true removes demo + duplicates pulled from remote",()=>{
  ctx.set([REAL]);
  ctx.merge({piles:[REAL,DEMO,DEMO_LC],sites:[],recipes:[],deletedPileIds:[]},
    {mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true,dropSamplePiles:true});
  eq(ctx.piles().map(p=>p.name),["North Windrow"]);});
t("Drive (no flag) keeps them - behavior unchanged",()=>{
  ctx.set([REAL]);
  ctx.merge({piles:[REAL,DEMO,DEMO_LC],sites:[],recipes:[],deletedPileIds:[]},
    {mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true});
  eq(ctx.piles().length,3,"Drive must be untouched");});
t("adopted demo pile survives the PB merge",()=>{
  ctx.set([ADOPTED]);
  ctx.merge({piles:[],sites:[],recipes:[],deletedPileIds:[]},
    {mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true,dropSamplePiles:true});
  eq(ctx.piles().map(p=>p.name),["Demo Pile — 30 Days"]);});

console.log("-- CONVERGENCE: the actual iPhone bug --");
t("fresh install regenerating the demo pile no longer accumulates Local Copies",()=>{
  // Simulate 5 sign-ins, each from a fresh install that regenerated the demo pile
  // with a NEW id - the exact sequence that produced 5 duplicates.
  let vault={piles:[REAL],sites:[],recipes:[],deletedPileIds:[]};
  for(let i=0;i<5;i++){
    const fresh={id:"fresh"+i,name:"Demo Pile — 30 Days",isSample:true,entries:Array.from({length:71},(_,j)=>({id:"f"+i+"_"+j}))};
    ctx.set([fresh,Object.assign({},REAL)]);
    ctx.merge(vault,{mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,
      strictSitesGuard:true,dropSamplePiles:true});
    vault={piles:ctx.payload().piles,sites:[],recipes:[],deletedPileIds:[]};  // what gets pushed
  }
  const names=vault.piles.map(p=>p.name);
  const copies=names.filter(n=>n.indexOf("Local Copy")>=0).length;
  if(copies)throw new Error("accumulated "+copies+" Local Copy duplicates: "+JSON.stringify(names));
  eq(names,["North Windrow"],"final vault");});

console.log("-- REGRESSION: the real vault, demo piles on BOTH sides (merge stamps lastModified) --");
t("legacy demo pile with merge-stamped lastModified is STILL sample",()=>{
  const stamped=Object.assign({},VAULT_DEMO,{lastModified:1784536846702});
  eq(ctx.isSample(stamped),true,"must not be fooled by a merge stamp");});
t("the exact failing scenario: demo piles on both sides get purged",()=>{
  ctx.set([Object.assign({},VAULT_DEMO),Object.assign({},VAULT_DEMO_LC),Object.assign({},REAL)]);
  ctx.merge({piles:[VAULT_DEMO,VAULT_DEMO_LC,REAL],sites:[],recipes:[],deletedPileIds:[]},
    {mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true,dropSamplePiles:true});
  eq(ctx.piles().map(p=>p.name),["North Windrow"],"after merge");
  eq(ctx.payload().piles.map(p=>p.name),["North Windrow"],"pushed payload");});
t("adopted LEGACY demo pile (extra entries) survives - no data loss",()=>{
  ctx.set([Object.assign({},ADOPTED_LEGACY)]);
  ctx.merge({piles:[ADOPTED_LEGACY],sites:[],recipes:[],deletedPileIds:[]},
    {mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true,dropSamplePiles:true});
  eq(ctx.piles().length,1,"adopted legacy pile must survive");});
t("isSample:false (user edited) survives a merge stamp",()=>{
  const adopted={id:"z",name:"Demo Pile — 30 Days",isSample:false,lastModified:999,entries:E71.slice()};
  eq(ctx.isSample(adopted),false);});
t("sampleEntryCount reads 71 from SAMPLE_CSV",()=>{
  const stamped={id:"q",name:"Demo Pile — 30 Days",entries:E71.slice()};
  eq(ctx.isSample(stamped),true,"71-entry pristine pile");
  const oneMore={id:"q2",name:"Demo Pile — 30 Days",entries:E71.concat([{id:"x"}])};
  eq(ctx.isSample(oneMore),false,"72 entries = adopted");});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
