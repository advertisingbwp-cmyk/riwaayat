import {randomUUID} from 'node:crypto';
import {HttpsError} from 'firebase-functions/v2/https';
import {FieldValue} from 'firebase-admin/firestore';
import {z} from 'zod';

export const deletionInput=z.discriminatedUnion('scope',[
 z.object({scope:z.literal('invitation'),eventId:z.string().uuid(),requestId:z.string().uuid(),confirmation:z.literal('DELETE')} ).strict(),
 z.object({scope:z.literal('account'),requestId:z.string().uuid(),confirmation:z.literal('DELETE')} ).strict()
]);
export async function assertOwnerActive(tx,db,uid){
 const state=(await tx.get(db.doc(`owners/${uid}`))).data();
 if(state?.deletionJob||state?.closed)throw new HttpsError('failed-precondition','A deletion is in progress or this account is closed. Open data controls for its status.');
}
export async function assertUnusedEvent(tx,db,uid,id){
 if((await tx.get(db.doc(`owners/${uid}/deletedEvents/${id}`))).exists)throw new HttpsError('failed-precondition','This invitation was permanently deleted. Start a new draft.');
}
export async function enqueueDeletion(db,request,data){
 const uid=request.auth.uid,owner=db.doc(`owners/${uid}`),job=db.doc(`deletionJobs/${data.requestId}`);
 return db.runTransaction(async tx=>{
  const [state,existing]=await Promise.all([tx.get(owner),tx.get(job)]);
  if(existing.exists){const old=existing.data();if(old.ownerId!==uid||old.scope!==data.scope||old.eventId!==(data.eventId||null))throw new HttpsError('already-exists','Request already used.');return {id:job.id,status:old.status};}
  const authTime=Number(request.auth.token.auth_time);
  if(!Number.isFinite(authTime)||Date.now()/1000-authTime>300)throw new HttpsError('failed-precondition','Sign out and sign in again before requesting permanent deletion.');
  if(state.data()?.deletionJob||state.data()?.closed)throw new HttpsError('failed-precondition','Another deletion is already in progress.');
  if(data.scope==='invitation'&&!(await tx.get(db.doc(`owners/${uid}/events/${data.eventId}`))).exists)throw new HttpsError('not-found','Invitation not found.');
  // All owner writes read this lock. The delay lets existing 60-second callables finish.
  tx.set(owner,{deletionJob:job.id},{merge:true});
  tx.create(job,{ownerId:uid,scope:data.scope,eventId:data.eventId||null,status:'queued',finished:false,readyAt:new Date(Date.now()+120000),createdAt:FieldValue.serverTimestamp()});
  return {id:job.id,status:'queued'};
 });
}
async function deleteQuery(db,query){
 for(;;){const rows=await query.limit(250).get();if(rows.empty)return;const batch=db.batch();for(const row of rows.docs)batch.delete(row.ref);await batch.commit();}
}
// Used by the scheduled worker and isolated emulator tests; never exported as a callable.
export async function processDeletion(db,bucket,auth,jobId){
 const ref=db.doc(`deletionJobs/${jobId}`),lease=randomUUID();
 const job=await db.runTransaction(async tx=>{
  const snap=await tx.get(ref);if(!snap.exists)return null;const data=snap.data();
  if(data.finished||data.readyAt.toMillis()>Date.now()||(data.leaseUntil?.toMillis()||0)>Date.now())return null;
  const owner=await tx.get(db.doc(`owners/${data.ownerId}`));
  if(owner.data()?.deletionJob!==jobId)throw new Error('Deletion lock missing');
  tx.update(ref,{status:'running',lease,leaseUntil:new Date(Date.now()+600000)});return data;
 });
 if(!job)return false;
 const uid=job.ownerId,owner=db.doc(`owners/${uid}`);
 try{
  const events=job.scope==='account'?(await owner.collection('events').get()).docs:[await owner.collection('events').doc(job.eventId).get()];
  for(const event of events){
   const publication=db.doc(`published/${event.id}`),published=await publication.get();
   const sessions=await db.collection('guestSessions').where('eventId','==',event.id).get();
   for(const session of sessions.docs){const data=session.data();if(data.ownerId===uid||(!data.ownerId&&published.data()?.ownerId===uid))await session.ref.delete();}
   // IDs originate with clients; a coincident ID must never remove another owner's publication.
   await db.runTransaction(async tx=>{const snap=await tx.get(publication);if(snap.data()?.ownerId===uid)tx.delete(publication);});
   // Keep a minimal tombstone so a delayed create/duplicate retry cannot recreate this ID.
   await owner.collection('deletedEvents').doc(event.id).set({deleted:true});
   await db.recursiveDelete(event.ref);
  }
  if(job.scope==='account')await deleteQuery(db,db.collection('published').where('ownerId','==',uid));
  // Duplicates share photo files. Preserve every path still referenced by a surviving invitation.
  const keep=new Set();
  if(job.scope==='invitation')for(const event of (await owner.collection('events').get()).docs){for(const photo of (await event.ref.collection('photos').get()).docs)keep.add(photo.data().path);}
  const [files]=await bucket.getFiles({prefix:`owners/${uid}/`});
  for(const file of files)if(!keep.has(file.name))await file.delete({ignoreNotFound:true});
  if(job.scope==='account'){
   await deleteQuery(db,db.collection('guestSessions').where('ownerId','==',uid));
   await deleteQuery(db,owner.collection('deletedEvents'));
   // Authentication is removed only after active invitation records and media are removed.
   try{await auth.deleteUser(uid);}catch(error){if(error.code!=='auth/user-not-found')throw error;}
  }
  await db.runTransaction(async tx=>{
   const state=await tx.get(ref);if(state.data()?.lease!==lease)throw new Error('Deletion lease changed');
   tx.update(ref,{status:'complete',finished:true,completedAt:FieldValue.serverTimestamp(),leaseUntil:FieldValue.delete(),lease:FieldValue.delete()});
   tx.set(owner,job.scope==='account'?{closed:true,deletionJob:jobId}:{deletionJob:FieldValue.delete(),lastDeletionJob:jobId},{merge:true});
  });
  return true;
 }catch(error){
  // Preserve the lock on partial failure; a later worker resumes idempotent cleanup.
  await db.runTransaction(async tx=>{const state=await tx.get(ref);if(state.data()?.lease===lease)tx.update(ref,{status:'retry',leaseUntil:FieldValue.delete(),lease:FieldValue.delete()});});
  throw error;
 }
}
