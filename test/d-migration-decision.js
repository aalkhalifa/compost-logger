// Group D decision-matrix harness. Drives every branch of pbFirstRunDecision /
// pbLocalDataState / pbAdoptCloudOnly with scripted confirm() answers.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','beta/index.html'),'utf8');
function grab(start,end){const i=src.index0=src.indexOf(start);const j=src.indexOf(end,i)+end.length;return src.slice(i,j);}

const CODE=[
  grab("function sampleEntryCount(){","\n}"),
  grab("function isSamplePile(p){","\n}"),
  grab("function pbLocalDataState(){","\n}"),
  grab("function pbDropSamplePiles(){","\n}"),
  grab('function pbImportKey(){',"\n}"),
  grab("function pbGetImportDecision(){","\n}"),
  grab("function pbSetImportDecision(v){","\n}"),
  grab("function pbAdoptCloudOnly(d){","\n}"),
  grab("function pbFirstRunDecision(hasVault){","\n  return \"import\";\n}"),
].join("\n");

const DEF_HIST={highN:[],greens:[],browns:[]};
let store={};
const localStorage={getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};

let confirmQueue=[], confirmLog=[];
function confirm(m){confirmLog.push(m);return confirmQueue.length?confirmQueue.shift():false;}

const ctx={};
new Function('ctx','DEF_HIST','localStorage','confirm',`
  let piles,sites,recipes,ingHist,tempUnit,volumeUnit,containerUnit,deletedPileIds,pbUserId;
  let displayBasis,showPFRP,pilesSortMode,entriesSortMode;
  let _sampleEntryCount=null;
  const SAMPLE_CSV="[PILE]\\nName,Demo Pile\\n\\n[ENTRIES]\\nDate,Time,Core\\n"+
    Array.from({length:71},()=>"2026-04-01,08:00,120").join("\\n");
  function pbPersistLocal(){}
  function pbApplySettings(){}
  function migrateSites(){}
  function renderHome(){}
  ${CODE}
  ctx.setup=(p,uid)=>{piles=p;sites=[];recipes=[];ingHist=DEF_HIST;deletedPileIds=[];pbUserId=uid;};
  ctx.piles=()=>piles;
  ctx.decide=(hasVault)=>pbFirstRunDecision(hasVault);
  ctx.state=()=>pbLocalDataState();
  ctx.adopt=(d)=>pbAdoptCloudOnly(d);
`)(ctx,DEF_HIST,localStorage,confirm);

const E71=Array.from({length:71},(_,i)=>({id:"s"+i}));
const SAMPLE=[{id:"s",name:"Demo Pile — 30 Days",isSample:true,entries:E71.slice()}];
const LEGACY_SAMPLE=[{id:"s",name:"Demo Pile — 30 Days",entries:E71.slice()}];  // no flag (old build)
const REAL=[{id:"a",name:"North Row",entries:[{id:1},{id:2},{id:3}]},{id:"b",name:"South Row",entries:[{id:4}]}];
const MIXED=[...SAMPLE,...REAL];

let pass=0,fail=0;
function t(name,fn){
  store={};confirmQueue=[];confirmLog=[];
  try{fn();pass++;console.log("  PASS  "+name);}
  catch(e){fail++;console.log("  FAIL  "+name+"\n        "+e.message);}
}
function eq(a,b,what){const x=JSON.stringify(a),y=JSON.stringify(b);if(x!==y)throw new Error((what||"")+" expected "+y+" got "+x);}

console.log("-- classification --");
t("empty local",()=>{ctx.setup([],"u1");eq(ctx.state().state,"empty");});
t("flagged sample only",()=>{ctx.setup(SAMPLE.slice(),"u1");eq(ctx.state().state,"sample-only");});
t("LEGACY unflagged sample only (name fallback)",()=>{ctx.setup(LEGACY_SAMPLE.slice(),"u1");eq(ctx.state().state,"sample-only");});
t("real data counts exclude sample",()=>{ctx.setup(MIXED.slice(),"u1");const s=ctx.state();eq(s.state,"real");eq(s.pileCount,2,"piles");eq(s.entryCount,4,"entries");});

console.log("-- no prompt when nothing real is at stake --");
t("empty -> import, zero prompts",()=>{ctx.setup([],"u1");eq(ctx.decide(true),"import");eq(confirmLog.length,0,"prompts");});
t("sample-only -> import, zero prompts, sample DROPPED",()=>{
  ctx.setup(SAMPLE.slice(),"u1");eq(ctx.decide(true),"import");eq(confirmLog.length,0,"prompts");eq(ctx.piles().length,0,"remaining piles");});
t("legacy sample dropped too",()=>{ctx.setup(LEGACY_SAMPLE.slice(),"u1");ctx.decide(false);eq(ctx.piles().length,0);});
t("mixed -> sample NOT dropped (real data present, user decides)",()=>{
  ctx.setup(MIXED.slice(),"u1");confirmQueue=[true];eq(ctx.decide(true),"import");eq(ctx.piles().length,3);});

console.log("-- real data prompts --");
t("accept first confirm -> import, one prompt",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[true];eq(ctx.decide(true),"import");eq(confirmLog.length,1,"prompts");});
t("decline then confirm discard -> cloud, two prompts",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[false,true];eq(ctx.decide(true),"cloud");eq(confirmLog.length,2,"prompts");});
t("decline then CANCEL discard -> falls back to import (safe direction)",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[false,false];eq(ctx.decide(true),"import");eq(confirmLog.length,2,"prompts");});

console.log("-- second confirm names the exact count and the export --");
t("warning states pile count, entry count, Download My Data",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[false,true];ctx.decide(true);
  const w=confirmLog[1];
  if(w.indexOf("Discard 2 piles")<0)throw new Error("missing exact pile count: "+w);
  if(w.indexOf("4 entries")<0)throw new Error("missing entry count");
  if(w.indexOf("Download My Data")<0)throw new Error("missing export pointer");
  if(w.indexOf("cannot be undone")<0)throw new Error("missing irreversibility warning");});
t("singular grammar for one pile",()=>{
  ctx.setup([REAL[1]],"u1");confirmQueue=[false,true];ctx.decide(true);
  if(confirmLog[1].indexOf("Discard 1 pile (1 entry)")<0)throw new Error("bad singular: "+confirmLog[1]);});

console.log("-- persistence / re-prompt --");
t("decision remembered, no second prompt",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[true];ctx.decide(true);
  confirmLog=[];eq(ctx.decide(true),"import");eq(confirmLog.length,0,"prompts on 2nd call");});
t("cloud decision remembered too",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[false,true];ctx.decide(true);
  confirmLog=[];eq(ctx.decide(true),"cloud");eq(confirmLog.length,0);});
t("different account re-prompts",()=>{
  ctx.setup(REAL.slice(),"u1");confirmQueue=[true];ctx.decide(true);
  ctx.setup(REAL.slice(),"u2");confirmLog=[];confirmQueue=[true];ctx.decide(true);
  eq(confirmLog.length,1,"prompts for 2nd account");});

console.log("-- adopt-cloud-only --");
t("adopt(null) clears everything",()=>{ctx.setup(REAL.slice(),"u1");ctx.adopt(null);eq(ctx.piles(),[]);});
t("adopt(vault) replaces local wholesale",()=>{
  ctx.setup(REAL.slice(),"u1");ctx.adopt({piles:[{id:"z",name:"Cloud Pile",entries:[]}]});
  eq(ctx.piles().length,1);eq(ctx.piles()[0].name,"Cloud Pile");});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
