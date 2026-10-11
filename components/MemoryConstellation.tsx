"use client";
import {useState} from 'react';
import {Site,safeMediaURL} from '@/lib/model';
import {memories} from '@/lib/magic';
export default function MemoryConstellation({site}:{site:Site}) {
 const stars=memories(site);const [selected,setSelected]=useState(0);
 const positions=stars.map((_,i)=>({x:12+(i*29%76),y:16+(i*31%65)}));const current=stars[selected]||stars[0];
 if(!stars.length)return <p className="muted">Add timeline memories or photos to light up your memory constellation.</p>;
 return <div className="memory-universe"><span className="eyebrow">WE TURNED OUR MOMENTS INTO STARS</span><h3>A sky only we can read.</h3><p>Touch a star. Find a little piece of your story.</p><div className="constellation-sky"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={positions.map(p=>p.x+','+p.y).join(' ')} fill="none" stroke="currentColor" strokeWidth=".25" strokeDasharray="1 2"/></svg>{stars.map((star,i)=><button key={star.id} aria-label={'Memory star '+(i+1)} aria-pressed={selected===i} style={{left:positions[i].x+'%',top:positions[i].y+'%'}} onClick={()=>setSelected(i)}><span aria-hidden="true">✦</span><small>{String(i+1).padStart(2,'0')}</small></button>)}</div><figure className="star-memory" aria-live="polite">{current.src&&<img src={safeMediaURL(current.src)} alt={current.text}/>}<figcaption>{current.text}</figcaption></figure></div>;
}
