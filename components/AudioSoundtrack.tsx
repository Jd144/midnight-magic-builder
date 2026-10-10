"use client";
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import DiscoLights from './DiscoLights';
import {safeMediaURL,type Site} from '@/lib/model';
export type SoundtrackHandle={start:()=>void};
export function audioTracks(site:Site){return [{src:site.music,title:'Song 1'},...site.chapters.filter(c=>!c.hidden).flatMap(c=>c.media.filter(m=>m.kind==='audio').map(m=>({src:m.src,title:m.caption||'Song'})))].filter(t=>!!safeMediaURL(t.src)).slice(0,6);}
const AudioSoundtrack=forwardRef<SoundtrackHandle,{site:Site}>(function AudioSoundtrack({site},ref){
 const tracks=audioTracks(site),audio=useRef<HTMLAudioElement>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[error,setError]=useState('');
 const context=useRef<AudioContext|null>(null),[analyser,setAnalyser]=useState<AnalyserNode|null>(null),[disco,setDisco]=useState(true),[reduced,setReduced]=useState(false);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(query.matches);sync();query.addEventListener('change',sync);return()=>{query.removeEventListener('change',sync);void context.current?.close();};},[]);
 function connectDisco(){if(!audio.current)return;try{const url=new URL(audio.current.currentSrc||audio.current.src);if(url.origin!==location.origin||tracks.some(t=>new URL(t.src).origin!==location.origin))return;if(!context.current){const c=new AudioContext(),node=c.createAnalyser();node.fftSize=2048;node.smoothingTimeConstant=.4;const source=c.createMediaElementSource(audio.current);source.connect(node);node.connect(c.destination);context.current=c;setAnalyser(node);}void context.current.resume().catch(()=>{});}catch{/* Playback remains available when the browser has no audio analysis. */}}
 function play(){setError('');connectDisco();void audio.current?.play().catch((reason:DOMException)=>{if(reason.name==='AbortError')return;setPlaying(false);setError('Tap Play to start music.');});}
 useImperativeHandle(ref,()=>({start:play}));
 function change(next:number){const n=(next+tracks.length)%tracks.length;setIndex(n);if(audio.current){audio.current.src=safeMediaURL(tracks[n].src);audio.current.load();play();}}
 if(!tracks.length)return null;
 return <><DiscoLights analyser={analyser} active={disco&&playing&&!muted} reduced={reduced}/><aside className="audio-soundtrack" aria-label="Background music"><audio ref={audio} src={safeMediaURL(tracks[0].src)} preload="auto" muted={muted} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>change(index+1)} onError={()=>{setPlaying(false);setError('This audio could not play. Choose another song.');}}/><button aria-label={playing?'Pause music':'Play music'} onClick={()=>playing?audio.current?.pause():play()}>{playing?'Ⅱ':'▶'}<span>{playing?'Pause':'Play'}</span></button><button aria-label={muted?'Unmute music':'Mute music'} aria-pressed={muted} onClick={()=>setMuted(!muted)}>{muted?'♩':'♫'}<span>{muted?'Unmute':'Mute'}</span></button>{tracks.length>1&&<select aria-label="Change music" value={index} onChange={e=>change(Number(e.target.value))}>{tracks.map((t,i)=><option key={i} value={i}>{i+1}. {t.title==='Song 1'?'Song 1':t.title.slice(0,28)}</option>)}</select>}<button role="switch" aria-label="Disco lights" aria-checked={disco} onClick={()=>setDisco(!disco)}>✦<span>Disco {disco?'ON':'OFF'}</span></button>{error&&<small role="status">{error}</small>}</aside></>;
});
export default AudioSoundtrack;
