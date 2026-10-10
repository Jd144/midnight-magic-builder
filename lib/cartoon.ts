export type CartoonScene='shop'|'train'|'rain'|'call'|'birthday'|'stars'|'park';
export function cartoonScene(text:string,index:number):CartoonScene {
 const chosen=text.match(/^\[scene:(shop|train|rain|call|birthday|stars|park)\]/)?.[1];
 if(chosen)return chosen as CartoonScene;
 if(/grocery|store|shop|dukaan|dukan|kirana/i.test(text))return 'shop';
 if(/train|rail|station/i.test(text))return 'train';
 if(/rain|umbrella|baarish|barish/i.test(text))return 'rain';
 if(/phone|call|chat|message/i.test(text))return 'call';
 if(/birthday|bday|cake|janamdin/i.test(text))return 'birthday';
 if(/star|moon|night|taare|chand/i.test(text))return 'stars';
 return (['park','rain','stars','birthday'] as CartoonScene[])[index%4];
}
export const sceneLabels:Record<CartoonScene,string>={shop:'Our first hello',train:'A journey together',rain:'Under one umbrella',call:'One more little call',birthday:'Your birthday wish',stars:'Our little universe',park:'A moment together'};
