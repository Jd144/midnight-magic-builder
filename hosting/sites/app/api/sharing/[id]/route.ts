import { read,reserve,publishSnapshot,unpublishSnapshot,fail } from '@/lib/sharing-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_r:Request,c:Context){try{return await read(_r,(await c.params).id);}catch(e){return fail(e);}}
export async function POST(r:Request,c:Context){try{const {id}=await c.params;return new URL(r.url).searchParams.get('action')==='unpublish' ? await unpublishSnapshot(r,id) : await reserve(r,id);}catch(e){return fail(e);}}
export async function PUT(r:Request,c:Context){try{return await publishSnapshot(r,(await c.params).id);}catch(e){return fail(e);}}
