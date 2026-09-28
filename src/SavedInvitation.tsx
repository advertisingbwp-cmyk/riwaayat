import {useEffect,useState,type FormEvent} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,getDoc,getDocs,collection} from 'firebase/firestore';
import {getBlob,ref} from 'firebase/storage';
import {httpsCallable} from 'firebase/functions';
import {services,configurationError} from './firebase';
import {Invitation} from './Invitation';
import {GuestResponses,type GuestAccess} from './GuestResponses';
import {toInvitation,type Content,type SavedDraft} from './editor-model';
import type {InvitationEvent} from './events';
import './account.css';
type Payload={guestSettings?:{rsvpOpen:boolean;guestbookOpen:boolean};locked:boolean;content?:Content;templateId?:InvitationEvent['id'];token?:string};
export default function SavedInvitation({id,owner=false}:{id:string;owner?:boolean}){
 const [access,setAccess]=useState<GuestAccess|null>(null);
 const [event,setEvent]=useState<InvitationEvent|null>(null),[locked,setLocked]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(true),[passcode,setPasscode]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!services){setBusy(false);return;}let active=true,epoch=0;const urls:string[]=[];setEvent(null);setError('');setBusy(true);
 async function display(template:InvitationEvent['id'],content:Content,load:(id:string)=>Promise<Blob>,expected=epoch){const images:Record<string,string>={};const ids=[...new Set([content.imagePhotoId,...content.galleryPhotoIds].filter((p):p is string=>!!p))];for(const photo of ids){const blob=await load(photo);if(!active||expected!==epoch)return;const url=URL.createObjectURL(blob);urls.push(url);images[photo]=url;}if(active&&expected===epoch)setEvent(toInvitation(template,content,images));}
 async function guest(){try{const result=await httpsCallable(services!.functions,'getInvitation')({id,...(passcode?{passcode}:{})});if(!active)return;const data=result.data as Payload;setLocked(data.locked);if(!data.locked&&data.token)setAccess({id,token:data.token,rsvpOpen:data.guestSettings?.rsvpOpen!==false,guestbookOpen:data.guestSettings?.guestbookOpen!==false});if(!data.locked&&data.content&&data.templateId)await display(data.templateId,data.content,async photoId=>{const result=await httpsCallable(services!.functions,'getInvitationPhoto')({id,token:data.token,photoId});const bytes=Uint8Array.from(atob((result.data as {base64:string}).base64),c=>c.charCodeAt(0));return new Blob([bytes],{type:'image/webp'});});}catch(e){if(active)setError((e as {code?:string}).code==='functions/permission-denied'?'Passcode incorrect or guest access expired. Try again.':'This invitation could not be opened. It may be unpublished, or the service is unavailable.');}finally{if(active)setBusy(false);}}
 let unsubscribe=()=>{};
 if(owner){unsubscribe=onAuthStateChanged(services.auth,async user=>{const generation=++epoch;if(!user?.emailVerified){setEvent(null);setError('Sign in as the verified invitation owner to view this draft.');setBusy(false);return;}try{const snap=await getDoc(doc(services!.db,'owners',user.uid,'events',id));if(!active||generation!==epoch)return;if(!snap.exists())throw new Error();const draft=snap.data() as SavedDraft;if(!draft.content||draft.archived)throw new Error();const photos=await getDocs(collection(services!.db,'owners',user.uid,'events',id,'photos'));const paths=Object.fromEntries(photos.docs.map(p=>[p.id,p.data().path]));await display(draft.templateId,draft.content,p=>getBlob(ref(services!.storage,paths[p]),8*1024*1024),generation);}catch{if(active)setError('This draft is unavailable, has not been saved yet, or a selected photo could not load.');}finally{if(active)setBusy(false);}});}else void guest();
 return()=>{active=false;epoch++;unsubscribe();urls.forEach(url=>URL.revokeObjectURL(url));};
 // Passcode is submitted deliberately with attempt, never sent as the user types.
 },[id,owner,attempt]);
 if(event)return <>{owner&&<div className="account-banner"><a href={`/edit/${id}`}>← Return to editor</a> · Saved private preview</div>}<Invitation event={event} sample={false} ownerPreview={owner} responseSection={!owner&&access?<GuestResponses event={event} access={access}/>:undefined}/></>;
 return <div className="account-page"><main><a href={owner?`/edit/${id}`:'/'}>← {owner?'Return to editor':'Riwaayat'}</a><h1>{locked?'An invitation just for you.':'Your invitation.'}</h1>{configurationError&&<p>{configurationError}</p>}{busy&&<p role="status">Opening invitation…</p>}{error&&<p role="alert" className="account-error">{error}</p>}{locked?<form className="account-panel" onSubmit={(e:FormEvent)=>{e.preventDefault();setAttempt(n=>n+1);}}><label>Guest passcode<input type="password" required maxLength={128} autoComplete="off" value={passcode} onChange={e=>setPasscode(e.target.value)}/></label><button className="button primary" disabled={busy}>Open invitation</button></form>:error&&<button className="button primary" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Try again</button>}</main></div>;
}
