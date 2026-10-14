import {useEffect,useRef,useState,type FormEvent} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {collection,doc,getDoc,getDocs,updateDoc,setDoc,serverTimestamp} from 'firebase/firestore';
import {compressImage} from './image-compress';
import {publishInvitation,unpublishInvitation,duplicateInvitation} from './invitation-store';
import {configurationError,emulatorMode,services} from './firebase';
import {blankContent,editorError,type Content,type SavedDraft} from './editor-model';
import { invitationEvents, type InvitationEvent } from './events';
import './account.css';
import './editor.css';
function localTime(iso:string,zone:string){try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}catch{return '';}}
function utcTime(local:string,zone:string){const target=Date.parse(local+'Z');let value=target;for(let i=0;i<4;i++)value+=target-Date.parse(localTime(new Date(value).toISOString(),zone)+'Z');const iso=new Date(value).toISOString();if(localTime(iso,zone)!==local)throw new Error('This local time does not exist in the selected timezone.');return iso;}
function getPos(pos?:string){const p=(pos||'50% 50%').split(' ');return {x:Number.isFinite(parseInt(p[0]))?parseInt(p[0]):50,y:Number.isFinite(parseInt(p[1]))?parseInt(p[1]):50};}

export default function Editor({id}:{id:string}){
 const isTryMode = id.startsWith('try-');
 const tryTemplateId = (isTryMode ? id.replace(/^try-/, '') : 'royal') as InvitationEvent['id'];
 const [draft,setDraft]=useState<SavedDraft|null>(null),[content,setContent]=useState<Content|null>(null),[title,setTitle]=useState(''),[photos,setPhotos]=useState<{id:string;path?:string}[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[access,setAccess]=useState('public'),[passcode,setPasscode]=useState(''),[archive,setArchive]=useState(false);
 const blank=useRef<Content|null>(null);const dirty=!!draft&&JSON.stringify([title,content])!==JSON.stringify([draft.title,draft.content||blank.current]);
 useEffect(()=>{
  if(isTryMode){
    const sampleEvent = invitationEvents.find(e => e.id === tryTemplateId) || invitationEvents[0];
    let initialContent: Content | null = null;
    try {
      const stored = sessionStorage.getItem(`riwaayat_try_${tryTemplateId}`);
      if (stored) initialContent = JSON.parse(stored);
    } catch {}
    if (!initialContent) {
      initialContent = {
        couple: sampleEvent.couple,
        intro: sampleEvent.intro,
        note: sampleEvent.note,
        quote: sampleEvent.quote,
        startsAt: sampleEvent.startsAt,
        timeZone: sampleEvent.timeZone,
        hashtag: sampleEvent.hashtag,
        dressCode: sampleEvent.dressCode,
        venue: { ...sampleEvent.venue },
        story: [...sampleEvent.story],
        ceremonies: sampleEvent.ceremonies.map(c => ({ ...c })),
        imagePhotoId: null,
        venuePhotoId: null,
        imagePosition: '50% 50%',
        venueImagePosition: '50% 50%',
        galleryPhotoIds: [],
        instrument: sampleEvent.instrument,
        particle: sampleEvent.particle,
        effects: { opening: true, particles: true, music: true, scratch: true }
      };
    }
    blank.current = initialContent;
    setDraft({
      id,
      title: `${sampleEvent.name} Celebration`,
      templateId: sampleEvent.id,
      content: initialContent,
      status: 'draft',
      revision: 1
    });
    setTitle(`${sampleEvent.name} Celebration`);
    setContent(initialContent);
    setLoaded(true);
    return;
  }
  if(!services)return;let active=true;const unsub=onAuthStateChanged(services.auth,async user=>{setDraft(null);setContent(null);if(!user?.emailVerified){setError('Sign in with a verified account to edit this invitation.');setLoaded(true);return;}try{const [snap,images]=await Promise.all([getDoc(doc(services!.db,'owners',user.uid,'events',id)),getDocs(collection(services!.db,'owners',user.uid,'events',id,'photos'))]);if(!active)return;if(!snap.exists()||snap.data().archived||snap.data().deleting)throw new Error();const value={id:snap.id,...snap.data()} as SavedDraft;blank.current=blankContent(value.templateId);setDraft(value);setTitle(value.title);setContent(value.content||blank.current);setAccess(value.publishedAccess||'public');setPhotos(images.docs.filter(p=>p.data().status==='ready').map(p=>({id:p.id,path:p.data().path})));}catch{if(active)setError('Invitation unavailable. Sign in as its owner or return to your workspace.');}finally{if(active)setLoaded(true);}});return()=>{active=false;unsub();};
 },[id, isTryMode, tryTemplateId]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(editorError(e));}finally{setBusy(false);}}
 function patch<K extends keyof Content>(key:K,value:Content[K]){setContent(old=>old?{...old,[key]:value}:old);}
 async function save(e:FormEvent){
  e.preventDefault();
  if(!draft||!content)return;
  if(isTryMode){
    sessionStorage.setItem(`riwaayat_try_${tryTemplateId}`, JSON.stringify(content));
    setDraft({...draft,title,content});
    sessionStorage.setItem('riwaayat_preview_try', JSON.stringify({
      couple: content.couple, note: content.note, intro: content.intro, quote: content.quote,
      startsAt: content.startsAt, timeZone: content.timeZone, hashtag: content.hashtag,
      dressCode: content.dressCode, venue: content.venue, story: content.story,
      ceremonies: content.ceremonies, instrument: content.instrument, particle: content.particle,
      effects: content.effects
    }));
    if(services?.auth.currentUser?.emailVerified){
      await run(async()=>{
        const uid = services!.auth.currentUser!.uid;
        const newId = crypto.randomUUID();
        await setDoc(doc(services!.db, 'owners', uid, 'events', newId), {
          id: newId, ownerId: uid, templateId: tryTemplateId, title, content, status: 'draft', schemaVersion: 1, photoCount: 0,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        setNotice('Saved as a permanent draft in your workspace!');
        setTimeout(() => location.assign(`/edit/${newId}`), 1000);
      });
      return;
    }
    sessionStorage.setItem('riwaayat_try_draft', JSON.stringify({ templateId: tryTemplateId, title, content }));
    setNotice('Changes saved in browser preview! Create a free account or sign in to save permanently.');
    return;
  }
  if(!services)return;
  const revision=(draft.revision||0)+1;
  await run(async()=>{const uid=services!.auth.currentUser!.uid;const ref=doc(services!.db,'owners',uid,'events',id);await updateDoc(ref,{title,content,revision,updatedAt:serverTimestamp()});setDraft({...draft,title,content,revision});setNotice('Saved to your private draft.');});
 }
 async function uploadPhotoDirect(file:File){
  if(!file?.size)return;
  if(photos.length>=30){setError('Use at most 30 photos per draft.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPEG, PNG or WebP image.');return;}
  await run(async()=>{
    const photoId=crypto.randomUUID();
    const dataUrl=await compressImage(file);
    if(isTryMode){
      setPhotos(prev=>[...prev,{id:photoId,path:dataUrl}]);
      if(!content?.imagePhotoId){patch('imagePhotoId',photoId);}
      else if(!content?.venuePhotoId){patch('venuePhotoId',photoId);}
      setNotice('Photograph loaded in preview! You can now adjust its position and assign it.');
      return;
    }
    const uid=services!.auth.currentUser!.uid;
    await setDoc(doc(services!.db,'owners',uid,'events',id,'photos',photoId),{id:photoId,path:dataUrl,status:'ready',createdAt:serverTimestamp()});
    setPhotos(prev=>[...prev,{id:photoId,path:dataUrl}]);
    if(!content?.imagePhotoId){patch('imagePhotoId',photoId);}
    else if(!content?.venuePhotoId){patch('venuePhotoId',photoId);}
    setNotice('Photograph uploaded! You can now adjust its position and assign it.');
  });
 }
 async function call(name:string,data:Record<string,any>={}){
  if(!services||!draft)throw new Error('Account services unavailable.');
  const uid=services.auth.currentUser!.uid;
  if(name==='publishInvitation')await publishInvitation(services.db,uid,id,draft.revision||0,String(data.access),String(data.passcode||''));
  else if(name==='unpublishInvitation')await unpublishInvitation(services.db,uid,id);
  else if(name==='archiveInvitation')await unpublishInvitation(services.db,uid,id,true);
  else if(name==='duplicateInvitation')return {data:{id:await duplicateInvitation(services.db,uid,id)}};
  return {data:{id:''}};
 }

 const changeTime=(value:string,apply:(iso:string)=>void)=>{try{apply(utcTime(value,content!.timeZone));setError('');}catch{setError('Choose a valid date and time in your event timezone.');}};
 const saveTrialPreview=()=>{if(content){sessionStorage.setItem(`riwaayat_try_${tryTemplateId}`,JSON.stringify(content));sessionStorage.setItem('riwaayat_preview_try',JSON.stringify(content));}};
 const link=`${location.origin}/invite/${id}`;
 const coverPos=getPos(content?.imagePosition);
 const venuePos=getPos(content?.venueImagePosition);
 const coverImgSrc=content?.imagePhotoId?photos.find(p=>p.id===content.imagePhotoId)?.path||'':'';
 const defaultVenueImg=invitationEvents.find(e=>e.id===draft?.templateId)?.venueImage || invitationEvents.find(e=>e.id===draft?.templateId)?.gallery[2]?.src || '/images/invitation-placeholder.svg';
 const venueImgSrc=content?.venuePhotoId?photos.find(p=>p.id===content.venuePhotoId)?.path||defaultVenueImg:defaultVenueImg;

  return <div className="account-page editor-page"><header><a className="brand" href="/account">❋ riwaayat</a><a className="host-action" href={isTryMode?"/#designs":`/account?event=${id}`}>← {isTryMode?"Back to designs":"Back to dashboard"}</a></header><main><div className="eyebrow">MAKE IT YOURS</div><h1>Your invitation studio.</h1>{isTryMode&&<div style={{background:'rgba(212, 175, 55, 0.1)',border:'1px solid #d4af37',borderRadius:'8px',padding:'12px 18px',marginBottom:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}><div><strong style={{color:'#8c6d1f'}}>✨ Studio Trial Mode ({draft?.templateId.toUpperCase()})</strong><p style={{margin:'3px 0 0',fontSize:'0.9rem',color:'#44403c'}}>You are customising this template live. Test couple names, ceremony schedules, and venue maps.</p></div><div style={{display:'flex',gap:'8px'}}><a className="button secondary" href={`/preview/${tryTemplateId}?try=true`} onClick={saveTrialPreview} style={{padding:'6px 12px',fontSize:'0.85rem'}}>Preview your changes ↗</a><button type="button" className="button primary" style={{padding:'6px 14px',fontSize:'0.85rem'}} onClick={()=>{if(content){sessionStorage.setItem('riwaayat_try_draft',JSON.stringify({templateId:tryTemplateId,title,content}));sessionStorage.setItem('riwaayat_preview_try',JSON.stringify(content));}location.assign('/account');}}>Save to Workspace ↗</button></div></div>}{emulatorMode&&<p className="account-banner">Local preview · publish links work on this computer only</p>}{error&&<p role="alert" className="account-error">{error}</p>}{notice&&<p role="status" className="account-banner">{notice}</p>}{configurationError&&!isTryMode?<p>{configurationError}</p>:!loaded?<p role="status">Loading invitation…</p>:draft&&content?<><div className="editor-toolbar">{isTryMode?<span style={{fontWeight:600}}>Interactive Studio · {draft.templateId.toUpperCase()}</span>:<a className="host-action" href={`/responses/${id}`}>Guest responses &amp; guestbook →</a>}<span role="status">{busy?'Working…':dirty?'Unsaved changes':!draft.content?'Add your invitation details':isTryMode?'Testing in browser':'Saved draft'} · {draft.templateId}</span><a className="account-secondary" href={isTryMode?`/preview/${tryTemplateId}?try=true`:`/draft/${id}`}  aria-disabled={!isTryMode&&(dirty||!draft.content)} onClick={e=>{if(isTryMode)saveTrialPreview();if(!isTryMode&&(dirty||!draft.content)){e.preventDefault();setError('Save your changes before opening the saved preview.');}}}>{isTryMode?'Preview changes ↗':'Preview saved version ↗'}</a></div><div className="editor-layout"><form id="editor-form" className="account-panel editor-form" onSubmit={save}><fieldset disabled={busy}><legend>Invitation details</legend><label>Workspace title<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={100}/></label><label>Names or celebration heading<input value={content.couple} onChange={e=>patch('couple',e.target.value)} required maxLength={100} placeholder="e.g. Sara & Ahmed"/></label><label>Introduction<input value={content.intro} onChange={e=>patch('intro',e.target.value)} maxLength={200}/></label><label>Invitation message<textarea value={content.note} onChange={e=>patch('note',e.target.value)} maxLength={600}/></label><label>Event timezone<select value={content.timeZone} onChange={e=>patch('timeZone',e.target.value)}>{[...new Set([content.timeZone,'Asia/Karachi','Asia/Kolkata','Asia/Dubai','Europe/London','America/New_York','UTC'])].map(z=><option key={z}>{z}</option>)}</select></label><label>Date and time at the venue<input type="datetime-local" value={localTime(content.startsAt,content.timeZone)} onChange={e=>changeTime(e.target.value,iso=>patch('startsAt',iso))} required/></label><small>Changing timezone keeps the same instant and updates the displayed local time.</small><h2>The venue & location</h2><label>Venue name<input value={content.venue.name} required maxLength={150} placeholder="e.g. Seven Star Marriage Lawn" onChange={e=>{const name=e.target.value;patch('venue',{...content.venue,name,mapQuery:name&&content.venue.address?`${name}, ${content.venue.address}`:name||content.venue.address});}}/></label><label>Venue address<input value={content.venue.address} maxLength={400} placeholder="e.g. Tibba Badar shar, Bahawalpur, Punjab, Pakistan" onChange={e=>{const address=e.target.value;patch('venue',{...content.venue,address,mapQuery:content.venue.name&&address?`${content.venue.name}, ${address}`:content.venue.name||address});}}/></label><label>Map location search or Google Maps link (Optional)<input value={content.venue.mapQuery} placeholder="Leave blank to auto-use Venue Name & Address, or paste Google Maps link" maxLength={400} onChange={e=>patch('venue',{...content.venue,mapQuery:e.target.value})}/></label><small>When guests click "View area on Maps", Google Maps will navigate directly to this address or pinned location.</small><h2>Your story</h2><label>A favourite quote<textarea value={content.quote} maxLength={300} onChange={e=>patch('quote',e.target.value)}/></label>{content.story.map((row,i)=><div className="editor-row" key={i}><h3>Story moment {i+1}</h3>{(['year','title','text'] as const).map(key=><label key={key}>{key==='year'?'Year or caption':key==='title'?'Heading':'Story'}<textarea value={row[key]} maxLength={key==='year'?40:key==='title'?100:1200} onChange={e=>patch('story',content.story.map((s,n)=>n===i?{...s,[key]:e.target.value}:s))}/></label>)}<button type="button" onClick={()=>patch('story',content.story.filter((_,n)=>n!==i))}>Remove story moment {i+1}</button></div>)}<button type="button" disabled={content.story.length>=8} onClick={()=>patch('story',[...content.story,{year:'',title:'',text:''}])}>+ Add story moment</button><h2>Ceremonies & schedule</h2>{content.ceremonies.map((row,i)=><div className="editor-row" key={row.id}><h3>Ceremony {i+1}</h3>{(['title','place','attire'] as const).map(key=><label key={key}>{key==='title'?'Ceremony name':key==='place'?'Location':'Attire'}<input required={key==='title'} value={row[key]} maxLength={key==='title'?100:200} onChange={e=>patch('ceremonies',content.ceremonies.map((s,n)=>n===i?{...s,[key]:e.target.value}:s))}/></label>)}<label>Ceremony date and time<input type="datetime-local" required value={localTime(row.startsAt,content.timeZone)} onChange={e=>changeTime(e.target.value,iso=>patch('ceremonies',content.ceremonies.map((s,n)=>n===i?{...s,startsAt:iso}:s)))}/></label><button type="button" onClick={()=>patch('ceremonies',content.ceremonies.filter((_,n)=>n!==i))}>Remove ceremony {i+1}</button></div>)}<button type="button" disabled={content.ceremonies.length>=12} onClick={()=>patch('ceremonies',[...content.ceremonies,{id:crypto.randomUUID(),title:'',place:'',attire:'',startsAt:content.startsAt}])}>+ Add ceremony</button><h2>Photographs & Media</h2><div className="editor-upload-card"><strong>Upload photographs directly</strong><p>Add couple portraits, venue images, or celebration moments.</p><label className="editor-upload-btn">+ Upload photograph<input type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} disabled={busy||isTryMode} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPhotoDirect(file);e.target.value='';}}/></label><small>{isTryMode?'Save to your account before uploading photographs.':'JPEG, PNG or WebP · under 4 MB · up to 30 photos'}</small></div><div className="editor-photo-card"><h3>1. Hero / Cover Portrait</h3><p>The main photograph featured at the top of your invitation.</p><label>Choose cover photo<select value={content.imagePhotoId||''} onChange={e=>patch('imagePhotoId',e.target.value||null)}><option value="">Decorative template cover</option>{photos.map((p,i)=><option key={p.id} value={p.id}>Photograph {i+1}</option>)}</select></label>{coverImgSrc&&<div className="editor-photo-flex"><div className="editor-photo-preview"><img src={coverImgSrc} alt="Cover preview" style={{objectPosition:`${coverPos.x}% ${coverPos.y}%`}}/></div><div className="editor-photo-sliders"><label>Move Vertical (Up ↕ Down): {coverPos.y}%<input type="range" min="0" max="100" value={coverPos.y} onChange={e=>patch('imagePosition',`${coverPos.x}% ${e.target.value}%`)}/></label><label>Move Horizontal (Left ↔ Right): {coverPos.x}%<input type="range" min="0" max="100" value={coverPos.x} onChange={e=>patch('imagePosition',`${e.target.value}% ${coverPos.y}%`)}/></label><div className="editor-presets"><span>Presets:</span><button type="button" onClick={()=>patch('imagePosition',`50% 15%`)}>Face / Top</button><button type="button" onClick={()=>patch('imagePosition',`50% 50%`)}>Center</button><button type="button" onClick={()=>patch('imagePosition',`50% 85%`)}>Bottom</button></div></div></div>}</div><div className="editor-photo-card"><h3>2. Venue / Location Photograph</h3><p>Displayed in the venue and map section of the invitation.</p><label>Choose venue photo<select value={content.venuePhotoId||''} onChange={e=>patch('venuePhotoId',e.target.value||null)}><option value="">Template architectural venue photo (Default)</option>{photos.map((p,i)=><option key={p.id} value={p.id}>Photograph {i+1}</option>)}</select></label><div className="editor-photo-flex"><div className="editor-photo-preview"><img src={venueImgSrc} alt="Venue preview" style={{objectPosition:`${venuePos.x}% ${venuePos.y}%`}}/></div><div className="editor-photo-sliders"><label>Move Vertical (Up ↕ Down): {venuePos.y}%<input type="range" min="0" max="100" value={venuePos.y} onChange={e=>patch('venueImagePosition',`${venuePos.x}% ${e.target.value}%`)}/></label><label>Move Horizontal (Left ↔ Right): {venuePos.x}%<input type="range" min="0" max="100" value={venuePos.x} onChange={e=>patch('venueImagePosition',`${e.target.value}% ${venuePos.y}%`)}/></label><div className="editor-presets"><span>Presets:</span><button type="button" onClick={()=>patch('venueImagePosition',`50% 15%`)}>Top</button><button type="button" onClick={()=>patch('venueImagePosition',`50% 50%`)}>Center</button><button type="button" onClick={()=>patch('venueImagePosition',`50% 85%`)}>Bottom</button></div></div></div></div>{photos.length>0&&<div className="editor-photo-card"><h3>3. Moments Gallery</h3><p>Choose which photographs to include in the gallery section.</p><div className="editor-gallery-grid">{photos.map((p,i)=><label key={p.id} className="editor-gallery-item">{p.path&&<img src={p.path} alt={`Photo ${i+1}`}/>}<span>Photo {i+1}</span><input type="checkbox" checked={content.galleryPhotoIds.includes(p.id)} onChange={e=>patch('galleryPhotoIds',e.target.checked?[...content.galleryPhotoIds,p.id]:content.galleryPhotoIds.filter(v=>v!==p.id))} disabled={!content.galleryPhotoIds.includes(p.id)&&content.galleryPhotoIds.length>=12}/></label>)}</div></div>}<h2>The little details</h2><label>Celebration hashtag<input value={content.hashtag} maxLength={80} onChange={e=>patch('hashtag',e.target.value)}/></label><label>Dress code<input value={content.dressCode} maxLength={300} onChange={e=>patch('dressCode',e.target.value)}/></label><label>Music<select value={content.instrument} onChange={e=>patch('instrument',e.target.value as Content['instrument'])}>{['Sitar','Guitar','Oud','Piano'].map(v=><option key={v}>{v}</option>)}</select></label><label>Particles<select value={content.particle} onChange={e=>patch('particle',e.target.value as Content['particle'])}><option value="petals">Rose petals</option><option value="leaves">Eucalyptus leaves</option><option value="stars">Starlight</option></select></label><div className="editor-checkboxes">{(['opening','particles','music','scratch'] as const).map(key=><label key={key}><input type="checkbox" checked={content.effects[key]} onChange={e=>patch('effects',{...content.effects,[key]:e.target.checked})}/>{key==='opening'?'3D envelope opening':key==='scratch'?'Scratch reveal':key==='music'?'Music controls':'Particle effects'}</label>)}</div><button className="button primary" type="submit">{busy?'Saving…':isTryMode?'Save changes in preview':'Save changes'}</button></fieldset></form>{isTryMode?<aside className="account-panel editor-publish"><span className="eyebrow">SAVE & PUBLISH</span><h2>Ready to share with guests?</h2><p>You are personalising the <strong>{draft.templateId.toUpperCase()}</strong> suite in live studio mode.</p><p>Create a free account or sign in to save your draft permanently, get a private guest link, and collect live RSVPs.</p><button type="button" className="button primary" style={{width:'100%',marginTop:'10px'}} onClick={()=>{if(content){sessionStorage.setItem('riwaayat_try_draft',JSON.stringify({templateId:tryTemplateId,title,content}));sessionStorage.setItem('riwaayat_preview_try',JSON.stringify(content));}location.assign('/account');}}>Save & Create Free Account ↗</button><a className="button secondary" href={`/preview/${tryTemplateId}?try=true`} onClick={saveTrialPreview} style={{display:'block',textAlign:'center',marginTop:'10px',textDecoration:'none'}}>Preview invitation with your details ↗</a></aside>:<aside className="account-panel editor-publish"><span className="eyebrow">SHARE YOUR CELEBRATION</span><h2>Ready for your guests?</h2><p>{draft.status==='published'?'A published version is available.':'Your invitation is a private draft.'}</p>{draft.status==='published'&&draft.publishedRevision!==draft.revision&&<p>Saved edits have not been published yet.</p>}<form onSubmit={e=>{e.preventDefault();void run(async()=>{await call('publishInvitation',{revision:draft.revision||0,access,...(access==='passcode'?{passcode}:{})});setDraft({...draft,status:'published',publishedRevision:draft.revision,publishedAccess:access});setPasscode('');setNotice(emulatorMode?'Published in the local emulator. Open the guest link to check it.':'Saved version published.');});}}><label>Guest access<select value={access} onChange={e=>setAccess(e.target.value)} disabled={busy}><option value="public">Anyone with the link</option><option value="passcode">Passcode required</option></select></label>{access==='passcode'&&<label>Set a guest passcode<input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} minLength={8} maxLength={128} required autoComplete="new-password" disabled={busy}/><small>At least 8 characters. Share it separately from the link. Publishing sets a new passcode.</small></label>}<p>Publishing shares the saved names, schedule, venue and selected photos with the chosen audience. Guest replies are saved privately. Guestbook messages require host approval.</p><button className="button primary" disabled={busy||dirty||!draft.content}>Publish saved version</button>{dirty&&<small>Save your edits before publishing.</small>}</form>{draft.status==='published'&&<div className="editor-share"><label>Guest link<input readOnly value={link}/></label><a href={link} target="_blank" rel="noopener noreferrer">Open guest invitation ↗</a><button type="button" onClick={()=>run(async()=>{await navigator.clipboard.writeText(link);setNotice('Invitation link copied.');})}>Copy link</button>{!emulatorMode&&<a href={`https://wa.me/?text=${encodeURIComponent('You are invited: '+link)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp ↗</a>}<button disabled={busy} onClick={()=>run(async()=>{await call('unpublishInvitation');setDraft({...draft,status:'draft',publishedRevision:undefined});setNotice('Unpublished. New guest requests are blocked.');})}>Unpublish invitation</button></div>}<hr/><button disabled={busy||dirty} onClick={()=>run(async()=>{const result=await call('duplicateInvitation');if(result?.data?.id)location.assign(`/edit/${result.data.id}`);})}>Duplicate saved invitation</button><p className="account-caption">Copies start as private drafts.</p>{archive?<div><p>Move this invitation to the archive and stop guest access? You can restore it from the workspace.</p><button disabled={busy||dirty} onClick={()=>run(async()=>{await call('archiveInvitation');location.assign('/account');})}>Move to archive</button><button onClick={()=>setArchive(false)}>Cancel</button></div>:<button disabled={busy||dirty} onClick={()=>setArchive(true)}>Archive invitation</button>}</aside>}</div></>:null}</main></div>;
}
