/** Only the bass band drives the background, independently of song loudness. */
export function bassEnergy(bins:Uint8Array,sampleRate:number,fftSize:number){
 if(sampleRate<=0||fftSize<=0)return 0;
 const start=Math.max(1,Math.ceil(35*fftSize/sampleRate)),end=Math.min(bins.length-1,Math.floor(250*fftSize/sampleRate));
 if(end<start)return 0;
 let sum=0;for(let i=start;i<=end;i++)sum+=(bins[i]/255)**2;
 return Math.min(1,Math.sqrt(sum/(end-start+1))*1.8);
}
export function smoothBass(previous:number,target:number,seconds:number){
 const speed=target>previous?7:3;
 return previous+(target-previous)*(1-Math.exp(-speed*Math.min(.1,Math.max(0,seconds))));
}
