export function validateStagingConfig(env){
 const errors=[];
 const required=['VITE_SITE_URL','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_APP_ID','VITE_FIREBASE_APPCHECK_SITE_KEY'];
 for(const key of required)if(!env[key]?.trim())errors.push(`${key} is required.`);
 if(env.VITE_FIREBASE_EMULATORS!=='false')errors.push('Staging must explicitly set VITE_FIREBASE_EMULATORS=false.');
 const project=env.VITE_FIREBASE_PROJECT_ID||'';
 if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)||project.startsWith('demo-')||project==='wedding-28db4')errors.push('Choose the confirmed NEW Firebase project; the old project and demo projects are blocked.');
 if(env.VITE_FIREBASE_AUTH_DOMAIN!==`${project}.firebaseapp.com`)errors.push('Auth domain must belong to the new Firebase project. Custom auth domains require a separate reviewed configuration.');
 if(env.VITE_FIREBASE_STORAGE_BUCKET && ![`${project}.appspot.com`,`${project}.firebasestorage.app`].includes(env.VITE_FIREBASE_STORAGE_BUCKET))errors.push('Storage bucket must belong to the new Firebase project.');
 if(!/^AIza[\w-]{35}$/.test(env.VITE_FIREBASE_API_KEY||''))errors.push('Firebase web API key format is invalid.');
 if(!/^1:\d+:web:[a-f0-9]+$/i.test(env.VITE_FIREBASE_APP_ID||''))errors.push('Firebase web app ID format is invalid.');
 for(const key of Object.keys(env))if(key.startsWith('VITE_')&&/secret|private|resend|service.?account/i.test(key))errors.push(`Remove server-only credential variable ${key} from the frontend environment.`);
 try{const url=new URL(env.VITE_SITE_URL);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!url.hostname.includes('.')||/^(localhost|127\.)/.test(url.hostname)||url.hostname==='example.com'||url.hostname.endsWith('.example.com'))throw new Error();}catch{errors.push('VITE_SITE_URL must be the real HTTPS staging origin, without a path or query.');}
 return errors;
}
