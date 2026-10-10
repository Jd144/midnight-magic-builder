"use client";
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {bassEnergy,smoothBass} from '@/lib/disco';
export default function DiscoLights({analyser,enabled=true,active,reduced}:{analyser:AnalyserNode|null;enabled?:boolean;active:boolean;reduced:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const element=canvas.current,ctx=element?.getContext('2d');if(!element||!ctx)return;
  let frame=0,last=0,energy=0;const bins=new Uint8Array(analyser?.frequencyBinCount||1);
  if(!enabled||!active){ctx.clearRect(0,0,element.width,element.height);element.dataset.bass='0';return;}
  function draw(time:number){if(!element||!ctx)return;const width=innerWidth,height=innerHeight,scale=Math.min(devicePixelRatio||1,1.5);if(element.width!==Math.round(width*scale)||element.height!==Math.round(height*scale)){element.width=Math.round(width*scale);element.height=Math.round(height*scale);}ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
   if(document.hidden){energy=0;element.dataset.bass='0';frame=requestAnimationFrame(draw);return;}
   if(analyser)analyser.getByteFrequencyData(bins);const measured=analyser?bassEnergy(bins,analyser.context.sampleRate,analyser.fftSize):0;energy=smoothBass(energy,measured,last?(time-last)/1000:.016);last=time;element.dataset.bass=energy.toFixed(3);
   const pulse=reduced?.12:energy,angle=reduced?0:time*.00008;
   [280,190,330].forEach((hue,i)=>{const x=width*(i===0?.04:i===1?.96:.5),y=height*(i===2?.93:.24+Math.sin(angle+i)*.1),radius=Math.max(width,height)*(.32+pulse*.22);const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);gradient.addColorStop(0,`hsla(${hue},75%,65%,${pulse*.26})`);gradient.addColorStop(1,`hsla(${hue},75%,50%,0)`);ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);});
   if(!reduced&&energy>.04){for(let i=0;i<4;i++){const y=height*(.68+i*.045),lift=height*(.06+energy*.09),g=ctx.createLinearGradient(0,0,width,0);g.addColorStop(0,'transparent');g.addColorStop(.25,`rgba(162,215,224,${energy*.19})`);g.addColorStop(.7,`rgba(218,163,233,${energy*.23})`);g.addColorStop(1,'transparent');ctx.strokeStyle=g;ctx.lineWidth=1+i*.35;ctx.beginPath();ctx.moveTo(-width*.1,y);ctx.bezierCurveTo(width*.25,y-lift,width*.65,y+lift*Math.sin(angle+i*.3),width*1.1,y-lift*.5);ctx.stroke();}}
   frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);ctx.clearRect(0,0,element.width,element.height);};
 },[analyser,enabled,active,reduced]);
 if(typeof document==='undefined')return null;
 return createPortal(<div className="ambient-lighting" aria-hidden="true" data-enabled={enabled} data-beating={active} data-reduced-motion={reduced}><div className="aurora-veil veil-one"/><div className="aurora-veil veil-two"/><div className="aurora-dust"/><canvas ref={canvas} className="disco-lights" data-enabled={enabled} data-active={active} data-reduced-motion={reduced}/></div>,document.body);
}
