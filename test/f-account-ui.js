// Group F harness: error mapping, mode rendering, and the updateDriveUI/updatePbUI
// mutual-yield (the one place a mistake would infinite-loop the UI).
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','beta/index.html'),'utf8');
function grab(start,end){const i=src.indexOf(start);if(i<0)throw new Error("not found: "+start);const j=src.indexOf(end,i)+end.length;return src.slice(i,j);}

const CODE=[
  grab("function pbAuthErrorMessage(err,mode){","\n}"),
  grab("function updateDriveUI(){","\n  updateAccountButton();\n}"),
  grab("function updateAccountButton(){","\n}"),
  grab("function updatePbUI(){","\n  updatePbSettingsCard();\n}"),
  grab("function updatePbSettingsCard(){","\n}"),
  grab("function authRenderMode(){","\n}"),
].join("\n");

// DOM stub that records writes and counts lookups
let els={}, lookups=0;
function mkEl(){return {style:{},textContent:"",disabled:false,_attrs:{},
  setAttribute(k,v){this._attrs[k]=v;},getAttribute(k){return this._attrs[k];}};}
const IDS=["home-drive-dot","home-drive-label","btn-connect-home","btn-sync-now","btn-account",
  "auth-submit","s-pb-status","s-pb-email","s-btn-signin","s-btn-signout",
  "auth-title","auth-intro","auth-consent-row","auth-switch","auth-password"];
function resetDom(){els={};IDS.forEach(i=>els[i]=mkEl());lookups=0;}
const document={getElementById(id){lookups++;return els[id]||null;}};

let pbToken,pbUserId,pbEmail,pbStatus,driveToken,driveStatus,authMode;
const ctx={};
new Function('ctx','document',`
  let pbToken,pbUserId,pbEmail,pbStatus,driveToken,driveStatus,authMode;
  ${CODE}
  ctx.set=(s)=>{pbToken=s.pbToken;pbUserId=s.pbUserId;pbEmail=s.pbEmail;pbStatus=s.pbStatus;
    driveToken=s.driveToken;driveStatus=s.driveStatus;authMode=s.authMode;};
  ctx.err=(e,m)=>pbAuthErrorMessage(e,m);
  ctx.drive=()=>updateDriveUI();
  ctx.pb=()=>updatePbUI();
  ctx.mode=()=>authRenderMode();
`)(ctx,document);

let pass=0,fail=0;
function t(n,fn){resetDom();try{fn();pass++;console.log("  PASS  "+n);}catch(e){fail++;console.log("  FAIL  "+n+"\n        "+e.message);}}
function eq(a,b,w){if(a!==b)throw new Error((w||"")+" expected "+JSON.stringify(b)+" got "+JSON.stringify(a));}

const BASE={pbToken:null,pbUserId:null,pbEmail:null,pbStatus:"signedout",driveToken:null,driveStatus:"disconnected",authMode:"login"};
const S=o=>Object.assign({},BASE,o);

console.log("-- error mapping --");
t("network failure (no status)",()=>eq(ctx.err({},"login"),"Can't reach the server. Check your connection and try again."));
t("bad credentials stay opaque (no enumeration)",()=>eq(ctx.err({status:400,body:{message:"Failed to authenticate.",data:{}}},"login"),"Wrong email or password."));
t("duplicate email on signup",()=>eq(ctx.err({status:400,body:{data:{email:{code:"validation_invalid_email"}}}},"signup"),"That email is already registered. Try signing in instead."));
t("malformed email",()=>eq(ctx.err({status:400,body:{data:{email:{code:"validation_is_email"}}}},"signup"),"Enter a valid email address."));
t("short password",()=>eq(ctx.err({status:400,body:{data:{password:{code:"validation_length_out_of_range"}}}},"signup"),"Password must be 8 to 72 characters."));
t("unrecognised 400 on signup",()=>eq(ctx.err({status:400,body:{data:{}}},"signup"),"Could not create your account. Check your details and try again."));
t("403 verification",()=>eq(ctx.err({status:403},"login"),"This account needs to be verified before you can sign in. Check your email."));
t("429 rate limit",()=>eq(ctx.err({status:429},"login"),"Too many attempts. Wait a minute and try again."));
t("500 server",()=>eq(ctx.err({status:503},"login"),"The server is having trouble. Try again in a minute."));
t("never leaks raw server text",()=>{
  const raw="INTERNAL: pq: duplicate key value violates unique constraint";
  const out=ctx.err({status:400,message:raw,body:{message:raw,data:{}}},"login");
  if(out.indexOf("pq:")>=0||out.indexOf("INTERNAL")>=0)throw new Error("leaked: "+out);});

