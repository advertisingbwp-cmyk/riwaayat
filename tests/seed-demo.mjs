// This fixture only connects to the local Auth emulator, never a live project.
import {createRequire} from 'node:module';
const serverRequire=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp,deleteApp}=serverRequire('firebase-admin/app');
const {getAuth}=serverRequire('firebase-admin/auth');
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9098';
const app=initializeApp({projectId:'demo-riwaayat'});
try{await getAuth(app).createUser({uid:'sample-host',email:'sample@example.test',password:'Local-Preview-Only-2026!',emailVerified:true});console.log('Local sample workspace account ready.');}catch(e){if(e.code!=='auth/uid-already-exists'&&e.code!=='auth/email-already-exists')throw e;}finally{await deleteApp(app);}
