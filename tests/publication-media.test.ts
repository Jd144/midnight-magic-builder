import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newSite} from '../lib/model';
import {preparePublicationMedia} from '../lib/publication-media';
test('publication recovers cached preview URLs and trims media without changing the original draft',()=>{
  const site=newSite();const origin='https://birthday.example';
  const path='/api/sharing/'+site.id+'/media/'+crypto.randomUUID();
  site.chapters[0].media=[{id:crypto.randomUUID(),kind:'image',src:'  http://birthday.example'+path+'  ',caption:'A memory',x:50,y:50,zoom:1}];
  site.music='  ';const original=structuredClone(site);
  const snapshot=preparePublicationMedia(site,origin);
  assert.equal(snapshot.music,'');assert.equal(snapshot.chapters[0].media[0].src,origin+path);assert.deepEqual(site,original);
});
test('device file paths and external HTTP URLs identify the affected chapter instead of failing generically',()=>{
  const site=newSite();site.chapters[5].media=[{id:crypto.randomUUID(),kind:'image',src:'file:///C:/photos/photo.jpg',caption:'',x:50,y:50,zoom:1}];
  assert.throws(()=>preparePublicationMedia(site,'https://birthday.example'),/Photo gallery · image 1.*Upload/);
  site.chapters[5].hidden=true;assert.equal(preparePublicationMedia(site,'https://birthday.example').chapters.length,11);
  site.music='http://audio.example/song.mp3';assert.throws(()=>preparePublicationMedia(site,'https://birthday.example'),/Background music/);
});

test('optional stale music is omitted without changing the draft or relaxing chapter validation',()=>{
 const site=newSite();site.music='file:///C:/old/song.mp3';const original=structuredClone(site);
 assert.equal(preparePublicationMedia(site,'https://birthday.example',true).music,'');assert.deepEqual(site,original);
 site.music='https://audio.example/song.mp3';assert.equal(preparePublicationMedia(site,'https://birthday.example',true).music,site.music);
 site.chapters[0].media=[{id:crypto.randomUUID(),kind:'image',src:'file:///C:/photo.jpg',caption:'',x:50,y:50,zoom:1}];
 assert.throws(()=>preparePublicationMedia(site,'https://birthday.example',true),/image 1/);
});
