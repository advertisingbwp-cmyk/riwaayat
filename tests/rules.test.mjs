import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where,serverTimestamp} from 'firebase/firestore';
import {build} from 'esbuild';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run through the Firestore emulator.');
const result=await build({stdin:{contents:"export * from './src/invitation-store.ts'; export * from './src/delete-data.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',packages:'external',write:false});
const file=new URL('../.store-test.mjs',import.meta.url);await writeFile(file,result.outputFiles[0].text);
let store;try{store=await import(file.href);}finally{await unlink(file);}
const env=await initializeTestEnvironment({projectId:'demo-riwaayat',firestore:{host:'127.0.0.1',port:8086,rules:await readFile('firestore.rules','utf8')}});
const alice=env.authenticatedContext('alice',{email_verified:true}).firestore();
const bob=env.authenticatedContext('bob',{email_verified:true}).firestore();
const unverified=env.authenticatedContext('alice',{email_verified:false}).firestore();
const guest=env.unauthenticatedContext().firestore();
const ownerPath='owners/alice/events/event-a',eventPath='events/event-a';
const content={couple:'Private names',imagePhotoId:'photo-0',venuePhotoId:null,galleryPhotoIds:['photo-1','photo-2','photo-3','photo-4','photo-5'],ceremonies:[{id:'nikah',title:'Nikah'}]};
const rsvp=id=>({id,name:'Guest',attendance:'yes',partySize:2,meal:'Halal',ceremonies:['nikah'],note:'',createdAt:serverTimestamp()});
const note=(id,visibility)=>({id,displayName:'Guest',message:'Congratulations',status:'pending',consent:true,visibility,createdAt:serverTimestamp()});
async function adminUpdate(path,data){await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),path),data));}
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),ownerPath),{id:'event-a',ownerId:'alice',templateId:'royal',title:'Test',content,status:'draft',revision:1});
  for(let i=0;i<6;i++)await setDoc(doc(c.firestore(),`${ownerPath}/photos/photo-${i}`),{id:`photo-${i}`,path:'data:image/webp;base64,'+'A'.repeat(260000),status:'ready'});
 });
 await test('private drafts require verified ownership; missing public record is readable by its owner',async()=>{
  await assertSucceeds(getDoc(doc(alice,ownerPath)));await assertSucceeds(getDoc(doc(alice,eventPath)));
  for(const db of [bob,guest,unverified])await assertFails(getDoc(doc(db,ownerPath)));
 });
 await test('publish selected photos and deny public enumeration',async()=>{
  await store.publishInvitation(alice,'alice','event-a',1,'public','');
  await assertSucceeds(getDoc(doc(guest,eventPath)));await assertFails(getDocs(collection(guest,'events')));
  assert.equal((await getDocs(collection(alice,`${eventPath}/photos`))).size,6);
  await assertFails(updateDoc(doc(bob,eventPath),{title:'hijack'}));
 });
 await test('valid replies are host-only and malformed or backdated writes fail',async()=>{
  await assertSucceeds(setDoc(doc(guest,`${eventPath}/rsvps/r1`),rsvp('r1')));
  await assertSucceeds(getDoc(doc(alice,`${eventPath}/rsvps/r1`)));
  await assertFails(getDoc(doc(guest,`${eventPath}/rsvps/r1`)));
  await setDoc(doc(bob,'owners/bob/events/event-a'),{ownerId:'bob',title:'Collision'});
  await assertFails(getDoc(doc(bob,`${eventPath}/rsvps/r1`)));
  await assertFails(setDoc(doc(guest,`${eventPath}/rsvps/bad`),{...rsvp('bad'),partySize:999}));
  await assertFails(setDoc(doc(guest,`${eventPath}/rsvps/backdate`),{...rsvp('backdate'),createdAt:new Date(0)}));
 });
 await test('approved query works without exposing pending guestbook entries',async()=>{
  await assertSucceeds(setDoc(doc(guest,`${eventPath}/guestbook/n1`),note('n1','public')));
  await assertSucceeds(setDoc(doc(guest,`${eventPath}/guestbook/n2`),note('n2','public')));
  await updateDoc(doc(alice,`${eventPath}/guestbook/n1`),{status:'approved'});
  const rows=await assertSucceeds(getDocs(query(collection(guest,`${eventPath}/guestbook`),where('status','==','approved'),where('visibility','==','public'))));assert.equal(rows.size,1);
  await assertFails(getDocs(collection(guest,`${eventPath}/guestbook`)));
 });
 await test('closed forms reject direct SDK submissions',async()=>{
  await updateDoc(doc(alice,eventPath),{guestSettings:{rsvpOpen:false,guestbookOpen:false}});
  await assertFails(setDoc(doc(guest,`${eventPath}/rsvps/closed`),rsvp('closed')));
  await assertFails(setDoc(doc(guest,`${eventPath}/guestbook/closed`),note('closed','public')));
  await updateDoc(doc(alice,eventPath),{guestSettings:{rsvpOpen:true,guestbookOpen:true}});
 });
 await test('public to passcode replaces all selected photos with bounded ciphertext',async()=>{
  await store.publishInvitation(alice,'alice','event-a',1,'passcode','Correct passcode 123');
  const pub=(await getDoc(doc(guest,eventPath))).data();assert.equal(pub.content,undefined);assert.equal(pub.guestToken,undefined);assert(pub.encryptedPayload.ciphertext.length<10000);
  for(let i=0;i<6;i++){const photo=(await getDoc(doc(guest,`${eventPath}/photos/photo-${i}`))).data();assert.equal(photo.path,undefined);assert(photo.encryptedPayload.ciphertext.length<1000000);}
  await assertFails(setDoc(doc(guest,`${eventPath}/rsvps/private-bad`),rsvp('private-bad')));
  const token=(await getDoc(doc(alice,ownerPath))).data().guestToken;
  await assertSucceeds(setDoc(doc(guest,`${eventPath}/rsvps/private-ok`),{...rsvp('private-ok'),guestToken:token}));
  await assertSucceeds(setDoc(doc(guest,`${eventPath}/guestbook/private-note`),{...note('private-note','private'),guestToken:token}));
  await updateDoc(doc(alice,`${eventPath}/guestbook/private-note`),{status:'approved'});
  await assertFails(getDoc(doc(guest,`${eventPath}/guestbook/private-note`)));
 });
 await test('unpublish blocks content, photos and submissions',async()=>{
  await store.unpublishInvitation(alice,'alice','event-a');
  await assertFails(getDoc(doc(guest,eventPath)));await assertFails(getDoc(doc(guest,`${eventPath}/photos/photo-0`)));
  await assertFails(setDoc(doc(guest,`${eventPath}/rsvps/unpublished`),rsvp('unpublished')));
 });
 await test('duplicate copies private photos without publication state or secret tokens',async()=>{
  const id=await store.duplicateInvitation(alice,'alice','event-a');const copy=(await getDoc(doc(alice,`owners/alice/events/${id}`))).data();assert.equal(copy.status,'draft');assert.equal(copy.guestToken,undefined);assert.equal(copy.publishedRevision,undefined);assert.equal((await getDocs(collection(alice,`owners/alice/events/${id}/photos`))).size,6);
 });
 await test('browser deletion removes public and private child collections',async()=>{
  const id=await store.duplicateInvitation(alice,'alice','event-a');
  await store.publishInvitation(alice,'alice',id,0,'public','');
  await store.deleteInvitation(alice,'alice',id);
  assert.equal((await getDoc(doc(alice,`owners/alice/events/${id}`))).exists(),false);
  assert.equal((await getDocs(collection(alice,`owners/alice/events/${id}/photos`))).size,0);
  await env.withSecurityRulesDisabled(async c=>{assert.equal((await getDoc(doc(c.firestore(),`events/${id}`))).exists(),false);assert.equal((await getDocs(collection(c.firestore(),`events/${id}/photos`))).size,0);});
 });
 await test('stale revision cannot publish',async()=>{await adminUpdate(ownerPath,{revision:2});await assert.rejects(store.publishInvitation(alice,'alice','event-a',1,'public',''));});
}finally{await env.cleanup();}
