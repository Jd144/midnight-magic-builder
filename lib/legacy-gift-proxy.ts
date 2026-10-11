import {originalStudio,legacyGiftId,legacyMediaSnapshot} from './legacy-gifts';
export async function legacyGiftProxy(request:Request,id:string,path:string[],fetcher:typeof fetch=fetch):Promise<Response>{
 const origin=new URL(request.url).origin;
 const json=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}});
 if(legacyGiftId(id)!==id)return json('Invalid gift address.',400);
 const media=path.length===2&&path[0]==='media'&&legacyGiftId(path[1])===path[1];
 const unlock=path.length===1&&path[0]==='unlock';
 if((request.method==='GET'&&(path.length===0||media))===false&&(request.method==='POST'&&unlock)===false)return json('This recovery connection only opens existing gifts and their media.',405);
 const headers=new Headers();
 const cookie=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('mm-guest-'+id+'='));
 if(cookie&&new RegExp('^mm-guest-'+id+'=[a-f0-9-]{72}$').test(cookie))headers.set('Cookie',cookie);
 const range=request.headers.get('range');if(media&&range&&/^bytes=\d*-\d*$/.test(range))headers.set('Range',range);
 let body:string|undefined;
 if(unlock){if(request.headers.get('origin')!==origin)return json('Cross-origin unlock requests are not allowed.',403);if(Number(request.headers.get('content-length')||0)>4096)return json('Unlock request is too large.',413);body=await request.text();if(body.length>4096)return json('Unlock request is too large.',413);try{const data=JSON.parse(body);if(typeof data.password!=='string'||data.password.length>128)return json('Enter a valid birthday password.',400);body=JSON.stringify({password:data.password});}catch{return json('Enter a valid birthday password.',400);}headers.set('Content-Type','application/json');headers.set('Origin',originalStudio);}
 try{
  const upstream=await fetcher(originalStudio+'/api/sharing/'+id+(path.length?'/'+path.join('/') : ''),{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  const output=new Headers({'Cache-Control':'private, no-store','Vary':'Cookie, Range','X-Content-Type-Options':'nosniff'});
  for(const key of ['content-type','content-range','accept-ranges']){const value=upstream.headers.get(key);if(value)output.set(key,value);}
  // Only the existing gift session cookie can cross this recovery connection.
  const session=upstream.headers.get('set-cookie');if(unlock&&session&&session.startsWith('mm-guest-'+id+'='))output.set('Set-Cookie',session);
  if(upstream.status===200&&path.length===0){const snapshot=legacyMediaSnapshot(await upstream.json(),origin,id);output.set('Content-Type','application/json');return new Response(JSON.stringify(snapshot),{status:200,headers:output});}
  return new Response(upstream.body,{status:upstream.status,headers:output});
 }catch{return json('The original gift storage is temporarily unavailable. Please try again.',502);}
}
