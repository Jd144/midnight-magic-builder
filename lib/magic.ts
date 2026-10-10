import type {Site} from './model';
export const worlds = [
 {name:'Midnight Lavender',accent:'#cab5ff',background:'#0c0e20',glow:'#42335f',curtain:'#6c3b5f'},
 {name:'Rose Moonlight',accent:'#ffbdd5',background:'#1e1020',glow:'#723855',curtain:'#85425c'},
 {name:'Aurora Garden',accent:'#a2ecd5',background:'#091d21',glow:'#215a56',curtain:'#2a7164'},
 {name:'Golden Stardust',accent:'#f2d297',background:'#21180f',glow:'#665032',curtain:'#856141'},
 {name:'Ocean of Stars',accent:'#a9d7ff',background:'#0a172b',glow:'#2b4b78',curtain:'#365e86'},
];
export function nextWorld(previous:number) {return Number.isInteger(previous)&&previous>=0&&previous<worlds.length?(previous+1)%worlds.length:0;}
export function youtubeVideoId(value:string):string|null {
 try {const u=new URL(value.trim());if(u.protocol!=='https:')return null;
 let id:string|null=null;
 if(u.hostname==='youtu.be')id=u.pathname.slice(1);
 else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)$/)?.[1]||null;
 return id&&/^[\w-]{11}$/.test(id)?id:null;}catch{return null;}
}
export function validZone(zone:string) {try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();return true;}catch{return false;}}
function parts(time:number,zone:string) {const p=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(time);return Object.fromEntries(p.filter(v=>v.type!=='literal').map(v=>[v.type,Number(v.value)])) as Record<string,number>;}
export function zonedTime(value:string,zone='UTC'):number|null {
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);if(!m||!validZone(zone))return null;
 const [y,mo,d,h,mi,se]=[Number(m[1]),Number(m[2]),Number(m[3]),Number(m[4]||0),Number(m[5]||0),Number(m[6]||0)];
 const wall=Date.UTC(y,mo-1,d,h,mi,se);const check=new Date(wall);if(y<1900||check.getUTCFullYear()!==y||check.getUTCMonth()!==mo-1||check.getUTCDate()!==d||h>23||mi>59||se>59)return null;
 let guess=wall;for(let i=0;i<3;i++){const p=parts(guess,zone);guess=wall-(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-guess);}
 const p=parts(guess,zone);return p.year===y&&p.month===mo&&p.day===d&&p.hour===h&&p.minute===mi?guess:null;
}
export function nextBirthday(value:string,now=Date.now(),zone='UTC'):number|null {
 if(zonedTime(value,zone)===null)return null;const m=value.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/)!;let year=parts(now,zone).year;
 for(let i=0;i<3;i++,year++) {const day=Math.min(Number(m[3]),new Date(Date.UTC(year,Number(m[2]),0)).getUTCDate());const target=zonedTime(`${year}-${m[2]}-${String(day).padStart(2,'0')}${m[4]}`,zone);if(target!==null&&target>now)return target;}
 return null;
}
export function durationParts(ms:number) {const seconds=Math.floor(Math.max(0,ms)/1000);return {days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};}
export function memories(site:Site) {
 const timeline=site.chapters.find(c=>c.id==='4'&&!c.hidden)?.text.split('\n').filter(s=>s.trim()).map((text,i)=>({id:'line-'+i,text,src:''}))||[];
 const photos=site.chapters.filter(c=>!c.hidden).flatMap(c=>c.media).filter(m=>m.kind==='image').map(m=>({id:m.id,text:m.caption||'A little moment worth keeping',src:m.src}));
 return [...timeline.slice(0,6),...photos].slice(0,12);
}
export type CapsuleRecord={id:string;body:string;created:string;unlockAt:number};
export function capsuleView(row:CapsuleRecord,now=Date.now()) {const opened=row.unlockAt<=now;return {id:row.id,created:row.created,unlockAt:new Date(row.unlockAt).toISOString(),opened,...(opened?{body:row.body}:{})};}
