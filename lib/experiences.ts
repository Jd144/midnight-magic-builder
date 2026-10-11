import type {Site} from './model';
export const experiences=[
 {id:'universe',name:'The Komalverse',tag:'3D UNIVERSE',icon:'◉',description:'Orbit through a constellation of memory planets. Each world opens a piece of their story.'},
 {id:'mystery',name:'Mystery Game',tag:'SECRET UNLOCKS',icon:'⌕',description:'Follow clues, solve personal puzzles and discover the surprise at the end.'},
 {id:'museum',name:'Personal Digital Museum',tag:'A PRIVATE COLLECTION',icon:'▥',description:'Step into curated exhibits of photographs, letters, voice notes and shared moments.'},
 {id:'classified',name:'Secret Classified Project',tag:'FOR THEIR EYES',icon:'⌘',description:'Open a secret dossier, explore locked folders and reveal a birthday mission.'},
 {id:'time',name:'Time Machine',tag:'THROUGH OUR MEMORIES',icon:'◷',description:'Travel from your first hello through today, then open a letter from the future.'}
] as const;
export type ExperienceId=NonNullable<Site['experience']>;
export function chooseExperience(site:Site,experience:ExperienceId):Site{return {...site,experience};}
export function exhibitChapters(site:Site){const visible=site.chapters.filter(c=>!c.hidden);const order=site.experience==='museum'?site.experienceSettings?.museum?.order:undefined;return order?.length?[...visible].sort((a,b)=>{const x=order.indexOf(a.id),y=order.indexOf(b.id);return (x<0?99:x)-(y<0?99:y);}):visible;}
export function cleanExperienceSettings(site:Site){if(!site.experienceSettings)return;const ids=new Set(site.chapters.filter(c=>!c.hidden).map(c=>c.id));const settings=site.experienceSettings;for(const values of [settings.universe?.labels,settings.classified?.folders,settings.time?.dates])if(values)for(const id of Object.keys(values))if(!ids.has(id))delete values[id];if(settings.museum?.order)settings.museum.order=settings.museum.order.filter(id=>ids.has(id));}
