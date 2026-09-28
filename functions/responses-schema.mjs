import {z} from 'zod';
const guest={id:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)};
const requestId=z.string().uuid();
export const rsvpInput=z.object({...guest,requestId,name:z.string().trim().min(1).max(100),attendance:z.enum(['yes','no']),partySize:z.number().int().min(0).max(6),meal:z.enum(['No preference','Vegetarian','Vegan','Halal']).nullable(),ceremonies:z.array(z.string().uuid()).max(12).refine(a=>new Set(a).size===a.length),note:z.string().trim().max(500)}).strict().refine(v=>v.attendance==='yes'?v.partySize>=1&&v.meal!==null:v.partySize===0&&v.meal===null&&v.ceremonies.length===0);
export const bookInput=z.object({...guest,requestId,displayName:z.string().trim().min(1).max(80),message:z.string().trim().min(1).max(800),consent:z.literal(true)}).strict();
export const bookReadInput=z.object(guest).strict();
export const moderateInput=z.object({eventId:z.string().uuid(),entryId:z.string().uuid(),status:z.enum(['approved','hidden','rejected'])}).strict();
export const settingsInput=z.object({eventId:z.string().uuid(),rsvpOpen:z.boolean(),guestbookOpen:z.boolean()}).strict();
export const contactInput=z.object({requestId,name:z.string().trim().min(1).max(100),email:z.string().email().max(254),subject:z.string().trim().min(1).max(150).refine(v=>!/[\r\n]/.test(v)),message:z.string().trim().min(10).max(3000)}).strict();
