import { unlock } from '@/lib/story-access';
import { fail } from '@/lib/sharing-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function POST(r:Request,c:Context){try{return await unlock(r,(await c.params).id);}catch(e){return fail(e);}}
