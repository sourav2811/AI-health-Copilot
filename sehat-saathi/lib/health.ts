import { z } from 'zod';

export const ObservationSchema = z.object({
  name: z.string().max(200), value: z.string().max(100), unit: z.string().max(80),
  range: z.string().max(160), low: z.number().nullable(), high: z.number().nullable(),
  evidence: z.string().max(1200), page: z.number().int().min(1).nullable(),
  explanationEn: z.string().max(1500), explanationHi: z.string().max(1500),
  uncertain: z.boolean(),
});
export const MedicineSchema = z.object({
  name: z.string().max(200), dose: z.string().max(200), frequency: z.string().max(200),
  duration: z.string().max(200), route: z.string().max(100), evidence: z.string().max(1200), uncertain: z.boolean(),
});
export const ExtractionSchema = z.object({
  title: z.string().min(1).max(200), type: z.enum(['Lab report','Prescription','Discharge summary','Diagnostic record','Wellness record','Other']),
  patientName: z.string().max(150), date: z.string().max(10), provider: z.string().max(200),
  sourceText: z.string().max(30000), observations: z.array(ObservationSchema).max(60),
  medicines: z.array(MedicineSchema).max(40), diagnoses: z.array(z.string().max(500)).max(30),
  summaryEn: z.string().max(4000), summaryHi: z.string().max(4000),
  questionsEn: z.array(z.string().max(500)).max(6), questionsHi: z.array(z.string().max(500)).max(6),
  uncertainties: z.array(z.string().max(600)).max(25),
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type HealthRecord = Extraction & { id: string; reviewed: boolean; createdAt: string; filename: string; synthetic: boolean; hasOriginal: boolean; model: string; edited?: boolean };
export function validDate(s:string):boolean {if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function parsePrintedRange(s:string){const m=s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);if(!m||Number(m[1])>Number(m[2]))return {low:null,high:null};return {low:Number(m[1]),high:Number(m[2])};}
export function checkedBounds(o:Pick<Observation,'range'|'unit'|'low'|'high'|'uncertain'>){const b=parsePrintedRange(o.range);return !o.uncertain&&!!o.unit&&b.low!==null&&b.high!==null&&b.low===o.low&&b.high===o.high?b:{low:null,high:null};}
export function rangeFlag(o: Pick<Observation,'value'|'unit'|'range'|'low'|'high'|'uncertain'>): 'high'|'low'|'within'|'unknown' {
  if (o.uncertain || !o.unit || !o.range || !/^-?\d+(\.\d+)?$/.test(o.value.trim())) return 'unknown';
  const bounds=checkedBounds(o);if(bounds.low===null||bounds.high===null)return 'unknown';
  const v = Number(o.value);
  if (!Number.isFinite(v) || (o.low === null && o.high === null) || (o.low !== null && o.high !== null && o.low > o.high)) return 'unknown';
  if (o.low !== null && v < o.low) return 'low';
  if (o.high !== null && v > o.high) return 'high';
  return 'within';
}
export const flagLabels = { high:'Above report range', low:'Below report range', within:'Within report range', unknown:'Check original' };
export const flagLabelsHi = { high:'रिपोर्ट की सीमा से ऊपर', low:'रिपोर्ट की सीमा से नीचे', within:'रिपोर्ट की सीमा के भीतर', unknown:'मूल रिपोर्ट जाँचें' };
export const DEMO_REPORT = `SYNTHETIC DEMO — NOT A REAL PATIENT OR MEDICAL REPORT
Demo Health Laboratory
Patient: Demo Patient 001
Report date: 2026-10-01
Age/Sex: 32 years / female
Fasting status: Fasting, as stated on this fictional report
Test | Result | Unit | Report reference range
Fasting plasma glucose | 112 | mg/dL | 70–99
HbA1c | 5.9 | % | 4.0–5.6
Hemoglobin | 13.1 | g/dL | 12.0–15.5
Laboratory comment: Review results with the treating clinician.`;
export const demoRecords: HealthRecord[] = [{
 id:'demo-lab', title:'Blood health & glucose', type:'Lab report', patientName:'Demo Patient 001', date:'2026-10-01', provider:'Demo Health Laboratory',
 sourceText:DEMO_REPORT, filename:'synthetic-lab-report.txt', reviewed:true, createdAt:'2026-10-01T08:00:00Z', synthetic:true, hasOriginal:false, model:'Curated synthetic demo',
 observations:[
 {name:'Fasting plasma glucose',value:'112',unit:'mg/dL',range:'70–99',low:70,high:99,evidence:'Fasting plasma glucose | 112 | mg/dL | 70–99',page:1,explanationEn:'Glucose is the sugar in your blood. This result is above the range printed on this report. A single result does not establish a diagnosis.',explanationHi:'ग्लूकोज़ रक्त में मौजूद शर्करा है। यह परिणाम इस रिपोर्ट की सीमा से ऊपर है। एक परिणाम से निदान नहीं किया जा सकता।',uncertain:false},
 {name:'HbA1c',value:'5.9',unit:'%',range:'4.0–5.6',low:4,high:5.6,evidence:'HbA1c | 5.9 | % | 4.0–5.6',page:1,explanationEn:'HbA1c reflects average blood glucose over about 2–3 months. This result is above this report’s range. Discuss what it means in your medical context.',explanationHi:'HbA1c लगभग 2–3 महीनों के औसत रक्त ग्लूकोज़ को दर्शाता है। यह परिणाम रिपोर्ट की सीमा से ऊपर है। इसका अर्थ अपने चिकित्सक से समझें।',uncertain:false},
 {name:'Hemoglobin',value:'13.1',unit:'g/dL',range:'12.0–15.5',low:12,high:15.5,evidence:'Hemoglobin | 13.1 | g/dL | 12.0–15.5',page:1,explanationEn:'Hemoglobin is a protein in red blood cells that carries oxygen. This result falls within the range printed on this report.',explanationHi:'हीमोग्लोबिन लाल रक्त कोशिकाओं का प्रोटीन है जो ऑक्सीजन पहुँचाता है। यह परिणाम इस रिपोर्ट की सीमा के भीतर है।',uncertain:false}],
 medicines:[],diagnoses:[],summaryEn:'Two results are above the ranges printed on this report: fasting glucose and HbA1c. Hemoglobin is within the report’s range. These results alone do not establish a diagnosis. Review them with your clinician in the context of your health history.',summaryHi:'इस रिपोर्ट में फास्टिंग ग्लूकोज़ और HbA1c दिए गए संदर्भ सीमा से ऊपर हैं। हीमोग्लोबिन सीमा के भीतर है। केवल इन परिणामों से निदान नहीं होता। अपने स्वास्थ्य इतिहास के साथ चिकित्सक से इनकी समीक्षा करें।',questionsEn:['What could explain these results in my health context?','Do I need a repeat test, and when?','Are these results comparable with my previous report?'],questionsHi:['मेरे स्वास्थ्य के संदर्भ में इन परिणामों का क्या अर्थ है?','क्या दोबारा जाँच की ज़रूरत है, और कब?','क्या इनकी तुलना पिछली रिपोर्ट से की जा सकती है?'],uncertainties:[]
}, {
 id:'demo-prescription',title:'Prescription to review',type:'Prescription',patientName:'Demo Patient 001',date:'2026-09-18',provider:'Synthetic example',sourceText:'SYNTHETIC EXTRACTION TEST — NOT A VALID PRESCRIPTION\nDate: 2026-09-18\nMedicine text: Paracetamol 500 mg\nRoute: oral\nFrequency: [illegible]\nDuration: [not stated]',filename:'synthetic-prescription.txt',reviewed:false,createdAt:'2026-09-18T08:00:00Z',synthetic:true,hasOriginal:false,model:'Curated synthetic demo',observations:[],medicines:[{name:'Paracetamol',dose:'500 mg',frequency:'',duration:'',route:'oral',evidence:'Medicine text: Paracetamol 500 mg; Route: oral; Frequency: [illegible]',uncertain:true}],diagnoses:[],summaryEn:'The medicine name and strength are visible, but the frequency cannot be read and the duration is missing. Confirm these details with the prescriber or pharmacist before relying on this transcription.',summaryHi:'दवा का नाम और मात्रा दिख रहे हैं, लेकिन लेने की आवृत्ति पढ़ी नहीं जा सकती और अवधि नहीं दी गई है। इस प्रतिलेख पर भरोसा करने से पहले चिकित्सक या फार्मासिस्ट से पुष्टि करें।',questionsEn:['Can you confirm the frequency and duration on this prescription?'],questionsHi:['क्या आप इस पर्चे पर दवा की आवृत्ति और अवधि की पुष्टि कर सकते हैं?'],uncertainties:['Frequency is illegible. Duration is not stated.']
}];
