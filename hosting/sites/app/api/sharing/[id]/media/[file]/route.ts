import { upload,readMedia,fail } from '@/lib/sharing-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string,file:string}>};
export async function GET(r:Request,c:Context){try{const {id,file}=await c.params;return await readMedia(r,id,file);}catch(e){return fail(e);}}
export async function PUT(r:Request,c:Context){try{const {id,file}=await c.params;return await upload(r,id,file);}catch(e){return fail(e);}}
