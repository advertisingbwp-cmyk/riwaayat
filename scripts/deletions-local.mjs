// Local-only worker; never accepts a real Firebase project or production endpoint.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8086';
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9098';
process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9198';
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getAuth}=require('firebase-admin/auth');
const {getStorage}=require('firebase-admin/storage');
const {processDeletion}=await import('../functions/deletion.mjs');
initializeApp({projectId:'demo-riwaayat',storageBucket:'demo-riwaayat.appspot.com'});
const db=getFirestore();
console.log('Local deletion worker: demo-riwaayat emulators only. Checking every 30 seconds.');
for(;;){try{const jobs=await db.collection('deletionJobs').where('finished','==',false).limit(10).get();for(const job of jobs.docs)await processDeletion(db,getStorage().bucket(),getAuth(),job.id);}catch{console.error('Local cleanup incomplete. Check emulator availability; will retry.');}await new Promise(resolve=>setTimeout(resolve,30000));}
