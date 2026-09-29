import {useEffect,useState,type FormEvent} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,getDoc,getDocs,collection} from 'firebase/firestore';
import {services,configurationError} from './firebase';
import {Invitation} from './Invitation';
import {GuestResponses,type GuestAccess} from './GuestResponses';
import {toInvitation,type Content,type SavedDraft} from './editor-model';
import {decryptPayload,type EncryptedPayload} from './crypto-payload';
import type {InvitationEvent} from './events';
import './account.css';
export default function SavedInvitation({id,owner=false}:{id:string;owner?:boolean}){
 const [access,setAccess]=useState<GuestAccess|null>(null);
 const [event,setEvent]=useState<InvitationEvent|null>(null),[locked,setLocked]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(true),[passcode,setPasscode]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!services){setBusy(false);return;}
  let active=true,epoch=0;
  setEvent(null);setError('');setBusy(true);
  async function display(template:InvitationEvent['id'],content:Content,images:Record<string,string>={},expected=epoch){
   if(active&&expected===epoch){
     const inv = toInvitation(template,content,images);
     setEvent(inv);
     if(inv.couple) document.title = `${inv.couple} · ${inv.name}`;
   }
  }
  async function guest(){
   try{
    const snap=await getDoc(doc(services!.db,'events',id));
    if(!active)return;
    if(!snap.exists()||snap.data().status!=='published'){
     setError('This invitation is private, unpublished, or not found.');
     return;
    }
    const data=snap.data();
    if(data.access==='passcode'){
     if(!passcode){
      setLocked(true);
      return;
     }
     if(!data.encryptedPayload){
      setError('This invitation format is not supported.');
      return;
     }
     try{
      const decrypted=await decryptPayload<{content:Content;images?:Record<string,string>}>(passcode,data.encryptedPayload as EncryptedPayload);
      setLocked(false);
      setAccess({id,token:id,rsvpOpen:data.guestSettings?.rsvpOpen!==false,guestbookOpen:data.guestSettings?.guestbookOpen!==false});
      await display(data.templateId,decrypted.content,decrypted.images||{});
     }catch(err){
      setLocked(true);
      setError('Passcode incorrect. Please check and try again.');
      return;
     }
    }else{
     setLocked(false);
     setAccess({id,token:id,rsvpOpen:data.guestSettings?.rsvpOpen!==false,guestbookOpen:data.guestSettings?.guestbookOpen!==false});
     if(data.content&&data.templateId){
      const images:Record<string,string>={};
      const photoIds=[...new Set([data.content.imagePhotoId,data.content.venuePhotoId,...(data.content.galleryPhotoIds||[])].filter((p):p is string=>!!p))];
      for(const pid of photoIds){
       try{
        let psnap=await getDoc(doc(services!.db,'events',id,'photos',pid));
        if(!psnap.exists()&&data.ownerId){
         psnap=await getDoc(doc(services!.db,'owners',data.ownerId,'events',id,'photos',pid));
        }
        if(psnap.exists()&&psnap.data().path){
         images[pid]=psnap.data().path;
        }
       }catch{}
      }
      await display(data.templateId,data.content,images);
     }
    }
   }catch(e){
    if(active)setError('This invitation could not be opened. It may be unpublished, or the service is unavailable.');
   }finally{
    if(active)setBusy(false);
   }
  }
  let unsubscribe=()=>{};
  if(owner){
   unsubscribe=onAuthStateChanged(services.auth,async user=>{
    const generation=++epoch;
    if(!user?.emailVerified){setEvent(null);setError('Sign in as the verified invitation owner to view this draft.');setBusy(false);return;}
    try{
     const snap=await getDoc(doc(services!.db,'owners',user.uid,'events',id));
     if(!active||generation!==epoch)return;
     if(!snap.exists())throw new Error();
     const draft=snap.data() as SavedDraft;
     if(!draft.content||draft.archived)throw new Error();
     const photos=await getDocs(collection(services!.db,'owners',user.uid,'events',id,'photos'));
     const images=Object.fromEntries(photos.docs.map(p=>[p.id,p.data().path]));
     await display(draft.templateId,draft.content,images,generation);
    }catch{
     if(active)setError('This draft is unavailable, has not been saved yet, or a selected photo could not load.');
    }finally{
     if(active)setBusy(false);
    }
   });
  }else void guest();
  return()=>{active=false;epoch++;unsubscribe();};
 },[id,owner,attempt]);
 if(event)return <>{owner&&<div className="account-banner"><a href={`/edit/${id}`}>← Return to editor</a> · Saved private preview</div>}<Invitation event={event} sample={false} ownerPreview={owner} responseSection={!owner&&access?<GuestResponses event={event} access={access}/>:undefined}/></>;
 return <div className="account-page"><main><a href={owner?`/edit/${id}`:'/'}>← {owner?'Return to editor':'Riwaayat'}</a><h1>{locked?'An invitation just for you.':'Your invitation.'}</h1>{configurationError&&<p>{configurationError}</p>}{busy&&<p role="status">Opening invitation…</p>}{error&&<p role="alert" className="account-error">{error}</p>}{locked?<form className="account-panel" onSubmit={(e:FormEvent)=>{e.preventDefault();setAttempt(n=>n+1);}}><label>Guest passcode<input type="password" required maxLength={128} autoComplete="off" value={passcode} onChange={e=>setPasscode(e.target.value)}/></label><button className="button primary" disabled={busy}>Open invitation</button></form>:error&&<button className="button primary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Try again</button>}</main></div>;
}
