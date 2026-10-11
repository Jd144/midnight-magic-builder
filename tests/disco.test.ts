import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bassEnergy,smoothBass} from '../lib/disco';
test('disco reacts to bass rather than treble or silence',()=>{
 const bins=new Uint8Array(1024);assert.equal(bassEnergy(bins,48000,2048),0);
 bins.fill(255,60,100);assert.equal(bassEnergy(bins,48000,2048),0);
 bins.fill(200,2,11);assert.ok(bassEnergy(bins,48000,2048)>.5);
 assert.equal(bassEnergy(bins,0,0),0);
});
test('bass attacks and decays smoothly without exceeding the signal bounds',()=>{
 assert.ok(smoothBass(0,1,.016)>0&&smoothBass(0,1,.016)<.15);
 assert.ok(smoothBass(1,0,.016)<1&&smoothBass(1,0,.016)>.9);
 assert.equal(smoothBass(.5,1,0),.5);
});
