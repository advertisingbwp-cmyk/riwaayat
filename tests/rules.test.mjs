import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,collection,getDocs} from 'firebase/firestore';

const projectId='demo-riwaayat';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run through firebase emulators; FIRESTORE_EMULATOR_HOST is required.');

const env=await initializeTestEnvironment({
  projectId,
  firestore:{
    host:'127.0.0.1',
    port:8086,
    rules:await readFile('firestore.rules','utf8')
  }
});

const path='owners/alice/events/event-a';
const publicEventPath='events/event-a';

try{
 await env.withSecurityRulesDisabled(async c=>{
   await setDoc(doc(c.firestore(),path),{ownerId:'alice',title:'Private Wedding',status:'draft'});
   await setDoc(doc(c.firestore(),publicEventPath),{ownerId:'alice',title:'Published Wedding',status:'published'});
 });

 const alice=env.authenticatedContext('alice',{email_verified:true});
 const bob=env.authenticatedContext('bob',{email_verified:true});
 const unverified=env.authenticatedContext('alice',{email_verified:false});
 const guest=env.unauthenticatedContext();

 await test('verified owner can read and write own private draft',async()=>{
   await assertSucceeds(getDoc(doc(alice.firestore(),path)));
   await assertSucceeds(getDocs(collection(alice.firestore(),'owners/alice/events')));
   await assertSucceeds(setDoc(doc(alice.firestore(),path),{ownerId:'alice',title:'Updated',status:'draft'}));
 });

 await test('other users and anonymous guests cannot read or write Alice’s private drafts',async()=>{
   for(const c of [bob,guest]){
     await assertFails(getDoc(doc(c.firestore(),path)));
     await assertFails(setDoc(doc(c.firestore(),path),{ownerId:'hacked'}));
   }
 });

 await test('public can read published invitation, but cannot update or delete it',async()=>{
   await assertSucceeds(getDoc(doc(guest.firestore(),publicEventPath)));
   await assertFails(setDoc(doc(guest.firestore(),publicEventPath),{status:'deleted'}));
   await assertFails(setDoc(doc(bob.firestore(),publicEventPath),{status:'deleted'}));
 });

 await test('guest can submit a valid RSVP to published event',async()=>{
   const validRsvp={
     id:'rsvp-1',
     name:'Zain Ahmed',
     attendance:'yes',
     partySize:2,
     meal:'Halal',
     ceremonies:['nikah'],
     note:'Heartiest congratulations!',
     createdAt:new Date()
   };
   await assertSucceeds(setDoc(doc(guest.firestore(),`${publicEventPath}/rsvps/rsvp-1`),validRsvp));
 });

 await test('guest cannot submit an invalid RSVP (tampered schema or bad types)',async()=>{
   const invalidRsvp={
     id:'rsvp-bad',
     name:'Spammer',
     attendance:'invalid-status',
     partySize:999, // exceeds max 6
     extraField:'not-allowed'
   };
   await assertFails(setDoc(doc(guest.firestore(),`${publicEventPath}/rsvps/rsvp-bad`),invalidRsvp));
 });

 await test('guest RSVP responses are private to the host only',async()=>{
   // Alice (host) can read RSVP
   await assertSucceeds(getDoc(doc(alice.firestore(),`${publicEventPath}/rsvps/rsvp-1`)));
   // Bob and guest cannot read RSVP
   await assertFails(getDoc(doc(bob.firestore(),`${publicEventPath}/rsvps/rsvp-1`)));
   await assertFails(getDoc(doc(guest.firestore(),`${publicEventPath}/rsvps/rsvp-1`)));
 });

}finally{
 await env.cleanup();
}
