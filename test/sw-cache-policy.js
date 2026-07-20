// Verify the sw.js caching predicate: API hosts must NOT be cached, assets must be.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','sw.js'),'utf8');
const i=src.indexOf('const STATIC_HOSTS'), j=src.indexOf('// NETWORK-FIRST');
const self={location:{origin:'https://aalkhalifa.github.io'}};
const isCacheable=new Function('self','URL',src.slice(i,j)+'; return isCacheable;')(self,URL);

const CASES=[
  ['https://aalkhalifa.github.io/compost-logger/beta/index.html',true,'app shell'],
  ['https://aalkhalifa.github.io/compost-logger/sw.js',true,'sw itself'],
  ['https://cdn.jsdelivr.net/npm/chart.js',true,'Chart.js CDN'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/jspdf.min.js',true,'jsPDF CDN'],
  ['https://unpkg.com/xlsx/xlsx.min.js',true,'SheetJS CDN'],
  ['https://fonts.googleapis.com/css2?family=Inter',true,'fonts'],
  // The bug: these MUST be false
  ['https://democrats-rocky-dining-highs.trycloudflare.com/api/collections/vaults/records?perPage=1',false,'PB vault list (THE BUG)'],
  ['https://democrats-rocky-dining-highs.trycloudflare.com/api/health',false,'PB health'],
  ['https://www.googleapis.com/drive/v3/files?q=x',false,'Drive list'],
  ['https://api.open-meteo.com/v1/forecast?lat=1',false,'Open-Meteo'],
  ['https://api.anthropic.com/v1/messages',false,'Anthropic'],
  ['https://accounts.google.com/gsi/client',false,'GSI auth script'],
];
let pass=0,fail=0;
for(const [u,want,label] of CASES){
  const got=isCacheable(new URL(u));
  if(got===want){pass++;console.log(`  PASS  ${want?'cache  ':'BYPASS'}  ${label}`);}
  else{fail++;console.log(`  FAIL  ${label}: expected ${want} got ${got}`);}
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
