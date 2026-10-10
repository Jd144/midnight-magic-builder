import { and, eq, sql, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import {nextBirthday,capsuleView} from '@/lib/magic';
import { publications, guestSessions, diaryEntries, wishCapsules, publicationLimits } from '@/db/schema';
import { digest, owner, json, SharingError } from './sharing-server';

export function sameOrigin(request:Request) {
  if(request.headers.get('origin') !== new URL(request.url).origin) throw new SharingError('Please use this website to submit the form.',403);
}
async function publication(id:string) {
  z.string().uuid().parse(id);
  const row=await getDb().select().from(publications).where(eq(publications.id,id)).get();
  if(!row?.snapshot) throw new SharingError('Story unavailable.',404);
  return row;
}
export async function passwordHash(password:string,salt:string) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return [...new Uint8Array(bits)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function equal(a:string,b:string) {let diff=a.length ^ b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return diff===0;}
export async function assertGuest(request:Request,id:string) {
  const row=await publication(id);
  if(!row.accessHash)return;
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(bearer && equal(await digest(bearer),row.ownerHash))return;
  const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mm-guest-'+id+'='))?.split('=')[1];
  if(token && /^[a-f0-9-]{72}$/.test(token)) {
    const session=await getDb().select().from(guestSessions).where(and(eq(guestSessions.tokenHash,await digest(token)),eq(guestSessions.siteId,id))).get();
    if(session && session.expires>Date.now() && equal(session.accessHash,row.accessHash))return;
  }
  throw new SharingError('Enter the birthday password to open this story.',401);
}
export async function settings(request:Request,id:string) {
  const {row,db}=await owner(request,id);
  if(!row)throw new SharingError('Publish this story first.',404);
  if(request.method==='GET')return json({protected:!!row.accessHash,diaryEmail:row.diaryEmail||'',diaryClaimed:!!row.recipientId});
  sameOrigin(request);
  const data=z.object({password:z.string().min(8).max(128).optional(),removePassword:z.boolean().optional(),diaryEmail:z.union([z.string().email().max(254),z.literal('')]).optional()}).parse(await request.json());
  if(data.password && data.removePassword)throw new SharingError('Choose a new password or remove it.');
  const email=data.diaryEmail?.trim().toLowerCase();
  if(email!==undefined && row.recipientId && email!==row.diaryEmail)throw new SharingError('This diary already belongs to its recipient. Its login email cannot be reassigned.',409);
  const accessSalt=data.password ? crypto.randomUUID() : row.accessSalt;
  const accessHash=data.password ? await passwordHash(data.password,accessSalt!) : data.removePassword ? null : row.accessHash;
  await db.update(publications).set({accessHash,accessSalt:data.removePassword?null:accessSalt,...(email!==undefined?{diaryEmail:email||null}:{})}).where(eq(publications.id,id));
  return json({protected:!!accessHash,diaryEmail:email ?? row.diaryEmail ?? ''});
}
export async function unlock(request:Request,id:string) {
  sameOrigin(request);const row=await publication(id);
  if(!row.accessHash)return json({unlocked:true});
  const db=getDb();
  // Limit attempts per story/IP in fixed fifteen-minute windows before expensive hashing.
  const key='unlock:'+await digest(id+':'+(request.headers.get('cf-connecting-ip')||'local')+':'+Math.floor(Date.now()/900000));
  await db.insert(publicationLimits).values({id:key,count:1}).onConflictDoUpdate({target:publicationLimits.id,set:{count:sql`${publicationLimits.count}+1`}});
  const limit=await db.select().from(publicationLimits).where(eq(publicationLimits.id,key)).get();
  if((limit?.count||0)>10)throw new SharingError('Too many attempts. Please try again in fifteen minutes.',429);
  const {password}=z.object({password:z.string().max(128)}).parse(await request.json());
  if(!equal(await passwordHash(password,row.accessSalt!),row.accessHash))throw new SharingError('That password is not correct. Try again.',403);
  const token=crypto.randomUUID()+crypto.randomUUID();
  await db.insert(guestSessions).values({tokenHash:await digest(token),siteId:id,accessHash:row.accessHash,expires:Date.now()+86400000});
  const response=json({unlocked:true});
  response.headers.set('Set-Cookie',`mm-guest-${id}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return response;
}
export async function recipient(request:Request,id:string) {
  const row=await publication(id);
  if(!row.diaryEmail)throw new SharingError('The creator has not enabled a recipient diary yet.',404);
  // These identity headers are injected and verified by Sites dispatch in production.
  const userId=request.headers.get('oai-authenticated-user-id');
  const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if(!userId || !email)throw new SharingError('Sign in to open your private diary.',401);
  if(email!==row.diaryEmail || (row.recipientId && userId!==row.recipientId))throw new SharingError('This diary belongs to a different recipient account.',403);
  return {row,userId};
}
export async function diary(request:Request,id:string) {
  const {row,userId}=await recipient(request,id);const db=getDb();
  if(request.method==='GET') {
    const entries=await db.select({id:diaryEntries.id,body:diaryEntries.body,created:diaryEntries.created,updated:diaryEntries.updated}).from(diaryEntries).where(and(eq(diaryEntries.siteId,id),eq(diaryEntries.userId,userId))).orderBy(desc(diaryEntries.created)).limit(200);
    return json({entries});
  }
  sameOrigin(request);
  const data=z.object({id:z.string().uuid(),body:z.string().trim().min(1).max(12000)}).parse(await request.json());
  await claimRecipient(id,userId,row.diaryEmail!);
  const existing=await db.select().from(diaryEntries).where(eq(diaryEntries.id,data.id)).get();
  if(existing && (existing.userId!==userId||existing.siteId!==id))throw new SharingError('Entry unavailable.',403);
  if(!existing){const count=await db.select({count:sql<number>`count(*)`}).from(diaryEntries).where(eq(diaryEntries.siteId,id)).get();if((count?.count||0)>=200)throw new SharingError('Your diary has reached its 200-entry limit. You can still edit existing entries.');}
  const now=new Date().toISOString();
  await db.insert(diaryEntries).values({id:data.id,siteId:id,userId,body:data.body,created:now,updated:now}).onConflictDoUpdate({target:diaryEntries.id,set:{body:data.body,updated:now},setWhere:and(eq(diaryEntries.siteId,id),eq(diaryEntries.userId,userId))});
  return json({saved:true,updated:now});
}

async function claimRecipient(id:string,userId:string,email:string) {
 const db=getDb();

    await db.update(publications).set({recipientId:userId}).where(and(eq(publications.id,id),isNull(publications.recipientId),eq(publications.diaryEmail,email)));
    const claimed=await db.select().from(publications).where(eq(publications.id,id)).get();
    if(claimed?.recipientId!==userId)throw new SharingError('The diary belongs to another account.',403);
}
export async function capsule(request:Request,id:string) {
 const {row,userId}=await recipient(request,id);const db=getDb();
 const rows=await db.select().from(wishCapsules).where(and(eq(wishCapsules.siteId,id),eq(wishCapsules.userId,userId))).orderBy(desc(wishCapsules.created)).limit(30);
 const now=Date.now();
 if(request.method==='GET')return json({capsules:rows.map(r=>capsuleView(r,now))});
 sameOrigin(request);
 const {body}=z.object({body:z.string().trim().min(1).max(2000)}).parse(await request.json());
 const existing=rows.find(r=>r.unlockAt>now);if(existing)return json({sealed:true,capsule:capsuleView(existing,now),alreadySealed:true});
 const snapshot=JSON.parse(row.snapshot!);const unlockAt=nextBirthday(snapshot.date,now,snapshot.timeZone||'UTC');
 if(!unlockAt)throw new SharingError('Ask the creator to add a valid birthday date and publish again.');
 if(rows.length>=30)throw new SharingError('This story has reached its capsule limit. Your existing capsules are safe.');
 await claimRecipient(id,userId,row.diaryEmail!);
 const capsuleId=await digest(id+'|'+userId+'|'+unlockAt);
 const created=new Date(now).toISOString();
 // One active capsule per account/story; retries cannot overwrite a sealed wish.
 const result=await db.run(sql`INSERT INTO wish_capsules (id,site_id,user_id,body,created,unlock_at) SELECT ${capsuleId},${id},${userId},${body},${created},${unlockAt} WHERE NOT EXISTS (SELECT 1 FROM wish_capsules WHERE site_id=${id} AND user_id=${userId} AND unlock_at>${now}) ON CONFLICT DO NOTHING`);
 const sealed=await db.select().from(wishCapsules).where(and(eq(wishCapsules.siteId,id),eq(wishCapsules.userId,userId))).orderBy(desc(wishCapsules.unlockAt)).get();
 if(!sealed)throw new SharingError('Could not seal your wish. Try again.');
 return json({sealed:true,capsule:capsuleView(sealed,now),alreadySealed:!result.meta.changes});
}
