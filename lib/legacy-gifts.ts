import publication from '../.openai/publication.json';
import type {Site} from './model';
export const originalStudio=new URL(publication.url).origin;
export function legacyGiftId(value:string):string|null{
 let id=value.trim();
 try{const url=new URL(id);if(url.protocol!=='https:'||url.origin!==originalStudio)return null;id=url.pathname.match(/^\/s\/([^/]+)\/?$/)?.[1]||'';}catch{}
 return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)?id.toLowerCase():null;
}
export function legacyMediaSnapshot(site:Site,origin:string,id:string):Site{
 const copy=structuredClone(site);
 const rebase=(value:string)=>{try{const url=new URL(value);const match=url.pathname.match(/^\/api\/sharing\/([a-f0-9-]{36})\/media\/([a-f0-9-]{36})$/);if(url.origin===originalStudio&&match?.[1]===id)return new URL('/api/legacy-gifts/'+id+'/media/'+match[2],origin).href;}catch{}return value;};
 copy.music=rebase(copy.music);for(const c of copy.chapters)for(const m of c.media)m.src=rebase(m.src);
 return copy;
}
export async function readLegacyGift(id:string):Promise<Site>{const r=await fetch('/api/legacy-gifts/'+id,{cache:'no-store'});if(r.status===401)throw new Error('PASSWORD_REQUIRED');if(r.status===404)throw new Error('Local demo snapshot not found here. No earlier published gift matches this link. Open the original studio for saved drafts.');if(!r.ok)throw new Error('This earlier gift could not be opened. Your original studio and browser data have not been changed.');return r.json();}
