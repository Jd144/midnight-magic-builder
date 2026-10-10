"use client";
import {forwardRef,useImperativeHandle,useRef,useState} from 'react';
import {safeMediaURL,type Site} from '@/lib/model';
export type SoundtrackHandle={start:()=>void};
export function audioTracks(site:Site){return [{src:site.music,title:'Song 1'},...site.chapters.filter(c=>!c.hidden).flatMap(c=>c.media.filter(m=>m.kind==='audio').map(m=>({src:m.src,title:m.caption||'Song'})))].filter(t=>!!safeMediaURL(t.src)).slice(0,6);}
const AudioSoundtrack=forwardRef<SoundtrackHandle,{site:Site}>(function AudioSoundtrack({site},ref){
 const tracks=audioTracks(site),audio=useRef<HTMLAudioElement>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState('');
 function play(){setError('');void audio.current?.play().catch((reason:DOMException)=>{if(reason.name==='AbortError')return;setPlaying(false);setError('Tap Play to start music.');});}
 useImperativeHandle(ref,()=>({start:play}));
 function change(next:number){const n=(next+tracks.length)%tracks.length;setIndex(n);if(audio.current){audio.current.src=safeMediaURL(tracks[n].src);audio.current.load();play();}}
 if(!tracks.length)return null;
 return <aside className="audio-soundtrack" aria-label="Background music"><audio ref={audio} src={safeMediaURL(tracks[0].src)} preload="auto" muted={muted} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>change(index+1)} onError={()=>{setPlaying(false);setError('This audio could not play. Choose another song.');}}/><button aria-label={playing?'Pause music':'Play music'} onClick={()=>playing?audio.current?.pause():play()}>{playing?'Ⅱ':'▶'}<span>{playing?'Pause':'Play'}</span></button><button aria-label={muted?'Unmute music':'Mute music'} aria-pressed={muted} onClick={()=>setMuted(!muted)}>{muted?'♩':'♫'}<span>{muted?'Unmute':'Mute'}</span></button>{tracks.length>1&&<select aria-label="Change music" value={index} onChange={e=>change(Number(e.target.value))}>{tracks.map((t,i)=><option key={i} value={i}>{i+1}. {t.title==='Song 1'?'Song 1':t.title.slice(0,28)}</option>)}</select>}{error&&<small role="status">{error}</small>}</aside>;
});
export default AudioSoundtrack;
