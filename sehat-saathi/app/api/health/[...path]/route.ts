import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {allRecords,bucket,database,fromRow,ownedRecord} from '../../../../lib/store';
import {ExtractionSchema,validDate,demoRecords} from '../../../../lib/health';
import {extractMedicalRecord,PublicError} from '../../../../lib/ai';
import {toFhir} from '../../../../lib/fhir';
import {toAbdmDraft} from '../../../../lib/abdm';
import {aiConfigured,aiKey} from '../../../../lib/credentials';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:Request):Promise<Response>{
 try{
 const path=new URL(request.url).pathname.replace('/api/health/','').split('/');
 const user=await getChatGPTUser();if(!user)throw new PublicError('Sign in to save or analyze your own records.',401);
 if(request.method!=='GET'){
  const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)throw new PublicError('This request is not allowed.',403);
  if(Number(request.headers.get('content-length')||0)>6*1024*1024)throw new PublicError('Please use a file under 5 MB.',413);
  // Enforce the body limit even for chunked requests without Content-Length.
  if(request.body){const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6*1024*1024){await reader.cancel();throw new PublicError('Please use a file under 5 MB.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}request=new Request(request.url,{method:request.method,headers:request.headers,body:bytes});}
 }
 const uid=user.userId;
 if(path[0]==='status')return json({aiConfigured:aiConfigured(),model:env.OPENAI_MODEL||'gpt-4.1-mini'});
 if(path[0]==='records'&&request.method==='GET'&&!path[1])return json({records:await allRecords(uid),profile:await database().prepare('SELECT mock_abha FROM profiles WHERE user_id = ?').bind(uid).first()});
 if(path[0]==='demo'&&request.method==='POST'){
  const sample=demoRecords[0];const existing=await database().prepare('SELECT id FROM records WHERE user_id = ? AND hash = ?').bind(uid,'prepared-synthetic-lab-v1').first<{id:string}>();if(existing)return json({record:fromRow(await ownedRecord(uid,existing.id))});
  const id=crypto.randomUUID();const objectKey=`records/${uid}/${id}`;const data={...ExtractionSchema.parse(sample),synthetic:true,edited:false};const createdAt=new Date().toISOString();await bucket().put(objectKey,sample.sourceText,{httpMetadata:{contentType:'text/plain'}});
  try{await database().prepare('INSERT INTO records (id,user_id,data,filename,object_key,mime,hash,reviewed,created_at,model) VALUES (?,?,?,?,?,?,?,0,?,?)').bind(id,uid,JSON.stringify(data),'synthetic-lab-report.txt',objectKey,'text/plain','prepared-synthetic-lab-v1',createdAt,'Curated synthetic demo — no AI call').run();}catch{await bucket().delete(objectKey);throw new PublicError('Could not save the sample. Please try again.',503);}return json({record:fromRow(await ownedRecord(uid,id))},201);
 }
 if(path[0]==='analyze'&&request.method==='POST'){
  if(!aiConfigured())throw new PublicError('Live AI is not configured yet. You can explore the clearly labelled sample profile.',503);
  const form=await request.formData();if(form.get('consent')!=='yes')throw new PublicError('Please confirm permission to process this document.');
  let file=form.get('file');let text=String(form.get('text')||'').trim();let bytes:Uint8Array<ArrayBuffer>;let mime='text/plain';let filename='pasted-record.txt';
  if(file instanceof File&&file.size){
    if(file.size>5*1024*1024)throw new PublicError('Please use a file under 5 MB.',413);
    bytes=new Uint8Array(await file.arrayBuffer());mime=file.type;filename=file.name.slice(0,160);
    const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70;
    const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
    const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if(pdf)mime='application/pdf';else if(png)mime='image/png';else if(jpg)mime='image/jpeg';
    else if(filename.toLowerCase().endsWith('.txt')){mime='text/plain';text=new TextDecoder().decode(bytes);}else throw new PublicError('Supported files: PDF, PNG, JPG and plain text.');
  }else{if(!text)throw new PublicError('Choose a document or paste your report text.');bytes=new TextEncoder().encode(text);}
  if(mime==='text/plain'&&(text.length<30||text.length>25000))throw new PublicError('Paste between 30 and 25,000 characters of report text.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const duplicate=await database().prepare('SELECT id FROM records WHERE user_id = ? AND hash = ?').bind(uid,hash).first<{id:string}>();
  if(duplicate)return json({duplicate:true,record:fromRow(await ownedRecord(uid,duplicate.id))});
  const total=await database().prepare('SELECT count(*) AS count FROM records WHERE user_id = ?').bind(uid).first<{count:number}>();if((total?.count??0)>=200)throw new PublicError('The prototype supports up to 200 records. Delete a record before adding another.',429);
  const day=new Date().toISOString().slice(0,10);
  const limit=await database().prepare('INSERT INTO usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1 WHERE count < 20 RETURNING count').bind(uid,day).first();if(!limit)throw new PublicError('Daily prototype limit reached (20 analyses). Try again tomorrow.',429);
  let dataUrl:string|undefined;if(mime!=='text/plain'){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));dataUrl=`data:${mime};base64,${btoa(binary)}`;}
  const model=env.OPENAI_MODEL||'gpt-4.1-mini';const data=await extractMedicalRecord(await aiKey(),model,mime==='text/plain'?{text}:{dataUrl,mime,filename});
  const id=crypto.randomUUID();const objectKey=`records/${uid}/${id}`;const createdAt=new Date().toISOString();
  await bucket().put(objectKey,bytes,{httpMetadata:{contentType:mime}});
  try{await database().prepare('INSERT INTO records (id,user_id,data,filename,object_key,mime,hash,reviewed,created_at,model) VALUES (?,?,?,?,?,?,?,0,?,?)').bind(id,uid,JSON.stringify({...data,synthetic:/SYNTHETIC DEMO|SYNTHETIC EXTRACTION TEST/.test(data.sourceText),edited:false}),filename,objectKey,mime,hash,createdAt,model).run();}
  catch{await bucket().delete(objectKey);throw new PublicError('The record could not be saved. Your original upload was removed. Please try again.',503);}
  return json({record:fromRow(await ownedRecord(uid,id))},201);
 }
 if(path[0]==='records'&&path[1]){
  const row=await ownedRecord(uid,path[1]);
  if(path[2]==='abdm-document'&&request.method==='GET'){
   const record=fromRow(row);if(!record.reviewed)throw new PublicError('Review this record against the original before exporting.',409);
   const profile=await database().prepare('SELECT mock_abha FROM profiles WHERE user_id = ?').bind(uid).first<{mock_abha:number}>();
   return new Response(JSON.stringify(toAbdmDraft(record,!!profile?.mock_abha),null,2),{headers:{'Content-Type':'application/fhir+json','Content-Disposition':'attachment; filename="sehat-saathi-document-draft.json"','Cache-Control':'no-store'}});
  }
  if(path[2]==='original'&&request.method==='GET'){
    if(!row.object_key)throw new PublicError('No original is available.',404);const file=await bucket().get(row.object_key);if(!file)throw new PublicError('Original not found.',404);
    return new Response(file.body,{headers:{'Content-Type':row.mime||'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(request.method==='PATCH'){
   const body=await request.json() as {data:unknown;confirmed:boolean};if(!body.confirmed)throw new PublicError('Confirm that you checked the original record.');
   const parsed=ExtractionSchema.safeParse(body.data);if(!parsed.success)throw new PublicError('Some edited fields are invalid. Check the values and try again.');
   const old=JSON.parse(row.data);const data=parsed.data;if(data.date&&!validDate(data.date))throw new PublicError('Use a valid calendar date in YYYY-MM-DD format, or leave it empty.');
   const edited=JSON.stringify(data)!==JSON.stringify(ExtractionSchema.parse(old));
   // An explanation generated before a correction must not be presented as current.
   if(edited){data.summaryEn='You corrected the extracted details. Review the updated values and their source evidence below; the earlier AI summary has been removed. Discuss any questions with your clinician.';data.summaryHi='आपने निकाली गई जानकारी में सुधार किया है। नीचे संशोधित मान और स्रोत जाँचें। पुराना AI सारांश हटा दिया गया है। अपने प्रश्न चिकित्सक से पूछें।';data.questionsEn=['What do these updated results mean in my health context?'];data.questionsHi=['मेरे स्वास्थ्य के संदर्भ में इन संशोधित परिणामों का क्या अर्थ है?'];data.observations=data.observations.map(o=>({...o,explanationEn:'Corrected transcription. Check this value against the original report and discuss its meaning with your clinician.',explanationHi:'संशोधित प्रतिलेख। मूल रिपोर्ट से इस मान की जाँच करें और इसका अर्थ चिकित्सक से समझें।'}));}
   await database().prepare('UPDATE records SET data = ?, reviewed = 1 WHERE user_id = ? AND id = ?').bind(JSON.stringify({...data,synthetic:old.synthetic,edited:old.edited||edited}),uid,row.id).run();return json({record:fromRow(await ownedRecord(uid,row.id))});
  }
  if(request.method==='DELETE'){if(row.object_key)await bucket().delete(row.object_key);await database().prepare('DELETE FROM records WHERE user_id = ? AND id = ?').bind(uid,row.id).run();return json({deleted:true});}
 }
 if(path[0]==='profile'&&request.method==='PATCH'){const b=await request.json() as {mockAbha?:boolean};await database().prepare('INSERT INTO profiles (user_id,mock_abha) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET mock_abha=excluded.mock_abha').bind(uid,b.mockAbha?1:0).run();return json({mockAbha:!!b.mockAbha});}
 if(path[0]==='export'&&request.method==='GET'){const profile=await database().prepare('SELECT mock_abha FROM profiles WHERE user_id = ?').bind(uid).first<{mock_abha:number}>();return new Response(JSON.stringify(toFhir(await allRecords(uid),!!profile?.mock_abha),null,2),{headers:{'Content-Type':'application/fhir+json','Content-Disposition':'attachment; filename="sehat-saathi-fhir.json"','Cache-Control':'no-store'}});}
 throw new PublicError('Not found.',404);
 }catch(error){if(error instanceof PublicError)return json({error:error.message},error.status);console.error('Health operation failed',error instanceof Error?error.name:'UnknownError');return json({error:'This operation could not be completed. Your input is still available; please try again.'},503);}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
