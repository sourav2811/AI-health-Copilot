import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './lib/health'; export * from './lib/fhir';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {rangeFlag,validDate,toFhir,demoRecords,checkedBounds}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const base=demoRecords[0].observations[0];let n=0;
for(const [o,expected]of [[base,'high'],[{...base,value:'80'},'within'],[{...base,value:'60'},'low'],[{...base,value:'99'},'within'],[{...base,value:'<112'},'unknown'],[{...base,value:'100',range:'<100',low:null,high:100},'unknown'],[{...base,unit:''},'unknown'],[{...base,range:''},'unknown'],[{...base,low:0,high:200},'unknown'],[{...base,uncertain:true},'unknown']]){assert.equal(rangeFlag(o),expected);n++;}
assert.equal(validDate('2026-02-31'),false);assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('2026-02-29'),false);n+=3;
const fixtures=[...demoRecords,structuredClone(demoRecords[0])];fixtures[2].observations[0].uncertain=true;const bundle=toFhir(fixtures,true);
assert.equal(bundle.type,'collection');assert.equal(bundle.entry.filter(x=>x.resource.resourceType==='Patient').length,3);n+=2;
const urls=new Set(bundle.entry.map(x=>x.fullUrl));function references(x){if(x&&typeof x==='object'){if('reference'in x)assert.ok(urls.has(x.reference),'FHIR reference must resolve');for(const v of Object.values(x))references(v);}}references(bundle);n++;
const uncertain=bundle.entry.filter(x=>x.resource.resourceType==='Observation').at(-3).resource;assert.equal(uncertain.referenceRange[0].low,undefined);assert.equal(uncertain.interpretation,undefined);n+=2;
assert.ok(bundle.entry.some(x=>x.resource.resourceType==='MedicationRequest'));n++;
console.log(`PASS: ${n} core checks covering printed ranges, unknowns, dates, patient separation and FHIR references.`);
