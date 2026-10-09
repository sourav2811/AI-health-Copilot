import type {HealthRecord} from './health';
import {validDate} from './health';
import {toFhir} from './fhir';

export const ABDM_GUIDE = 'https://nrces.in/ndhm/fhir/r4/';
export function documentChecks(record:HealthRecord) {
  return [
    {key:'review',passed:record.reviewed,en:'Transcription reviewed against source',hi:'प्रतिलेख की स्रोत से समीक्षा हुई'},
    {key:'patient',passed:!!record.patientName.trim(),en:'Patient name recorded (identity not verified)',hi:'रोगी का नाम दर्ज है (पहचान सत्यापित नहीं)'},
    {key:'date',passed:validDate(record.date),en:'Valid source document date',hi:'स्रोत दस्तावेज़ की वैध तारीख'},
    {key:'source',passed:!!record.sourceText.trim(),en:'Source transcription available',hi:'स्रोत प्रतिलेख उपलब्ध है'},
    {key:'uncertainty',passed:!record.uncertainties.length&&!record.observations.some(o=>o.uncertain)&&!record.medicines.some(m=>m.uncertain),en:'No extraction uncertainty flagged',hi:'निकाली गई जानकारी में अनिश्चितता चिह्नित नहीं'},
  ];
}
const escapeXml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

// A preparation artifact, not a validated ABDM profile or clinician-authored document.
export function toAbdmDraft(record:HealthRecord,mockAbha=false) {
  if(!record.reviewed)throw new Error('Review this record against the original before exporting.');
  const bundle=toFhir([record],mockAbha);
  const patient=bundle.entry.find(e=>e.resource.resourceType==='Patient')!;
  const deviceId=crypto.randomUUID();
  const device={fullUrl:`urn:uuid:${deviceId}`,resource:{resourceType:'Device',id:deviceId,status:'active',deviceName:[{name:'Sehat Saathi prototype document assembler',type:'user-friendly-name'}]}};
  const compositionId=crypto.randomUUID();
  const title=`DRAFT — ${record.title}`;
  const note='Unvalidated interoperability draft assembled by software from user-reviewed transcription. Not a clinical attestation, verified ABHA link, or ABDM exchange.';
  const composition={fullUrl:`urn:uuid:${compositionId}`,resource:{
    resourceType:'Composition',id:compositionId,status:'preliminary',
    type:{text:'Health record transcription draft'},subject:{reference:patient.fullUrl},
    date:bundle.timestamp,author:[{reference:device.fullUrl}],title,confidentiality:'R',
    text:{status:'generated',div:`<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeXml(title)}</p><p>${note}</p></div>`},
    section:[{title:'Source and extracted facts',text:{status:'generated',div:`<div xmlns="http://www.w3.org/1999/xhtml"><p>${note}</p></div>`},entry:bundle.entry.filter(e=>e!==patient).map(e=>({reference:e.fullUrl}))}],
  }};
  return {...bundle,type:'document',identifier:{system:'https://sehat-saathi.example/document-drafts',value:bundle.id},meta:{versionId:'1',security:[{system:'http://terminology.hl7.org/CodeSystem/v3-Confidentiality',code:'R'}],tag:[{system:'https://sehat-saathi.example/tags',code:'unvalidated-draft',display:note}]},entry:[composition,patient,device,...bundle.entry.filter(e=>e!==patient)]};
}
