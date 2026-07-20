// Run the REAL vault through the fixed code path: local device merges the vault, then
// builds the payload it would push. No mocking of pile data - this is the actual blob.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','beta/index.html'),'utf8');
function grab(a,b){const i=src.indexOf(a);const j=src.indexOf(b,i)+b.length;return src.slice(i,j);}
const CODE=[grab("function sampleEntryCount(){","\n}"),grab("function isSamplePile(p){","\n}"),
  grab("function mergeCloudData(remote,opts){","\n  migrateSites();\n}"),
  grab("function pbBuildPayload(){","\n}")].join("\n");
const vaultPath=process.argv[2];
if(!vaultPath){
  console.error("usage: node test/real-vault-dryrun.js <vault.json>\n"+
    "  Export a vault's data blob first (admin token required):\n"+
    "    curl -s http://127.0.0.1:8090/api/collections/vaults/records -H \"Authorization: $TK\" \\\n"+
    "      | python3 -c 'import sys,json;print(json.dumps(json.load(sys.stdin)[\"items\"][0][\"data\"]))' > /tmp/vault.json\n"+
    "  Never commit the file - it is real user data.");
  process.exit(2);
}
const vault=JSON.parse(fs.readFileSync(vaultPath,'utf8'));
const DEF_HIST={highN:[],greens:[],browns:[]};
let uidN=0; Date.now=()=>1750000000000;
const ctx={};
new Function('ctx','DEF_HIST','uid',`
  let piles,sites,recipes,ingHist,tempUnit,volumeUnit,containerUnit,deletedPileIds;
  let _sampleEntryCount=null;
  const SAMPLE_CSV=${JSON.stringify(
    "[PILE]\nName,Demo Pile\n\n[ENTRIES]\nDate,Time,Core\n"+
    Array.from({length:71},(_,i)=>"2026-04-01,08:00,120").join("\n"))};
  let displayBasis,showPFRP,pilesSortMode,entriesSortMode;
  function migrateSites(){ if(!Array.isArray(sites))sites=[]; }
  ${CODE}
  ctx.load=(v)=>{piles=JSON.parse(JSON.stringify(v.piles||[]));sites=v.sites||[];recipes=v.recipes||[];
    ingHist=v.ingHist||DEF_HIST;tempUnit=v.tempUnit||"F";volumeUnit=v.volumeUnit||"gal";
    containerUnit=v.containerUnit||{};deletedPileIds=v.deletedPileIds||[];
    displayBasis="avg";showPFRP=true;pilesSortMode="recent";entriesSortMode="newest";};
  ctx.merge=(r,o)=>mergeCloudData(r,o);
  ctx.piles=()=>piles;
  ctx.payload=()=>pbBuildPayload();
  ctx.count=()=>sampleEntryCount();
`)(ctx,DEF_HIST,()=>"uid"+(++uidN));

console.log("sample entry count:",ctx.count());
console.log("\nBEFORE — vault as it stands:");
vault.piles.forEach(p=>console.log("   ",(p.name||"").padEnd(40),"entries:",String((p.entries||[]).length).padStart(3),
  "isSample:",p.isSample===undefined?"-":p.isSample,"lastModified:",p.lastModified?"set":"-"));

// Device already holds the same piles (they came down from the vault); merge then push.
ctx.load(vault);
ctx.merge(vault,{mergeRecipes:true,adoptRemoteSettings:true,renameOnConflict:true,
  strictSitesGuard:true,dropSamplePiles:true});
const out=ctx.payload();

console.log("\nAFTER — what the fixed build would push:");
out.piles.forEach(p=>console.log("   ",(p.name||"").padEnd(40),"entries:",String((p.entries||[]).length).padStart(3)));
const demoLeft=out.piles.filter(p=>String(p.name||"").indexOf("Demo Pile")===0).length;
const realBefore=vault.piles.filter(p=>String(p.name||"").indexOf("Demo Pile")!==0).length;
console.log("\n  piles:",vault.piles.length,"->",out.piles.length);
console.log("  demo remaining:",demoLeft,demoLeft===0?"(CLEAN)":"(STILL DIRTY)");
console.log("  real piles preserved:",out.piles.length===realBefore?"yes, all "+realBefore:"NO — expected "+realBefore);
const lostEntries=vault.piles.filter(p=>String(p.name||"").indexOf("Demo Pile")!==0)
  .some(p=>{const m=out.piles.find(q=>q.id===p.id);return !m||(m.entries||[]).length<(p.entries||[]).length;});
console.log("  any real pile lost entries:",lostEntries?"YES - PROBLEM":"no");
process.exit(demoLeft===0 && !lostEntries ? 0 : 1);
