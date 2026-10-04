import { invitationEvents, type InvitationEvent } from './events';
export type Content={
 couple:string;intro:string;note:string;quote:string;startsAt:string;timeZone:string;hashtag:string;dressCode:string;
 venue:InvitationEvent['venue'];story:InvitationEvent['story'];ceremonies:InvitationEvent['ceremonies'];
 imagePhotoId:string|null;
 venuePhotoId?:string|null;
 imagePosition?:string;
 venueImagePosition?:string;
 galleryPhotoIds:string[];instrument:InvitationEvent['instrument'];particle:InvitationEvent['particle'];
 effects:{opening:boolean;particles:boolean;music:boolean;scratch:boolean};
};
export type SavedDraft={id:string;title:string;templateId:InvitationEvent['id'];content:Content|null;revision?:number;status:string;publishedRevision?:number;publishedAccess?:string;archived?:boolean};
export const blankContent=(template:InvitationEvent['id']):Content=>({couple:'',intro:'You are warmly invited',note:'',quote:'',startsAt:new Date(Date.now()+30*86400000).toISOString(),timeZone:'Asia/Karachi',hashtag:'',dressCode:'',venue:{name:'',address:'',mapQuery:''},story:[],ceremonies:[],imagePhotoId:null,venuePhotoId:null,imagePosition:'50% 50%',venueImagePosition:'50% 50%',galleryPhotoIds:[],instrument:invitationEvents.find(e=>e.id===template)!.instrument,particle:invitationEvents.find(e=>e.id===template)!.particle,effects:{opening:true,particles:true,music:true,scratch:true}});
export function toInvitation(template:InvitationEvent['id'],content:Content,images:Record<string,string>):InvitationEvent {
 const fallback='/images/invitation-placeholder.svg';
 const defaultVenueImg = invitationEvents.find(e=>e.id===template)?.venueImage || invitationEvents.find(e=>e.id===template)?.gallery[2]?.src || fallback;
 return {
  ...content,
  id:template,
  name:invitationEvents.find(e=>e.id===template)?.name || 'Invitation',
  category:'Invitation',
  mood:'',
  image:content.imagePhotoId?images[content.imagePhotoId]||fallback:fallback,
  venueImage:content.venuePhotoId?images[content.venuePhotoId]||defaultVenueImg:defaultVenueImg,
  imagePosition:content.imagePosition||'50% 50%',
  venueImagePosition:content.venueImagePosition||'50% 50%',
  gallery:content.galleryPhotoIds.map(id=>({src:images[id]||fallback,alt:'Celebration photograph'}))
 };
}
export function editorError(e:unknown){const code=(e as {code?:string}).code||'';if(code.includes('aborted'))return 'Another session saved newer changes. Your edits are still here. Reload the saved version before trying again.';if(code.includes('not-found'))return 'This invitation is unavailable or you do not own it.';if(code.includes('invalid-argument'))return 'Check the names, venue, date/time, timezone and text lengths.';if(code.includes('failed-precondition'))return 'Save the invitation and ensure selected photos have finished uploading.';if(code.includes('resource-exhausted'))return 'Too many requests. Please wait a minute and try again.';return 'The request failed. Your changes are not confirmed; please retry.';}
