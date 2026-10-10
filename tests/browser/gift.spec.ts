import {test,expect} from '@playwright/test';
import {newSite} from '../../lib/model';
test('password protects QR destination and media; curtains, birthday wishes and recipient diary',async({page,browser,request})=>{
 test.skip(!process.env.MIDNIGHT_ONLINE_TEST,'Requires native hosted storage.');
 const base=process.env.MIDNIGHT_TEST_BASE_URL!;const local=new URL(base).hostname==='127.0.0.1';
 const story=newSite();story.recipient='Sample recipient';story.chapters=story.chapters.filter(c=>!c.hidden);story.chapters[0].text='A password protected gift';
 const token=crypto.randomUUID()+crypto.randomUUID();const own={Authorization:'Bearer '+token,Origin:new URL(base).origin};
 async function api(method:string,path:string,options:Parameters<typeof request.fetch>[1]={}){for(let i=0;i<3;i++){const r=await request.fetch(path,{...options,method});if(r.status()!==503||!(await r.text()).includes('worker restarted')||i===2)return r;}throw new Error('Preview unavailable');}
 expect((await api('POST','/api/sharing/'+story.id,{headers:own})).status()).toBe(200);
 const file=crypto.randomUUID();const src=new URL('/api/sharing/'+story.id+'/media/'+file,base).href;
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64');
 expect((await api('PUT','/api/sharing/'+story.id+'/media/'+file,{headers:{...own,'Content-Type':'image/png'},data:png})).status()).toBe(200);
 story.chapters[0].media=[{id:file,kind:'image',src,caption:'Private memory',x:50,y:50,zoom:1}];
 expect((await api('PUT','/api/sharing/'+story.id,{headers:own,data:story})).status()).toBe(200);
 await page.goto('/');await page.evaluate(({story,token})=>{localStorage.setItem('mm-drafts',JSON.stringify([story]));localStorage.setItem('mm-publication-key-'+story.id,token);localStorage.setItem('mm-online-'+story.id,'1');},{story,token});await page.reload();await page.getByRole('button',{name:'Open editor'}).click();await page.route('**/api/sharing/*/settings',async route=>{if(route.request().method()!=='GET'){await route.continue();return;}const response=await route.fetch();await new Promise(r=>setTimeout(r,500));await route.fulfill({response});});await page.getByRole('button',{name:'Style',exact:true}).click();
 await page.getByLabel('Birthday password',{exact:true}).fill('Birthday-secret-42');await page.getByLabel('Recipient login email',{exact:true}).fill('recipient@example.test');await page.getByRole('button',{name:'Save password & diary settings'}).click();await expect(page.getByText('Access settings saved online.',{exact:false})).toBeVisible();
 const access=await (await api('GET','/api/sharing/'+story.id+'/settings',{headers:own})).json();expect(access.diaryEmail).toBe('recipient@example.test');
 const diaryGate=await api('GET','/api/sharing/'+story.id+'/diary');expect(diaryGate.status(),await diaryGate.text()).toBe(401);
 expect((await api('GET','/api/sharing/'+story.id)).status()).toBe(401);expect((await api('GET',src)).status()).toBe(401);
 const leaked=await (await api('GET','/api/sharing/'+story.id,{headers:own})).json();expect(JSON.stringify(leaked)).not.toContain('Birthday-secret');expect(JSON.stringify(leaked)).not.toContain('recipient@example.test');
 const visitor=await browser.newContext({baseURL:base,viewport:{width:390,height:844},reducedMotion:'reduce'});const view=await visitor.newPage();await view.goto('/s/'+story.id);await expect(view.getByLabel('Birthday password')).toBeVisible();await view.getByLabel('Birthday password').fill('wrong-password');await view.getByRole('button',{name:'Unlock my surprise'}).click();await expect(view.getByRole('alert')).toContainText('not correct');await view.getByLabel('Birthday password').fill('Birthday-secret-42');await view.getByRole('button',{name:'Unlock my surprise'}).click();await expect(view.getByRole('button',{name:'Draw the curtains'})).toBeVisible();await view.screenshot({path:'work/gift-curtain-mobile.png'});await view.setViewportSize({width:1280,height:800});await view.screenshot({path:'work/gift-curtain-desktop.png'});await view.setViewportSize({width:390,height:844});await view.getByRole('button',{name:'Draw the curtains'}).click();await expect(view.getByText('A password protected gift',{exact:true})).toBeVisible();await view.getByRole('button',{name:'Blow out the candle'}).click();await expect(view.getByText('May your wish find its way.',{exact:true})).toBeVisible();await view.screenshot({path:'work/gift-celebration-mobile.png'});await expect(view.getByRole('link',{name:'Sign in with ChatGPT to open your diary'})).toHaveAttribute('target','_top');expect(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await api('GET','/api/sharing/'+story.id+'/diary')).status()).toBe(401);
 if(local){
  const identity={'oai-authenticated-user-id':'test-recipient-'+story.id,'oai-authenticated-user-email':'recipient@example.test'};
  const account=await browser.newContext({baseURL:base,extraHTTPHeaders:identity});await account.addCookies(await visitor.cookies());const journal=await account.newPage();await journal.goto('/s/'+story.id);await journal.getByRole('button',{name:'Draw the curtains'}).click();await journal.getByLabel('A page from today').fill('Today I made a wish and kept this memory.');await expect(journal.getByRole('status')).toContainText('Saved with date');await expect(journal.locator('time')).toHaveAttribute('datetime',/T/);await account.close();
  const returning=await browser.newContext({baseURL:base,extraHTTPHeaders:identity});const entries=await (await returning.request.get('/api/sharing/'+story.id+'/diary')).json();expect(entries.entries[0].body).toBe('Today I made a wish and kept this memory.');await returning.close();
  expect((await api('GET','/api/sharing/'+story.id+'/diary',{headers:{...identity,'oai-authenticated-user-id':'different-user'}})).status()).toBe(403);
  expect((await api('GET','/api/sharing/'+story.id+'/diary',{headers:{...identity,'oai-authenticated-user-email':'creator@example.test'}})).status()).toBe(403);
  expect((await api('PUT','/api/sharing/'+story.id+'/settings',{headers:own,data:{diaryEmail:'new@example.test'}})).status()).toBe(409);
 }else{
  // Production dispatch must reject client-supplied identity headers.
  expect((await api('GET','/api/sharing/'+story.id+'/diary',{headers:{'oai-authenticated-user-id':'forged-user','oai-authenticated-user-email':'recipient@example.test'}})).status()).toBe(401);
 }
 expect((await api('PUT','/api/sharing/'+story.id+'/settings',{headers:own,data:{password:'Replacement-secret-42'}})).status()).toBe(200);expect((await visitor.request.get('/api/sharing/'+story.id)).status()).toBe(401);expect((await visitor.request.get(src)).status()).toBe(401);
 expect((await api('PUT','/api/sharing/'+story.id+'/settings',{headers:{...own,Authorization:'Bearer '+crypto.randomUUID()+crypto.randomUUID()},data:{removePassword:true}})).status()).toBe(403);
 expect((await api('POST','/api/sharing/'+story.id+'?action=unpublish',{headers:own})).status()).toBe(200);await visitor.close();
});
