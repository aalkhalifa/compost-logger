// C3 regression harness: prove mergeCloudData(+flags) == the two old Drive merge blocks.
const fs=require('fs');
const DIR=require('path').join(__dirname,'.fixtures');

// Deterministic: the merge stamps merged.lastModified=Date.now()
const FIXED=1750000000000;
Date.now=()=>FIXED;

// Deterministic uid for the rename-on-conflict path
let uidN=0;

const DEF_HIST={highN:["def-n"],greens:["def-g"],browns:["def-b"]};

const SRC=[
  fs.readFileSync(DIR+'/migrate.js','utf8'),
  fs.readFileSync(DIR+'/old_connect.js','utf8'),
  fs.readFileSync(DIR+'/old_sync.js','utf8'),
  fs.readFileSync(DIR+'/new_merge.js','utf8'),
].join('\n');

// Globals the merge mutates
let piles,sites,recipes,ingHist,tempUnit,deletedPileIds;
function uid(){return "uid"+(++uidN);}

const ctx={};
const runner=new Function('ctx','DEF_HIST','uid',`
  let piles,sites,recipes,ingHist,tempUnit,deletedPileIds;
  ${SRC}
  ctx.set=(s)=>{piles=s.piles;sites=s.sites;recipes=s.recipes;ingHist=s.ingHist;tempUnit=s.tempUnit;deletedPileIds=s.deletedPileIds;};
  ctx.get=()=>({piles,sites,recipes,ingHist,tempUnit,deletedPileIds});
  ctx.OLD_CONNECT=OLD_CONNECT; ctx.OLD_SYNC=OLD_SYNC; ctx.mergeCloudData=mergeCloudData;
`);
runner(ctx,DEF_HIST,uid);

const clone=o=>JSON.parse(JSON.stringify(o));

function localState(){
  return {
    piles:[
      {id:"p1",name:"Alpha",lastModified:100,siteId:"s1",entries:[{id:"e1",ts:"2026-01-01T00:00:00Z"},{id:"e2",ts:"2026-01-03T00:00:00Z"}]},
      {id:"p2",name:"LocalOnly",lastModified:200,entries:[{id:"e9",ts:"2026-01-02T00:00:00Z"}]},
      {id:"p3",name:"Duplicate",lastModified:150,entries:[]},
      {id:"p4",name:"Doomed",lastModified:50,entries:[]}
    ],
    sites:[{id:"s1",name:"Home Site",lat:1,lon:2},{id:"s2",name:"Local Site",lat:null,lon:null}],
    recipes:[{id:"r1",name:"Local newer",lastModified:900},{id:"r3",name:"Local only",lastModified:10}],
    ingHist:{highN:["local-n"],greens:["local-g"],browns:["local-b"]},
    tempUnit:"C",
    deletedPileIds:["pX"]
  };
}

// Remote variants exercising every flag-relevant branch
const REMOTES={
  "full remote (recipes, settings, name-collision, sites)":{
    piles:[
      {id:"p1",name:"Alpha",lastModified:300,entries:[{id:"e1",ts:"2026-01-01T00:00:00Z"},{id:"e3",ts:"2026-01-05T00:00:00Z"}]},
      {id:"p9",name:"Duplicate",lastModified:400,entries:[]},
      {id:"p4",name:"Doomed",lastModified:60,entries:[]}
    ],
    sites:[{id:"s1",name:"REMOTE RENAMED",lat:9,lon:9},{id:"s3",name:"Remote Site"}],
    recipes:[{id:"r1",name:"Remote older",lastModified:1},{id:"r2",name:"Remote only",lastModified:5}],
    ingHist:{highN:["remote-n"],greens:["remote-g"],browns:["remote-b"]},
    tempUnit:"F",
    deletedPileIds:["p4"]
  },
  "remote WITHOUT sites array (the wipe guard)":{
    piles:[{id:"p1",name:"Alpha",lastModified:300,entries:[]}],
    recipes:[{id:"r2",name:"Remote only",lastModified:5}],
    deletedPileIds:[]
  },
  "remote with empty sites array":{
    piles:[{id:"p1",name:"Alpha",lastModified:300,entries:[]}],
    sites:[],recipes:[],deletedPileIds:[]
  },
  "remote missing ingHist/tempUnit (DEF_HIST fallback)":{
    piles:[{id:"p1",name:"Alpha",lastModified:300,entries:[]}],
    sites:[{id:"s3",name:"Remote Site"}],recipes:[],deletedPileIds:[]
  },
  "remote pile lacking siteId (siteId preservation)":{
    piles:[{id:"p1",name:"Alpha",lastModified:999,entries:[{id:"e1",ts:"2026-01-01T00:00:00Z"}]}],
    sites:[{id:"s1",name:"Home Site"}],recipes:[],deletedPileIds:[]
  },
  "empty remote":{piles:[],sites:[],recipes:[],deletedPileIds:[]}
};

const CONNECT_FLAGS={mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,strictSitesGuard:true};
const SYNC_FLAGS={mergeRecipes:false,adoptRemoteSettings:false,renameOnConflict:false,strictSitesGuard:false};

let pass=0,fail=0;
function run(fn,remote){
  uidN=0;
  ctx.set(clone(localState()));
  fn(clone(remote));
  return ctx.get();
}

for(const [label,remote] of Object.entries(REMOTES)){
  for(const [path,oldFn,flags] of [
    ["CONNECT (initDriveStorage)",ctx.OLD_CONNECT,CONNECT_FLAGS],
    ["SYNC    (driveSaveNow)    ",ctx.OLD_SYNC,SYNC_FLAGS],
  ]){
    const before=run(oldFn,remote);
    const after=run((d)=>ctx.mergeCloudData(d,flags),remote);
    const a=JSON.stringify(before), b=JSON.stringify(after);
    if(a===b){pass++;console.log(`  PASS  ${path}  ${label}`);}
    else{
      fail++;
      console.log(`  FAIL  ${path}  ${label}`);
      console.log("    old:",a.slice(0,400));
      console.log("    new:",b.slice(0,400));
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
