import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { draftInput, photoInput, normalizePhoto } from './validation.mjs';
import {getAuth} from 'firebase-admin/auth';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {assertOwnerActive, assertUnusedEvent, deletionInput, enqueueDeletion, processDeletion} from './deletion.mjs';
initializeApp();
const db=getFirestore();
const options={region:'us-central1',enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true',maxInstances:4,concurrency:8,memory:'512MiB',timeoutSeconds:60};
function user(request){
  if(!request.auth)throw new HttpsError('unauthenticated','Please sign in.');
  if(request.auth.token.email_verified!==true)throw new HttpsError('permission-denied','Verify your email before saving invitations or photos.');
  return request.auth.uid;
}
function input(schema,value){const parsed=schema.safeParse(value);if(!parsed.success)throw new HttpsError('invalid-argument','Check the supplied details.');return parsed.data;}
// Counters are server-only. Limits are charged once per idempotency key.
async function reserve(tx,uid,kind,max){
  const ref=db.doc(`limits/${uid}_${kind}`);const snap=await tx.get(ref);
  const minute=Math.floor(Date.now()/60000),old=snap.data()||{};
  const count=old.minute===minute?old.count:0;
  if(count>=max)throw new HttpsError('resource-exhausted','Too many requests. Please wait a minute and retry.');
  tx.set(ref,{minute,count:count+1,expiresAt:new Date(Date.now()+3600000)});
}
export const createDraft=onCall(options,async request=>{
  const uid=user(request);const data=input(draftInput,request.data);
  const ref=db.doc(`owners/${uid}/events/${data.requestId}`);
  await db.runTransaction(async tx=>{
    await assertOwnerActive(tx,db,uid);await assertUnusedEvent(tx,db,uid,data.requestId);
    const existing=await tx.get(ref);
    if(existing.exists){if(existing.data().title!==data.title||existing.data().templateId!==data.templateId)throw new HttpsError('already-exists','This request was already used. Refresh and try again.');return;}
    await reserve(tx,uid,'draft',10);
    tx.create(ref,{ownerId:uid,templateId:data.templateId,title:data.title,status:'draft',schemaVersion:1,content:null,photoCount:0,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  });
  return {id:ref.id};
});
export const uploadPhoto=onCall(options,async request=>{
  const uid=user(request);const data=input(photoInput,request.data);
  const eventRef=db.doc(`owners/${uid}/events/${data.eventId}`);
  const photoRef=eventRef.collection('photos').doc(data.requestId);
  const event=await eventRef.get();if(!event.exists||event.data().archived)throw new HttpsError('not-found','Invitation not found.');
  let image;try{image=await normalizePhoto(data.base64);}catch{throw new HttpsError('invalid-argument','Use a still JPEG, PNG or WebP under 4 MB and 20 megapixels.');}
  const digest=createHash('sha256').update(image.data).digest('hex');
  const path=`owners/${uid}/events/${data.eventId}/photos/${data.requestId}.webp`;
  const ready=await db.runTransaction(async tx=>{
    await assertOwnerActive(tx,db,uid);
    const [current,photo]=await Promise.all([tx.get(eventRef),tx.get(photoRef)]);
    if(!current.exists||current.data().archived)throw new HttpsError('not-found','Invitation not found.');
    if(photo.exists){if(photo.data().digest!==digest)throw new HttpsError('already-exists','Choose the photo again to start a new upload.');return photo.data().status==='ready';}
    if(current.data().photoCount>=30)throw new HttpsError('resource-exhausted','This invitation has reached its 30 photo limit.');
    await reserve(tx,uid,'upload',10);
    tx.create(photoRef,{path,digest,status:'processing',createdAt:FieldValue.serverTimestamp()});
    tx.update(eventRef,{photoCount:FieldValue.increment(1),updatedAt:FieldValue.serverTimestamp()});return false;
  });
  if(ready)return {id:photoRef.id,path};
  try{
    const file=getStorage().bucket().file(path);
    try{await file.save(image.data,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'image/webp',cacheControl:'private, no-store'}});}catch(error){if(Number(error.code)!==412)throw error;}
    await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);if(!(await tx.get(eventRef)).exists)throw new HttpsError('not-found','Invitation not found.');tx.update(photoRef,{status:'ready',width:image.width,height:image.height,updatedAt:FieldValue.serverTimestamp()});});
    return {id:photoRef.id,path};
  }catch{throw new HttpsError('unavailable','Photo could not be saved. Retry this upload; it will not create a duplicate.');}
});

