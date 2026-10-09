import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8787';
const uid='local-integration-'+Date.now();const other=uid+'-other';
async function call(path,method='GET',body,who=uid){const r=await fetch(origin+'/api/health/'+path,{method,headers:{'oai-authenticated-user-id':who,'oai-authenticated-user-email':who+'@sites.test',Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();return {r,data};}
let recordId;
try{
 const anonymous=await fetch(origin+'/api/health/records');assert.equal(anonymous.status,401);
 const created=await call('demo','POST');assert.equal(created.r.status,201,JSON.stringify(created.data));recordId=created.data.record.id;assert.equal(created.data.record.reviewed,false);assert.equal(created.data.record.synthetic,true);
 assert.equal((await call('records/'+recordId+'/abdm-document')).r.status,409);
 const listed=await call('records');assert.equal(listed.data.records.length,1);
 const duplicate=await call('demo','POST');assert.equal(duplicate.data.record.id,recordId);
 const otherList=await call('records','GET',undefined,other);assert.equal(otherList.data.records.length,0);
 const forbidden=await call('records/'+recordId,'PATCH',{data:created.data.record,confirmed:true},other);assert.equal(forbidden.r.status,404);
 const denied=await call('records/'+recordId,'PATCH',{data:created.data.record,confirmed:false});assert.equal(denied.r.status,400);
 const invalid={...created.data.record,date:'2026-02-31'};assert.equal((await call('records/'+recordId,'PATCH',{data:invalid,confirmed:true})).r.status,400);
 const corrected=structuredClone(created.data.record);corrected.observations[0].value='90';const updated=await call('records/'+recordId,'PATCH',{data:corrected,confirmed:true});assert.equal(updated.r.status,200);assert.equal(updated.data.record.reviewed,true);assert.ok(updated.data.record.summaryEn.includes('corrected'));
 const abdm=await call('records/'+recordId+'/abdm-document');assert.equal(abdm.r.status,200);assert.equal(abdm.data.type,'document');assert.equal(abdm.data.entry[0].resource.resourceType,'Composition');assert.equal((await call('records/'+recordId+'/abdm-document','GET',undefined,other)).r.status,404);
 const original=await fetch(origin+'/api/health/records/'+recordId+'/original',{headers:{'oai-authenticated-user-id':uid,'oai-authenticated-user-email':uid+'@sites.test'}});assert.equal(original.status,200);assert.ok((await original.text()).includes('SYNTHETIC DEMO'));
 assert.equal((await call('profile','PATCH',{mockAbha:true})).r.status,200);
 const exported=await call('export');assert.equal(exported.data.resourceType,'Bundle');assert.ok(exported.data.entry.length>=5);
 const badOrigin=await fetch(origin+'/api/health/demo',{method:'POST',headers:{Origin:'https://unrelated.example','oai-authenticated-user-id':uid,'oai-authenticated-user-email':uid+'@sites.test'}});assert.equal(badOrigin.status,403);
 assert.equal((await call('records/'+recordId,'DELETE',undefined,other)).r.status,404);
 assert.equal((await call('records/'+recordId,'DELETE')).r.status,200);recordId=undefined;
 assert.equal((await call('records')).data.records.length,0);
 console.log('PASS: local end-to-end checks — sign-in, persistence, duplicate prevention, account isolation, source download, review corrections, FHIR export and deletion.');
}finally{if(recordId)await call('records/'+recordId,'DELETE');}
