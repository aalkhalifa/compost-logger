// sw.js — Compost Logger offline cache
// IMPORTANT: bump CACHE version on every app change, or clients keep the old copy.
var CACHE="compost-logger-v3.77f";
var SHELL=["./","./index.html","./manifest.json"];

self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(url){return c.add(url).catch(function(){});}));
  }));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET")return;
  var url=new URL(req.url);
  if(/googleapis\.com|google\.com|accounts\.google|anthropic\.com/.test(url.hostname))return;
  if(url.origin!==self.location.origin){
    e.respondWith(caches.match(req).then(function(hit){
      return hit||fetch(req).then(function(resp){
        if(resp&&resp.status===200){var copy=resp.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
        return resp;
      }).catch(function(){return hit;});
    }));
    return;
  }
  e.respondWith(fetch(req).then(function(resp){
    if(resp&&resp.status===200){var copy=resp.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
    return resp;
  }).catch(function(){
    return caches.match(req).then(function(hit){return hit||caches.match("./index.html");});
  }));
});