// Editor and guest access. Published snapshots and guest sessions are server-only.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { saveInput, publishInput, actionInput, guestInput, mediaInput } from './content-schema.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function owned(uid,id){return db.doc(`owners/${uid}/events/${id}`);}
async function removePublication(tx,uid,id){const ref=db.doc(`published/${id}`),snap=await tx.get(ref);if(snap.exists&&snap.data().ownerId===uid)tx.delete(ref);}
function current(snapshot){if(!snapshot.exists||snapshot.data().archived)throw new HttpsError('not-found','Invitation not found.');return snapshot.data();}
function sameRevision(data,revision){if((data.revision||0)!==revision)throw new HttpsError('aborted','This invitation changed in another session. Reload before saving.');}
async function photoManifest(tx,eventRef,content){
 const ids=[...new Set([content.imagePhotoId,...content.galleryPhotoIds].filter(Boolean))];const manifest={};
 for(const id of ids){const photo=await tx.get(eventRef.collection('photos').doc(id));if(!photo.exists||photo.data().status!=='ready')throw new HttpsError('failed-precondition','A selected photograph is not ready.');manifest[id]=photo.data().path;}
 return manifest;
}
export const saveDraft=onCall(options,async request=>{
 const uid=user(request),data=input(saveInput,request.data),ref=owned(uid,data.eventId);const digest=hash(JSON.stringify({title:data.title,content:data.content,revision:data.revision}));
 return db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);const draft=current(await tx.get(ref));
  if(draft.lastSaveId===data.requestId){if(draft.lastSaveDigest!==digest)throw new HttpsError('already-exists','Request already used.');return {revision:draft.revision};}
  sameRevision(draft,data.revision);await photoManifest(tx,ref,data.content);await reserve(tx,uid,'save',30);
  const revision=(draft.revision||0)+1;tx.update(ref,{title:data.title,content:data.content,revision,lastSaveId:data.requestId,lastSaveDigest:digest,updatedAt:FieldValue.serverTimestamp()});return {revision};
 });
});
export const publishInvitation=onCall(options,async request=>{
 const uid=user(request),data=input(publishInput,request.data),ref=owned(uid,data.eventId),publicRef=db.doc(`published/${data.eventId}`);
 const salt=randomBytes(16).toString('hex');const passwordHash=data.access==='passcode'?scryptSync(data.passcode,salt,64).toString('hex'):null;
 return db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);const draft=current(await tx.get(ref));const previous=await tx.get(publicRef);if(previous.exists&&previous.data().ownerId!==uid)throw new HttpsError('already-exists','This invitation link is already in use. Duplicate your draft to get a new link.');
  if(previous.exists&&previous.data().requestId===data.requestId){const saved=previous.data();if(saved.access!==data.access||saved.savedRevision!==data.revision||(saved.access==='passcode'&&!timingSafeEqual(scryptSync(data.passcode,saved.salt,64),Buffer.from(saved.passwordHash,'hex'))))throw new HttpsError('already-exists','Request already used.');return {id:data.eventId,revision:saved.revision};}
  sameRevision(draft,data.revision);if(!draft.content)throw new HttpsError('failed-precondition','Save your invitation details first.');
  const manifest=await photoManifest(tx,ref,draft.content);await reserve(tx,uid,'publish',10);const revision=randomUUID();
  tx.set(publicRef,{ownerId:uid,eventId:data.eventId,templateId:draft.templateId,content:draft.content,manifest,revision,savedRevision:data.revision,access:data.access,salt:data.access==='passcode'?salt:null,passwordHash,requestId:data.requestId,publishedAt:FieldValue.serverTimestamp()});
  tx.update(ref,{status:'published',publishedRevision:draft.revision,publishedAccess:data.access,updatedAt:FieldValue.serverTimestamp()});return {id:data.eventId,revision};
 });
});
export const unpublishInvitation=onCall(options,async request=>{
 const uid=user(request),data=input(actionInput,request.data),ref=owned(uid,data.eventId);
 await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);current(await tx.get(ref));await removePublication(tx,uid,data.eventId);tx.update(ref,{status:'draft',publishedRevision:FieldValue.delete(),publishedAccess:FieldValue.delete(),updatedAt:FieldValue.serverTimestamp()});});return {ok:true};
});
export const archiveInvitation=onCall(options,async request=>{
 const uid=user(request),data=input(actionInput,request.data),ref=owned(uid,data.eventId);
 await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError('not-found','Invitation not found.');await removePublication(tx,uid,data.eventId);tx.update(ref,{status:'draft',archived:true,updatedAt:FieldValue.serverTimestamp()});});return {ok:true};
});
export const restoreInvitation=onCall(options,async request=>{const uid=user(request),data=input(actionInput,request.data);const ref=owned(uid,data.eventId);await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);const snap=await tx.get(ref);if(!snap.exists)throw new HttpsError('not-found','Invitation not found.');if(!snap.data().archived){if(snap.data().status==='published')throw new HttpsError('failed-precondition','This invitation is not archived.');return;}await removePublication(tx,uid,data.eventId);tx.update(ref,{archived:false,status:'draft',publishedRevision:FieldValue.delete(),publishedAccess:FieldValue.delete()});});return {ok:true};});
export const duplicateInvitation=onCall(options,async request=>{
 const uid=user(request),data=input(actionInput,request.data),source=owned(uid,data.eventId),target=owned(uid,data.requestId);
 return db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);await assertUnusedEvent(tx,db,uid,data.requestId);const original=current(await tx.get(source));const existing=await tx.get(target);if(existing.exists){if(existing.data().copiedFrom!==data.eventId)throw new HttpsError('already-exists','Request already used.');return {id:target.id};}
 const photos=await tx.get(source.collection('photos').where('status','==','ready'));await reserve(tx,uid,'duplicate',10);
 tx.create(target,{ownerId:uid,templateId:original.templateId,title:`${original.title.slice(0,90)} (copy)`,status:'draft',schemaVersion:1,content:original.content,revision:0,photoCount:photos.size,copiedFrom:data.eventId,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
 for(const photo of photos.docs)tx.create(target.collection('photos').doc(photo.id),photo.data());return {id:target.id};
 });
});
async function guestRate(request,kind,max){const key=hash(`${request.rawRequest.ip||'unknown'}:${kind}`);await db.runTransaction(tx=>reserve(tx,key,'guest',max));}
export const getInvitation=onCall(options,async request=>{
 const data=input(guestInput,request.data);await guestRate(request,'open',20);
 const snapshot=await db.doc(`published/${data.id}`).get();if(!snapshot.exists)throw new HttpsError('not-found','This invitation is not available.');const event=snapshot.data();
 if(event.access==='passcode'){
  if(!data.passcode)return {locked:true};
  const actual=scryptSync(data.passcode,event.salt,64);if(!timingSafeEqual(actual,Buffer.from(event.passwordHash,'hex')))throw new HttpsError('permission-denied','The passcode is incorrect.');
 }
 const token=randomBytes(32).toString('hex');await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,event.ownerId);const latest=await tx.get(snapshot.ref);if(!latest.exists||latest.data().revision!==event.revision)throw new HttpsError('not-found','This invitation changed. Reopen it.');tx.set(db.doc(`guestSessions/${hash(token)}`),{ownerId:event.ownerId,eventId:data.id,revision:event.revision,expiresAt:new Date(Date.now()+30*60*1000)});});
 const ownerDraft=await owned(event.ownerId,data.id).get();
 return {locked:false,templateId:event.templateId,content:event.content,token,guestSettings:{rsvpOpen:ownerDraft.data()?.guestSettings?.rsvpOpen!==false,guestbookOpen:ownerDraft.data()?.guestSettings?.guestbookOpen!==false}};
});
export const getInvitationPhoto=onCall(options,async request=>{
 const data=input(mediaInput,request.data);await guestRate(request,'photo',180);
 const [session,snapshot]=await Promise.all([db.doc(`guestSessions/${hash(data.token)}`).get(),db.doc(`published/${data.id}`).get()]);
 if(!session.exists||!snapshot.exists)throw new HttpsError('permission-denied','Guest access expired. Reopen the invitation.');const access=session.data(),event=snapshot.data();
 if(access.eventId!==data.id||access.revision!==event.revision||access.expiresAt.toMillis()<Date.now()||!Object.hasOwn(event.manifest,data.photoId))throw new HttpsError('permission-denied','Guest access expired. Reopen the invitation.');
 await db.runTransaction(tx=>assertOwnerActive(tx,db,event.ownerId));
 const [bytes]=await getStorage().bucket().file(event.manifest[data.photoId]).download();return {base64:bytes.toString('base64')};
});

