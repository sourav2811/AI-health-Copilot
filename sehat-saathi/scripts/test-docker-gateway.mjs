import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createGateway } from './docker-gateway.mjs';
const upstream = http.createServer((req,res) => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ headers:req.headers, path:req.url })); });
upstream.listen(0,'127.0.0.1'); await once(upstream,'listening');
const gateway = createGateway(upstream.address().port);
gateway.listen(0,'127.0.0.1'); await once(gateway,'listening');
const call = (headers, path='/') => new Promise((resolve,reject) => {
  http.get({hostname:'127.0.0.1',port:gateway.address().port,path,headers}, res => {
    let body=''; res.on('data',chunk=>body+=chunk); res.on('end',()=>resolve({status:res.statusCode,body}));
  }).on('error',reject);
});
try {
  assert.equal((await call({host:'evil.example'})).status,403);
  assert.equal((await call({host:'localhost:3000',origin:'https://evil.example'})).status,403);
  assert.equal((await call({host:'localhost:3000','sec-fetch-site':'cross-site'})).status,403);
  const ok = await call({host:'localhost:3000',origin:'http://localhost:3000','oai-authenticated-user-id':'attacker','x-forwarded-host':'evil.example',cookie:'session=untrusted'});
  assert.equal(ok.status,200);
  const forwarded=JSON.parse(ok.body).headers;
  assert.equal(forwarded['oai-authenticated-user-id'],'docker-local-demo');
  assert.equal(forwarded['x-forwarded-host'],undefined);
  assert.equal(forwarded.cookie,undefined);
  assert.equal(forwarded.origin,`http://127.0.0.1:${upstream.address().port}`);
  assert.equal(JSON.parse((await call({host:'127.0.0.1:3000'},'/healthz')).body).path,'/api/health/status');
  console.log('PASS: Docker gateway host/origin checks, identity isolation, and readiness routing.');
} finally { gateway.close(); upstream.close(); }
