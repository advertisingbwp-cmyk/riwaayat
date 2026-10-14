import {collection,doc,getDoc,getDocs,runTransaction,serverTimestamp,writeBatch,type Firestore} from 'firebase/firestore';
import {encryptPayload} from './crypto-payload';
import type {Content} from './editor-model';

export async function publishInvitation(db:Firestore,uid:string,id:string,revision:number,access:string,passcode:string){
 const ownerRef=doc(db,'owners',uid,'events',id), publicRef=doc(db,'events',id);
 const owner=await getDoc(ownerRef), saved=owner.data();
 if(!saved?.content||saved.archived||saved.deleting)throw new Error('Save an active invitation before publishing.');
 if((saved.revision||0)!==revision)throw new Error('Your draft changed. Reload before publishing.');
 if(access==='passcode'&&passcode.length<8)throw new Error('Use a passcode with at least 8 characters.');
 const content=saved.content as Content;
 const ids=[...new Set([content.imagePhotoId,content.venuePhotoId,...content.galleryPhotoIds].filter((p):p is string=>!!p))];
 if(ids.length>14)throw new Error('Select at most 14 photographs.');
 const photos=await Promise.all(ids.map(async photoId=>{const snap=await getDoc(doc(db,'owners',uid,'events',id,'photos',photoId));if(!snap.exists()||!snap.data().path)throw new Error('A selected photograph is missing. Upload it again.');return {id:photoId,path:snap.data().path as string};}));
 const oldPhotos=await getDocs(collection(db,'events',id,'photos'));
 const guestToken=crypto.randomUUID();
 const encrypted=access==='passcode';
 const encryptedPayload=encrypted?await encryptPayload(passcode,{content,guestToken,photoIds:ids}):null;
 const publicPhotos=await Promise.all(photos.map(async p=>({id:p.id,...(encrypted?{encryptedPayload:await encryptPayload(passcode,p.path)}:{path:p.path}),status:'ready'})));
 await runTransaction(db,async tx=>{
  const fresh=await tx.get(ownerRef), current=await tx.get(publicRef);
  if(fresh.data()?.deleting||fresh.data()?.archived||(fresh.data()?.revision||0)!==revision)throw new Error('Your draft changed. Reload before publishing.');
  tx.update(ownerRef,{status:'published',publishedRevision:revision,publishedAccess:access,guestToken,updatedAt:serverTimestamp()});
  tx.set(publicRef,{id,ownerId:uid,templateId:saved.templateId,title:encrypted?'Private Celebration':saved.title,status:'published',access,encrypted,...(encrypted?{encryptedPayload}:{content}),guestSettings:current.data()?.guestSettings||{rsvpOpen:true,guestbookOpen:true},updatedAt:serverTimestamp()});
  for(const photo of oldPhotos.docs)if(!ids.includes(photo.id))tx.delete(photo.ref);
  for(const photo of publicPhotos)tx.set(doc(db,'events',id,'photos',photo.id),photo);
 });
}

export async function unpublishInvitation(db:Firestore,uid:string,id:string,archive=false){
 const ownerRef=doc(db,'owners',uid,'events',id),publicRef=doc(db,'events',id);
 await runTransaction(db,async tx=>{const event=await tx.get(publicRef);tx.update(ownerRef,{status:'draft',publishedRevision:null,...(archive?{archived:true}:{}),updatedAt:serverTimestamp()});if(event.exists())tx.update(publicRef,{status:archive?'archived':'draft',updatedAt:serverTimestamp()});});
}

export async function duplicateInvitation(db:Firestore,uid:string,id:string){
 const original=await getDoc(doc(db,'owners',uid,'events',id));if(!original.exists())throw new Error('Draft not found.');
 const saved=original.data(),newId=crypto.randomUUID();
 const photos=await getDocs(collection(db,'owners',uid,'events',id,'photos'));
 if(photos.size>30)throw new Error('Too many photos to duplicate.');
 const batch=writeBatch(db);
 batch.set(doc(db,'owners',uid,'events',newId),{id:newId,ownerId:uid,templateId:saved.templateId,title:`${saved.title} (Copy)`,content:saved.content||null,status:'draft',revision:0,schemaVersion:1,photoCount:photos.size,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 for(const photo of photos.docs)batch.set(doc(db,'owners',uid,'events',newId,'photos',photo.id),photo.data());
 await batch.commit();return newId;
}
