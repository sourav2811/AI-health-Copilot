import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
process.loadEnvFile(fileURLToPath(new URL('../../.env.local',import.meta.url)));
const result=await build({stdin:{contents:"export { extractMedicalRecord } from './lib/ai'; export { DEMO_REPORT } from './lib/health';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {extractMedicalRecord,DEMO_REPORT}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const nativeFetch=globalThis.fetch;globalThis.fetch=async(...args)=>{const r=await nativeFetch(...args);if(!r.ok){const b=await r.clone().json().catch(()=>({}));console.log(JSON.stringify({upstreamStatus:r.status,code:b.error?.code,type:b.error?.type,retryAfter:r.headers.get('retry-after')}));}return r;};
try{const data=await extractMedicalRecord(process.env.OPENAI_API_KEY,'gpt-4.1-mini',{text:DEMO_REPORT});console.log(JSON.stringify({ok:true,type:data.type,date:data.date,observations:data.observations.map(o=>({name:o.name,value:o.value,unit:o.unit,range:o.range})),hasHindi:/[\u0900-\u097f]/.test(data.summaryHi),hasEvidence:data.observations.every(o=>!!o.evidence)}));}catch(e){console.log(JSON.stringify({ok:false,message:e.message}));process.exitCode=1;}
