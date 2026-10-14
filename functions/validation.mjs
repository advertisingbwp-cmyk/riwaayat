import { z } from 'zod';
import sharp from 'sharp';
export const draftInput = z.object({requestId:z.string().uuid(),title:z.string().trim().min(1).max(100),templateId:z.enum(['royal','noor','bloom','sahar','mehr'])}).strict();
export const photoInput = z.object({eventId:z.string().uuid(),requestId:z.string().uuid(),base64:z.string().min(1).max(5600000)}).strict();
export async function normalizePhoto(base64) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length%4) throw new Error('Invalid image encoding.');
  const bytes=Buffer.from(base64,'base64');
  if(bytes.length>4*1024*1024) throw new Error('Choose an image smaller than 4 MB.');
  const image=sharp(bytes,{limitInputPixels:20000000,failOn:'warning'});
  const metadata=await image.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format)||metadata.pages>1) throw new Error('Choose a still JPEG, PNG or WebP image.');
  const {data,info}=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
  return {data,width:info.width,height:info.height};
}
