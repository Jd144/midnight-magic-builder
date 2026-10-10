import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cartoonScene} from '../lib/cartoon';
test('saved story selects scenes; explicit setting wins without rewriting the original story',()=>{
 assert.equal(cartoonScene('Our first meeting in the grocery store',0),'shop');
 assert.equal(cartoonScene('A train journey in the rain',1),'train');
 assert.equal(cartoonScene('[scene:rain] A train ride together',1),'rain');
 assert.equal(cartoonScene('Birthday wishes',3),'birthday');
 assert.equal(cartoonScene('A phone call',2),'call');
 assert.equal(cartoonScene('',0),'park');
});
