import {collection,doc,getDoc,getDocs,limit,query,updateDoc,writeBatch,type Firestore} from 'firebase/firestore';
import {deleteUser,type User} from 'firebase/auth';
async function clearCollection(db:Firestore,path:string){
 while(true){const rows=await getDocs(query(collection(db,path),limit(100)));if(rows.empty)return;const batch=writeBatch(db);for(const row of rows.docs)batch.delete(row.ref);await batch.commit();}
}
export async function deleteInvitation(db:Firestore,uid:string,id:string){
 const root=`owners/${uid}/events/${id}`,publicRef=doc(db,'events',id),ownerRef=doc(db,root);
 const owner=await getDoc(ownerRef);if(!owner.exists())throw new Error('Invitation not found.');
 const published=await getDoc(publicRef);
 const lock=writeBatch(db);if(!owner.data().deleting)lock.update(ownerRef,{deleting:true});if(published.exists())lock.update(publicRef,{status:'draft'});await lock.commit();
 for(const sub of ['photos','rsvps','guestbook']){if(published.exists())await clearCollection(db,`events/${id}/${sub}`);await clearCollection(db,`${root}/${sub}`);}
 const finish=writeBatch(db);if(published.exists())finish.delete(publicRef);finish.delete(ownerRef);await finish.commit();
}
export async function deleteSelectedData(db:Firestore,user:User,scope:'invitation'|'account',id:string){
 const token=await user.getIdTokenResult(true);
 if(Date.now()/1000-Number(token.claims.auth_time)>300)throw new Error('Sign out and sign in again, then retry within five minutes.');
 if(scope==='invitation'){await deleteInvitation(db,user.uid,id);return;}
 const rows=await getDocs(collection(db,'owners',user.uid,'events'));
 for(const row of rows.docs)await deleteInvitation(db,user.uid,row.id);
 await deleteUser(user);
}
