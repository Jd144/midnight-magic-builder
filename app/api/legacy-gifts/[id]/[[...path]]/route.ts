import {legacyGiftProxy} from '@/lib/legacy-gift-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
async function handle(request:Request,context:{params:Promise<{id:string;path?:string[]}>}){const {id,path=[]}=await context.params;return legacyGiftProxy(request,id,path);}
export {handle as GET,handle as POST};