import { deliverContact } from './contact-delivery.mjs';
import { defineSecret } from 'firebase-functions/params';
const resendApiKey=defineSecret('RESEND_API_KEY');
import { rsvpInput, bookInput, bookReadInput, moderateInput, settingsInput, contactInput } from './responses-schema.mjs';
async function guestAccess(tx,data){
 const [session,published]=await Promise.all([tx.get(db.doc(`guestSessions/${hash(data.token)}`)),tx.get(db.doc(`published/${data.id}`))]);
 if(!session.exists||!published.exists)throw new HttpsError('permission-denied','Reopen the invitation to renew guest access.');
 const grant=session.data(),event=published.data();await assertOwnerActive(tx,db,event.ownerId);
 if(grant.eventId!==data.id||grant.revision!==event.revision||grant.expiresAt.toMillis()<=Date.now())throw new HttpsError('permission-denied','Reopen the invitation to renew guest access.');
 const ref=owned(event.ownerId,data.id),snapshot=await tx.get(ref),draft=current(snapshot);
 return {ref,event,draft};
}
export const submitRSVP=onCall(options,async request=>{
 const data=input(rsvpInput,request.data);await guestRate(request,'rsvp',12);
 return db.runTransaction(async tx=>{const {ref,event,draft}=await guestAccess(tx,data);if(draft.guestSettings?.rsvpOpen===false)throw new HttpsError('failed-precondition','RSVP is closed.');
 const ids=event.content.ceremonies.map(c=>c.id);if(data.ceremonies.some(id=>!ids.includes(id))||(data.attendance==='yes'&&ids.length>0&&data.ceremonies.length===0))throw new HttpsError('invalid-argument','Choose at least one listed ceremony.');
 const {token,id,requestId,...reply}=data;const record=ref.collection('rsvps').doc(requestId),existing=await tx.get(record),digest=hash(JSON.stringify(reply));
 if(existing.exists){if(existing.data().digest!==digest)throw new HttpsError('already-exists','This response request was already used.');return {id:requestId,saved:true};}
 const stats=draft.rsvpStats||{replies:0,accepting:0,declining:0,guests:0};if(stats.replies>=2000)throw new HttpsError('resource-exhausted','This invitation has reached its reply limit. Contact the host.');
 tx.create(record,{...reply,ceremonyNames:data.ceremonies.map(id=>event.content.ceremonies.find(c=>c.id===id).title),digest,createdAt:FieldValue.serverTimestamp()});
 tx.update(ref,{rsvpStats:{replies:stats.replies+1,accepting:stats.accepting+(data.attendance==='yes'?1:0),declining:stats.declining+(data.attendance==='no'?1:0),guests:stats.guests+data.partySize}});return {id:requestId,saved:true};
 });
});
export const submitGuestbook=onCall(options,async request=>{
 const data=input(bookInput,request.data);await guestRate(request,'guestbook',8);
 return db.runTransaction(async tx=>{const {ref,draft}=await guestAccess(tx,data);if(draft.guestSettings?.guestbookOpen===false)throw new HttpsError('failed-precondition','Guestbook submissions are closed.');
 const record=ref.collection('guestbook').doc(data.requestId),existing=await tx.get(record),digest=hash(JSON.stringify([data.displayName,data.message]));
 if(existing.exists){if(existing.data().digest!==digest)throw new HttpsError('already-exists','This message request was already used.');return {id:record.id,status:existing.data().status};}
 if((draft.guestbookCount||0)>=500)throw new HttpsError('resource-exhausted','The guestbook is full.');
 tx.create(record,{displayName:data.displayName,message:data.message,consent:true,status:'pending',digest,createdAt:FieldValue.serverTimestamp()});tx.update(ref,{guestbookCount:(draft.guestbookCount||0)+1});return {id:record.id,status:'pending'};
 });
});
export const getGuestbook=onCall(options,async request=>{
 const data=input(bookReadInput,request.data);await guestRate(request,'book-read',60);
 return db.runTransaction(async tx=>{const {ref}=await guestAccess(tx,data);const rows=await tx.get(ref.collection('guestbook').where('status','==','approved').limit(50));return {entries:rows.docs.map(d=>({id:d.id,displayName:d.data().displayName,message:d.data().message}))};});
});
export const moderateGuestbook=onCall(options,async request=>{
 const uid=user(request),data=input(moderateInput,request.data),ref=owned(uid,data.eventId);
 await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);current(await tx.get(ref));const entry=ref.collection('guestbook').doc(data.entryId);if(!(await tx.get(entry)).exists)throw new HttpsError('not-found','Message not found.');tx.update(entry,{status:data.status,moderatedAt:FieldValue.serverTimestamp()});});return {ok:true};
});
export const setGuestSettings=onCall(options,async request=>{
 const uid=user(request),data=input(settingsInput,request.data),ref=owned(uid,data.eventId);await db.runTransaction(async tx=>{await assertOwnerActive(tx,db,uid);current(await tx.get(ref));tx.update(ref,{guestSettings:{rsvpOpen:data.rsvpOpen,guestbookOpen:data.guestbookOpen}});});return {ok:true};
});
// Only production configuration can enable external email. Emulator contacts stay local.
export const sendContact=onCall({...options,secrets:process.env.FUNCTIONS_EMULATOR==='true'?[]:[resendApiKey]},async request=>{
 const data=input(contactInput,request.data);await guestRate(request,'contact',5);
 const emulator=process.env.FUNCTIONS_EMULATOR==='true';
 if(!emulator&&(!process.env.RESEND_API_KEY||!process.env.CONTACT_TO||!process.env.CONTACT_FROM))throw new HttpsError('failed-precondition','Contact delivery is not configured. Your message was not sent.');
 const ref=db.doc(`contactRequests/${data.requestId}`),{requestId,...message}=data,digest=hash(JSON.stringify(message));
 const state=await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(existing.exists){const saved=existing.data();if(saved.digest!==digest)throw new HttpsError('already-exists','This request was already used.');if(saved.status==='accepted'||saved.status==='local-only')return saved.status;if(Date.now()-saved.createdAt.toMillis()>23*3600000)throw new HttpsError('failed-precondition','This request is too old to retry safely. Contact support before resending.');return 'pending';}tx.create(ref,{...message,digest,status:'pending',createdAt:FieldValue.serverTimestamp()});return 'pending';});
 if(state!=='pending')return {status:state};
 if(emulator){await ref.update({status:'local-only'});return {status:'local-only'};}
 try{const providerId=await deliverContact(data,{apiKey:process.env.RESEND_API_KEY,to:process.env.CONTACT_TO,from:process.env.CONTACT_FROM});await ref.update({status:'accepted',providerId,acceptedAt:FieldValue.serverTimestamp()});return {status:'accepted'};}catch{throw new HttpsError('unavailable','Email acceptance could not be confirmed. Retry the same message.');}
});

// Permanent removal is queued; active data is cleaned by a retryable scheduled worker.
export const requestDeletion=onCall(options,async request=>{
 user(request);const data=input(deletionInput,request.data);return enqueueDeletion(db,request,data);
});
export const getDeletionStatus=onCall(options,async request=>{
 const uid=user(request),state=(await db.doc(`owners/${uid}`).get()).data();
 const id=state?.deletionJob||state?.lastDeletionJob;if(!id)return {job:null};
 const job=(await db.doc(`deletionJobs/${id}`).get()).data();
 if(!job||job.ownerId!==uid)return {job:null};
 return {job:{id,scope:job.scope,eventId:job.eventId,status:job.status}};
});
export const cleanupDeletions=onSchedule({schedule:'every 5 minutes',region:'us-central1',timeoutSeconds:300,memory:'512MiB',maxInstances:1},async()=>{
 const jobs=await db.collection('deletionJobs').where('finished','==',false).limit(10).get();
 for(const job of jobs.docs){try{await processDeletion(db,getStorage().bucket(),getAuth(),job.id);}catch{console.error('Deletion cleanup incomplete; it will retry.');}}
});
