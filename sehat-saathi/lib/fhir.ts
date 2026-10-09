import type {HealthRecord} from './health';
import {rangeFlag,checkedBounds} from './health';
export function toFhir(records:HealthRecord[],mockAbha:boolean){
 const entries:{fullUrl:string;resource:Record<string,unknown>}[]=[];
 const add=(r:Record<string,unknown>)=>{entries.push({fullUrl:`urn:uuid:${r.id}`,resource:r});return {reference:`urn:uuid:${r.id}`};};
 for(const record of records){
  // A name match is not identity verification. Keep each source patient separate.
  const subject=add({resourceType:'Patient',id:crypto.randomUUID(),...(record.patientName?{name:[{text:record.patientName}]}:{}),...(mockAbha&&record.synthetic?{identifier:[{system:'https://sehat-saathi.example/mock-abha',value:`DEMO-${record.id}`,use:'temp'}]}:{})});
  const doc=add({resourceType:'DocumentReference',id:crypto.randomUUID(),status:'current',subject,date:record.createdAt,description:`${record.title}. ${record.reviewed?'User reviewed transcription.':'Unreviewed AI transcription.'} ${record.synthetic?'Synthetic demonstration record.':''}`,content:[{attachment:{contentType:'text/plain',title:record.filename}}]});
  const observations=record.observations.map(o=>{const b=checkedBounds(o);return add({resourceType:'Observation',id:crypto.randomUUID(),status:'unknown',code:{text:o.name},subject,...(record.date?{effectiveDateTime:record.date}:{}),...(/^-?\d+(\.\d+)?$/.test(o.value.trim())?{valueQuantity:{value:Number(o.value),...(o.unit?{unit:o.unit}:{})}}:o.value?{valueString:o.value}:{dataAbsentReason:{coding:[{system:'http://terminology.hl7.org/CodeSystem/data-absent-reason',code:'unknown'}]}}),...(o.range?{referenceRange:[{text:o.range,...(b.low!==null?{low:{value:b.low,unit:o.unit},high:{value:b.high,unit:o.unit}}:{})}]}:{}),...(rangeFlag(o)!=='unknown'?{interpretation:[{coding:[{system:'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',code:rangeFlag(o)==='high'?'H':rangeFlag(o)==='low'?'L':'N'}]}]}:{}),derivedFrom:[doc],note:[{text:`Source: ${o.evidence}. ${o.uncertain?'Needs source verification.':''}`}]});});
  if(observations.length)add({resourceType:'DiagnosticReport',id:crypto.randomUUID(),status:'unknown',code:{text:record.title},subject,...(record.date?{effectiveDateTime:record.date}:{}),result:observations});
  for(const m of record.medicines){const common={id:crypto.randomUUID(),status:'unknown',medicationCodeableConcept:{text:[m.name,m.dose].filter(Boolean).join(' ')},subject,note:[{text:`Transcribed from source; not a new prescription or confirmation of current use. ${m.evidence}. ${m.uncertain?'Unclear or missing details; verify with prescriber.':''}`} ]};const dosage={text:[m.dose,m.frequency,m.duration,m.route].filter(Boolean).join('; ')||'Instructions not stated'};
   if(record.type==='Prescription')add({...common,resourceType:'MedicationRequest',intent:'order',reportedBoolean:true,...(record.date?{authoredOn:record.date}:{}),supportingInformation:[doc],dosageInstruction:[dosage]});
   else add({...common,resourceType:'MedicationStatement',derivedFrom:[doc],dosage:[dosage]});
  }
 }
 return {resourceType:'Bundle',id:crypto.randomUUID(),type:'collection',timestamp:new Date().toISOString(),entry:entries};
}
