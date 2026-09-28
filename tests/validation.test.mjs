import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const serverRequire=createRequire(new URL('../functions/package.json',import.meta.url));
const sharp=serverRequire('sharp');
import {normalizePhoto,draftInput} from '../functions/validation.mjs';
test('reject arbitrary bytes and disguised SVG',async()=>{await assert.rejects(()=>normalizePhoto(Buffer.from('not an image').toString('base64')));await assert.rejects(()=>normalizePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>').toString('base64')));});
test('normalize an actual image to bounded WebP',async()=>{const source=await sharp({create:{width:2600,height:30,channels:3,background:'#ffeecc'}}).png().toBuffer();const result=await normalizePhoto(source.toString('base64'));assert.equal(result.width,2400);assert.equal((await sharp(result.data).metadata()).format,'webp');});
test('reject oversized input and malformed draft fields',async()=>{await assert.rejects(()=>normalizePhoto(Buffer.alloc(4*1024*1024+1).toString('base64')));assert.equal(draftInput.safeParse({title:'   ',templateId:'unknown',requestId:'bad',ownerId:'victim'}).success,false);});
