import { diary } from '@/lib/story-access';
import { fail } from '@/lib/sharing-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{return await diary(r,(await c.params).id);}catch(e){return fail(e);}}
export async function PUT(r:Request,c:Context){try{return await diary(r,(await c.params).id);}catch(e){return fail(e);}}
