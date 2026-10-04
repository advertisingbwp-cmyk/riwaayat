import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, connectAuthEmulator, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
const env=import.meta.env;
const config={apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID};
export const emulatorMode=env.VITE_FIREBASE_EMULATORS==='true';
export const configurationError=Object.values(config).some(value=>!value)?'Account services are not configured yet. You can still explore all three invitation designs.':emulatorMode&&(!config.projectId.startsWith('demo-')||!['localhost','127.0.0.1'].includes(location.hostname))?'Local testing requires a demo project on localhost.':!emulatorMode&&!env.VITE_FIREBASE_APPCHECK_SITE_KEY?'Account services need App Check configuration before they can open.':null;
function connect(){
  if(configurationError)return null;
  const app=initializeApp(config);
  if(!emulatorMode)initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
  const auth=getAuth(app),db=getFirestore(app);
  if(emulatorMode){connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8086);}
  const ready=setPersistence(auth,browserSessionPersistence);
  return {auth,db,ready};
}
export const services=connect();
export function friendlyError(error:unknown){
  const code=(error as {code?:string})?.code||'';
  if(code.includes('popup-closed'))return 'Sign-in was cancelled. Try again when you’re ready.';
  if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found'))return 'We could not sign you in. Check your email and password.';
  if(code.includes('email-already-in-use'))return 'Unable to create this account. Try signing in or resetting your password.';
  if(code.includes('weak-password'))return 'Choose a stronger password with at least 12 characters.';
  if(code.includes('too-many')||code.includes('resource-exhausted'))return 'Too many attempts. Please wait a minute and retry.';
  if(code.includes('permission-denied'))return 'Access was denied. Verify your email and try again.';
  if(code.includes('invalid-argument'))return 'Check your details. Photos must be still JPEG, PNG or WebP, under 4 MB and 20 megapixels.';
  return 'The service could not complete this request. Your changes are not confirmed. Please retry.';
}
