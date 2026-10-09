import { env } from 'cloudflare:workers';
import type { HealthRecord } from './health';
import {PublicError} from './ai';
export function database(){if(!env.DB)throw new PublicError('Record storage is temporarily unavailable. Please try again later.',503);return env.DB;}
export function bucket(){if(!env.BUCKET)throw new PublicError('Document storage is temporarily unavailable.',503);return env.BUCKET;}
export type RecordRow={id:string;user_id:string;data:string;filename:string;object_key:string|null;mime:string|null;reviewed:number;created_at:string;model:string};
export function fromRow(row:RecordRow):HealthRecord {return {...JSON.parse(row.data),id:row.id,filename:row.filename,reviewed:!!row.reviewed,createdAt:row.created_at,hasOriginal:!!row.object_key,model:row.model};}
export async function allRecords(userId:string){const r=await database().prepare('SELECT * FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').bind(userId).all<RecordRow>();return r.results.map(fromRow);}
export async function ownedRecord(userId:string,id:string){const r=await database().prepare('SELECT * FROM records WHERE user_id = ? AND id = ?').bind(userId,id).first<RecordRow>();if(!r)throw new PublicError('Record not found.',404);return r;}
