import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { publications, uploads, publicationLimits } from '@/db/schema';
import { validateFile } from '@/lib/model';

const uuid = z.string().uuid();
const text = z.string().max(12000);
const media = z.object({id: z.string().max(100),kind:z.enum(['image','video','audio']),src:z.string().max(2000),caption:text,x:z.number().min(0).max(100),y:z.number().min(0).max(100),zoom:z.number().min(1).max(3)});
const siteSchema = z.object({id:uuid,title:text,recipient:text,nickname:text,date:z.string().max(100),color:z.string().regex(/^#[a-fA-F0-9]{6}$/),font:z.enum(['serif','sans']),music:z.string().max(2000),updated:z.string().max(100),chapters:z.array(z.object({id:z.string().max(100),title:text,text,hidden:z.literal(false),media:z.array(media).max(40)})).max(12)});
export function json(data: unknown, status=200) { return Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
export function fail(error: unknown) { return json({error: error instanceof Error ? error.message : 'Sharing failed.'}, error instanceof SharingError ? error.status : 400); }
class SharingError extends Error {constructor(message:string, public status=400){super(message);}}
async function digest(value:string) {return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function owner(request:Request,id:string) {
  uuid.parse(id);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new SharingError('Cross-origin writes are not allowed.',403);
  const token = request.headers.get('authorization')?.replace(/^Bearer /,'') || '';
  if (!/^[a-f0-9-]{72}$/.test(token)) throw new SharingError('This browser does not hold the editing key for this story.',403);
  const hash = await digest(token);
  const db = getDb();
  const row = await db.select().from(publications).where(eq(publications.id,id)).get();
  if (row && row.ownerHash !== hash) throw new SharingError('Only the original editor can change this publication.',403);
  return {hash,row,db};
}
export async function reserve(request:Request,id:string) {
  const {hash,row,db} = await owner(request,id);
  if (!row) {
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    const limitId = await digest(ip + new Date().toISOString().slice(0,10));
    await db.insert(publicationLimits).values({id:limitId,count:1}).onConflictDoUpdate({target:publicationLimits.id,set:{count:sql`${publicationLimits.count} + 1`}});
    const limit = await db.select().from(publicationLimits).where(eq(publicationLimits.id,limitId)).get();
    if ((limit?.count || 0)>20) throw new SharingError('Daily publishing limit reached. Try again tomorrow.',429);
    await db.insert(publications).values({id,ownerHash:hash,created:new Date().toISOString()}).onConflictDoNothing();
    await owner(request,id); // A racing claimant must never gain write access.
  }
  return json({id});
}
export async function read(id:string) {
  uuid.parse(id);
  const row = await getDb().select({snapshot:publications.snapshot}).from(publications).where(eq(publications.id,id)).get();
  return row?.snapshot ? json(JSON.parse(row.snapshot)) : json({error:'Story unavailable.'},404);
}
export async function publishSnapshot(request:Request,id:string) {
  const {row,db,hash} = await owner(request,id);
  if (!row) throw new SharingError('Create the publication first.',404);
  if (Number(request.headers.get('content-length') || 0)>200000) throw new SharingError('Story is too large.');
  const body = await request.text();
  if (body.length>200000) throw new SharingError('Story is too large.');
  const snapshot = siteSchema.parse(JSON.parse(body));
  if(snapshot.id!==id) throw new SharingError('Story ID mismatch.');
  const origin = new URL(request.url).origin;
  for (const value of [snapshot.music,...snapshot.chapters.flatMap(c=>c.media.map(m=>m.src))]) {
    if (!value) continue;
    const u = new URL(value);
    if (u.origin===origin && u.pathname.startsWith('/api/sharing/')) {
      const match = u.pathname.match(/^\/api\/sharing\/([a-f0-9-]{36})\/media\/([a-f0-9-]{36})$/);
      if (!match || match[1]!==id || !await db.select().from(uploads).where(and(eq(uploads.id,match[2]),eq(uploads.siteId,id))).get()) throw new SharingError('A media file does not belong to this story.',403);
    } else if(u.protocol!=='https:') throw new SharingError('Media must be uploaded or use HTTPS.');
  }
  await db.update(publications).set({snapshot:JSON.stringify(snapshot)}).where(and(eq(publications.id,id),eq(publications.ownerHash,hash)));
  return json({id});
}
export async function unpublishSnapshot(request:Request,id:string) {
  const {db,hash} = await owner(request,id);
  await db.update(publications).set({snapshot:null}).where(and(eq(publications.id,id),eq(publications.ownerHash,hash)));
  return json({id});
}
export async function upload(request:Request,id:string,file:string) {
  uuid.parse(file);
  const {row,db}=await owner(request,id);
  if(!row) throw new SharingError('Create the publication first.',404);
  const size=Number(request.headers.get('content-length'));
  const type=request.headers.get('content-type') || '';
  if(!Number.isSafeInteger(size) || size<=0 || !request.body) throw new SharingError('File length required.');
  validateFile({type,size});
  // Atomic quota reservation prevents simultaneous uploads bypassing the limit.
  const result = await db.run(sql`INSERT INTO uploads (id,site_id,size,type) SELECT ${file},${id},${size},${type} WHERE (SELECT COALESCE(SUM(size),0) FROM uploads WHERE site_id=${id}) + ${size} <= 524288000 AND (SELECT COUNT(*) FROM uploads WHERE site_id=${id}) < 160 ON CONFLICT DO NOTHING`);
  if(!result.meta.changes) throw new SharingError('Upload already exists or this story has reached its 500 MB storage limit.',409);
  try {
    await env.BUCKET!.put(id+'/'+file,request.body,{httpMetadata:{contentType:type}});
  } catch(error) {
    await db.delete(uploads).where(eq(uploads.id,file)); throw error;
  }
  return json({url:new URL('/api/sharing/'+id+'/media/'+file,request.url).href});
}
export async function readMedia(request:Request,id:string,file:string) {
  uuid.parse(id);uuid.parse(file);
  const row=await getDb().select({snapshot:publications.snapshot}).from(publications).where(eq(publications.id,id)).get();
  if(!row?.snapshot) return json({error:'Media unavailable.'},404);
  const snapshot=JSON.parse(row.snapshot);
  const path='/api/sharing/'+id+'/media/'+file;
  const sources=[snapshot.music,...snapshot.chapters.flatMap((c:{media:{src:string}[]})=>c.media.map(m=>m.src))];
  if(!sources.some((src:string)=>src && new URL(src).pathname===path)) return json({error:'Media unavailable.'},404);
  const object=await env.BUCKET!.get(id+'/'+file,{range:request.headers});
  if(!object) return json({error:'Media unavailable.'},404);
  const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
  object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
  const range=request.headers.has('range') ? object.range as {offset?:number,length?:number}|undefined : undefined;
  const offset=range?.offset ?? 0;const length=range?.length ?? object.size;
  headers.set('Content-Length',String(length));
  if(range)headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);
  return new Response(object.body,{status:range?206:200,headers});
}
