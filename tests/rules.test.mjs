import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,collection,getDocs} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';
const projectId='demo-riwaayat';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_STORAGE_EMULATOR_HOST)throw new Error('Run through npm run test:security; emulators are required.');
const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8086,rules:await readFile('firestore.rules','utf8')},storage:{host:'127.0.0.1',port:9198,rules:await readFile('storage.rules','utf8')}});
const path='owners/alice/events/event-a';const image='owners/alice/events/event-a/photos/photo.webp';
try{
 await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),path),{ownerId:'alice',status:'draft'});await uploadBytes(ref(c.storage(),image),new Uint8Array([1,2,3]),{contentType:'image/webp'});});
 const alice=env.authenticatedContext('alice',{email_verified:true}),bob=env.authenticatedContext('bob',{email_verified:true}),unverified=env.authenticatedContext('alice',{email_verified:false}),guest=env.unauthenticatedContext();
 await test('verified owner can read private draft and list own invitations',async()=>{await assertSucceeds(getDoc(doc(alice.firestore(),path)));await assertSucceeds(getDocs(collection(alice.firestore(),'owners/alice/events')));});
 await test('other users, unverified users and anonymous guests cannot read drafts or photos',async()=>{for(const c of [bob,unverified,guest]){await assertFails(getDoc(doc(c.firestore(),path)));await assertFails(getBytes(ref(c.storage(),image)));}});
 await test('all direct document writes and direct uploads are denied, including owner',async()=>{await assertFails(setDoc(doc(alice.firestore(),path),{ownerId:'alice',status:'published'}));await assertFails(uploadBytes(ref(alice.storage(),image),new Uint8Array([0])));});
 await test('verified owner can read uploaded photo',async()=>{assert.equal((await assertSucceeds(getBytes(ref(alice.storage(),image)))).byteLength,3);});
}finally{await env.cleanup();}
