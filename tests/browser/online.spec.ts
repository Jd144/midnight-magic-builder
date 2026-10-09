import {test,expect} from '@playwright/test';
import {newSite} from '../../lib/model';
test('legacy story preserved; independent visitors, media, ownership, snapshot isolation and revocation',async({page,browser})=>{
  test.skip(!process.env.MIDNIGHT_ONLINE_TEST,'Requires the Sites D1/R2 adapter.');
  const story=newSite();
  story.recipient='Sample recipient';
  story.chapters[0].text='A preserved birthday message';
  const mediaId=crypto.randomUUID();
  story.chapters[0].media=[{id:mediaId,kind:'image',src:'local:'+mediaId,caption:'Preserved photo',x:25,y:75,zoom:1.5}];
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
  await page.goto('/');
  await page.evaluate(async({story,mediaId,png})=>{
    localStorage.setItem('mm-drafts',JSON.stringify([story]));
    localStorage.setItem('mm-published-'+story.id,JSON.stringify(story));
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('midnight-magic-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').put(new Blob([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],{type:'image/png'}),mediaId);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  },{story,mediaId,png});
  await page.reload();
  await expect(page.getByText('ONLINE SHARING',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open editor'}).click();
  await expect(page.getByLabel('Recipient name',{exact:true})).toHaveValue('Sample recipient');
  await expect(page.getByText('Saved demo link · choose Publish online to activate',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Publish online',exact:true}).click();
  await expect(page.getByText('Public birthday link · opens on any device',{exact:true})).toBeVisible();
  const href=await page.locator('.share > a').getAttribute('href');
  expect(href).toContain('/s/'+story.id);
  expect(await page.evaluate(id=>!!localStorage.getItem('mm-published-'+id),story.id)).toBe(true);
  const visitor=await browser.newContext({baseURL:process.env.MIDNIGHT_TEST_BASE_URL,viewport:{width:390,height:844}});
  // Wrangler on Windows can restart between D1 requests. Retry only its
  // explicit restart response; application errors still fail immediately.
  async function probe(method:string,url:string,options:Parameters<typeof visitor.request.fetch>[1]={}) {
    for(let i=0;i<3;i++) {
      const response=await visitor.request.fetch(url,{...options,method});
      if(response.status()!==503 || !(await response.text()).includes('worker restarted') || i===2) return response;
    }
    throw new Error('Preview unavailable');
  }
  const view=await visitor.newPage();await view.goto(href!);
  await expect(view.getByText('A preserved birthday message',{exact:true})).toBeVisible();
  await expect(view.locator('img').first()).toBeVisible();
  await expect.poll(()=>view.locator('img').first().evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(1);
  expect(await view.evaluate(()=>Object.keys(localStorage).length)).toBe(0);
  expect(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const publicSnapshot=await (await probe('GET','/api/sharing/'+story.id)).json();
  const photo=publicSnapshot.chapters[0].media[0];expect(photo.x).toBe(25);expect(photo.zoom).toBe(1.5);
  const file=await probe('GET',photo.src);expect(file.status()).toBe(200);expect(file.headers()['content-type']).toBe('image/png');
  const range=await probe('GET',photo.src,{headers:{Range:'bytes=0-7'}});expect(range.status()).toBe(206);expect((await range.body()).length).toBe(8);
  expect((await probe('PUT','/api/sharing/'+story.id,{data:publicSnapshot})).status()).toBe(403);
  const foreignToken=crypto.randomUUID()+crypto.randomUUID();
  const forbiddenDelete=await probe('POST','/api/sharing/'+story.id+'?action=unpublish',{headers:{Authorization:'Bearer '+foreignToken}});
  expect(forbiddenDelete.status(),await forbiddenDelete.text()).toBe(403);
  const ownToken=await page.evaluate(id=>localStorage.getItem('mm-publication-key-'+id),story.id);
  expect((await probe('PUT','/api/sharing/'+story.id,{headers:{Authorization:'Bearer '+ownToken,Origin:'https://untrusted.example'},data:publicSnapshot})).status()).toBe(403);
  const ownHeader={Authorization:'Bearer '+ownToken};
  expect((await probe('PUT','/api/sharing/'+story.id+'/media/'+crypto.randomUUID(),{headers:{...ownHeader,'Content-Type':'image/svg+xml'},data:'<svg/>'})).status()).toBe(400);
  const foreign=structuredClone(publicSnapshot);foreign.chapters[0].media[0].src=new URL('/api/sharing/'+crypto.randomUUID()+'/media/'+crypto.randomUUID(),href!).href;
  expect((await probe('PUT','/api/sharing/'+story.id,{headers:ownHeader,data:foreign})).status()).toBe(403);
  await page.getByLabel('Your words',{exact:true}).fill('Private draft edit');await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await view.reload();await expect(view.getByText('A preserved birthday message',{exact:true})).toBeVisible();
  await expect(view.getByText('Private draft edit',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Publish online',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published');
  await view.reload();await expect(view.getByText('Private draft edit',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Unpublish',exact:true}).click();await expect(page.getByRole('status')).toContainText('removed');
  expect((await probe('GET','/api/sharing/'+story.id)).status()).toBe(404);
  expect((await probe('GET',photo.src)).status()).toBe(404);
  await page.reload();await page.getByRole('button',{name:'Open editor'}).click();await expect(page.getByLabel('Your words',{exact:true})).toHaveValue('Private draft edit');
  await visitor.close();
});
