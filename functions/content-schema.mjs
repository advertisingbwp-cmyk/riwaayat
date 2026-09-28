import { z } from 'zod';
const text=(max=200)=>z.string().trim().max(max);
const date=z.string().datetime({offset:true}).refine(v=>Number.isFinite(Date.parse(v)));
const zone=z.string().refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Choose a valid IANA timezone');
export const contentSchema=z.object({
 couple:text(100).min(1),intro:text(200),note:text(600),quote:text(300),startsAt:date,timeZone:zone,
 hashtag:text(80),dressCode:text(300),venue:z.object({name:text(150).min(1),address:text(400),mapQuery:text(400)}).strict(),
 story:z.array(z.object({year:text(40),title:text(100),text:text(1200)}).strict()).max(8),
 ceremonies:z.array(z.object({id:z.string().uuid(),title:text(100).min(1),startsAt:date,place:text(200),attire:text(200)}).strict()).max(12).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length),
 imagePhotoId:z.string().uuid().nullable(),galleryPhotoIds:z.array(z.string().uuid()).max(12).refine(a=>new Set(a).size===a.length),
 instrument:z.enum(['Sitar','Guitar','Oud','Piano']),particle:z.enum(['petals','stars','leaves']),
 effects:z.object({opening:z.boolean(),particles:z.boolean(),music:z.boolean(),scratch:z.boolean()}).strict()
}).strict();
export const saveInput=z.object({eventId:z.string().uuid(),requestId:z.string().uuid(),revision:z.number().int().nonnegative(),title:text(100).min(1),content:contentSchema}).strict();
export const publishInput=z.object({eventId:z.string().uuid(),requestId:z.string().uuid(),revision:z.number().int().nonnegative(),access:z.enum(['public','passcode']),passcode:z.string().max(128).optional()}).strict().refine(v=>v.access!=='passcode'||(v.passcode?.length>=8),'Use at least 8 characters');
export const actionInput=z.object({eventId:z.string().uuid(),requestId:z.string().uuid()}).strict();
export const guestInput=z.object({id:z.string().uuid(),passcode:z.string().max(128).optional()}).strict();
export const mediaInput=z.object({id:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/),photoId:z.string().uuid()}).strict();
