"use client";
import {Site} from '@/lib/model';
import {durationParts,nextBirthday,zonedTime} from '@/lib/magic';
function Digits({ms}:{ms:number}) {return <div className="magic-digits">{Object.entries(durationParts(ms)).map(([unit,value])=><div key={unit}><strong>{String(value).padStart(2,'0')}</strong><small>{unit}</small></div>)}</div>;}
export function NextBirthday({site,now}:{site:Site;now:number}) {
 const target=now?nextBirthday(site.date,now,site.timeZone||'UTC'):null;if(!target)return null;
 return <div className="next-birthday"><span className="eyebrow">THERE IS ALWAYS ANOTHER WISH</span><h3>Until your next birthday.</h3><Digits ms={target-now}/><small>{new Date(target).toLocaleString(undefined,{timeZone:site.timeZone||'UTC',dateStyle:'medium',timeStyle:'short'})} · {site.timeZone||'UTC'}</small></div>;
}
export function MeetingClock({site,now}:{site:Site;now:number}) {
 const met=site.metAt?zonedTime(site.metAt,site.timeZone||'UTC'):null;if(met===null||!now)return null;
 return <div className="meeting-surprise"><div className="meeting-orbit" aria-hidden="true"><i>✦</i><b>♥</b></div><span className="eyebrow">OUR VERY OWN LITTLE INFINITY</span><h3>{now>=met?'Since our first hello…':'Until our first hello…'}</h3><Digits ms={Math.abs(now-met)}/><p>{now>=met?'And the story is still growing, second by second.':'A new chapter is waiting for us.'}</p><small>{new Date(met).toLocaleString(undefined,{timeZone:site.timeZone||'UTC',dateStyle:'medium',timeStyle:'short'})}</small></div>;
}
