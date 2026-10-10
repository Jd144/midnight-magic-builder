"use client";
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {bassEnergy,smoothBass} from '@/lib/disco';
export default function DiscoLights({analyser,active,reduced}:{analyser:AnalyserNode|null;active:boolean;reduced:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=canvas.current,ctx=element?.getContext('2d');if(!element||!ctx)return;
  let frame=0,last=0,energy=0;const bins=new Uint8Array(analyser?.frequencyBinCount||1);
  if(!active){ctx.clearRect(0,0,element.width,element.height);element.dataset.bass='0';return;}
  function draw(time:number){if(!element||!ctx)return;const width=innerWidth,height=innerHeight,scale=Math.min(devicePixelRatio||1,1.5);if(element.width!==Math.round(width*scale)||element.height!==Math.round(height*scale)){element.width=Math.round(width*scale);element.height=Math.round(height*scale);}ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
   if(!active||document.hidden){energy=0;element.dataset.bass='0';frame=requestAnimationFrame(draw);return;}
   if(analyser)analyser.getByteFrequencyData(bins);const measured=analyser?bassEnergy(bins,analyser.context.sampleRate,analyser.fftSize):0;energy=smoothBass(energy,measured,last?(time-last)/1000:.016);last=time;element.dataset.bass=energy.toFixed(3);
   const pulse=reduced?.1:energy;const angle=reduced?0:time*.00012;const colors=[285,205,335];
   colors.forEach((hue,i)=>{const x=width*(i===0?.06:i===1?.94:.5),y=height*(i===2?.97:.2+Math.sin(angle+i)*.12),radius=Math.max(width,height)*(.35+pulse*.2);const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,`hsla(${hue},85%,65%,${.035+pulse*.14})`);gradient.addColorStop(1,`hsla(${hue},85%,55%,0)`);ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);});
   if(!reduced&&energy>.06){ctx.strokeStyle=`rgba(221,184,255,${energy*.12})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(width*.5,height*.9,Math.min(width,height)*(.16+energy*.15),0,Math.PI*2);ctx.stroke();}
   frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);ctx.clearRect(0,0,element.width,element.height);};
 },[analyser,active,reduced]);
 if(typeof document==='undefined')return null;
 return createPortal(<canvas ref={canvas} className="disco-lights" aria-hidden="true" data-active={active} data-reduced-motion={reduced}/>,document.body);
}