console.log("-- mutual yield (must terminate) --");
t("signed OUT: updatePbUI yields to Drive, renders Drive label",()=>{
  ctx.set(S({driveToken:"d",driveStatus:"connected"}));ctx.pb();
  eq(els["home-drive-label"].textContent,"DRIVE SYNCED","label");});
t("signed IN: updateDriveUI yields to PB, renders account label",()=>{
  ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:"synced"}));ctx.drive();
  eq(els["home-drive-label"].textContent,"ACCOUNT SYNCED","label");});
t("no infinite recursion either direction (bounded DOM lookups)",()=>{
  ctx.set(S({driveToken:"d",driveStatus:"connected"}));ctx.pb();
  if(lookups>60)throw new Error("runaway lookups: "+lookups);
  resetDom();ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:"synced"}));ctx.drive();
  if(lookups>60)throw new Error("runaway lookups: "+lookups);});

console.log("-- all eight pbStatus values map --");
[["signedout","NOT SIGNED IN"],["connecting","SIGNING IN..."],["signedin","SYNCING..."],
 ["synced","ACCOUNT SYNCED"],["saving","SAVING..."],["saved","SAVED ✓"],
 ["error","SYNC ERROR"],["offline","OFFLINE (local only)"]].forEach(([st,lbl])=>{
  t("status "+st+" -> "+lbl,()=>{
    ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:st}));ctx.pb();
    eq(els["home-drive-label"].textContent,lbl,"label");});
});

console.log("-- header + drive hiding --");
t("CONNECT DRIVE always hidden from header",()=>{
  ctx.set(S({driveStatus:"disconnected"}));ctx.drive();
  eq(els["btn-connect-home"].style.display,"none");});
t("account button says SIGN IN when signed out",()=>{
  ctx.set(S({}));ctx.drive();eq(els["btn-account"].textContent,"SIGN IN");});
t("account button says ACCOUNT when signed in",()=>{
  ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:"synced"}));ctx.pb();
  eq(els["btn-account"].textContent,"ACCOUNT");});
t("SYNC NOW visible for a Drive-only user",()=>{
  ctx.set(S({driveToken:"d",driveStatus:"connected"}));ctx.pb();
  eq(els["btn-sync-now"].style.display,"inline-block");});

console.log("-- double-submit guard --");
t("submit disabled while connecting",()=>{
  ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:"connecting"}));ctx.pb();
  eq(els["auth-submit"].disabled,true);eq(els["auth-submit"].textContent,"WORKING...");});
t("submit enabled when idle",()=>{
  ctx.set(S({pbToken:"t",pbUserId:"u",pbStatus:"synced"}));ctx.pb();
  eq(els["auth-submit"].disabled,false);});

console.log("-- signup mode --");
t("signup shows consent row and new-password autocomplete",()=>{
  ctx.set(S({authMode:"signup"}));ctx.mode();
  eq(els["auth-consent-row"].style.display,"block","consent row");
  eq(els["auth-password"].getAttribute("autocomplete"),"new-password","autocomplete");
  eq(els["auth-title"].textContent,"CREATE ACCOUNT","title");});
t("login hides consent row, current-password autocomplete",()=>{
  ctx.set(S({authMode:"login"}));ctx.mode();
  eq(els["auth-consent-row"].style.display,"none","consent row");
  eq(els["auth-password"].getAttribute("autocomplete"),"current-password","autocomplete");});

console.log("-- settings account card --");
t("signed out: SIGN IN shown, SIGN OUT hidden, no email",()=>{
  ctx.set(S({}));ctx.pb();
  eq(els["s-btn-signin"].style.display,"inline-block");
  eq(els["s-btn-signout"].style.display,"none");
  eq(els["s-pb-email"].style.display,"none");});
t("signed in: SIGN OUT shown with email",()=>{
  ctx.set(S({pbToken:"t",pbUserId:"u",pbEmail:"a@b.com",pbStatus:"synced"}));ctx.pb();
  eq(els["s-btn-signout"].style.display,"inline-block");
  eq(els["s-pb-email"].textContent,"a@b.com");});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
