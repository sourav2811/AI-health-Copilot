// Both encrypted payload and wrapping key are deployment secrets. The API key
// is decrypted only in Worker memory and never sent to the browser or logged.
import {env} from 'cloudflare:workers';
export function aiConfigured(){return !!env.OPENAI_API_KEY||!!(env.OPENAI_KEY_CIPHERTEXT&&env.OPENAI_KEY_PRIVATE_JWK);}
export async function aiKey():Promise<string>{
 if(env.OPENAI_API_KEY)return env.OPENAI_API_KEY;
 if(!env.OPENAI_KEY_CIPHERTEXT||!env.OPENAI_KEY_PRIVATE_JWK)return '';
 const jwk=JSON.parse(env.OPENAI_KEY_PRIVATE_JWK) as JsonWebKey;
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
 const raw=env.OPENAI_KEY_CIPHERTEXT.replace(/-/g,'+').replace(/_/g,'/');
 const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'RSA-OAEP'},key,bytes));
}
