import {loadEnv} from 'vite';
import {validateStagingConfig} from './staging-config.mjs';
const errors=validateStagingConfig({...loadEnv('staging',process.cwd(),'VITE_'),...Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('VITE_')))});
if(errors.length){console.error('Staging configuration is incomplete. No deployment was attempted.');for(const error of errors)console.error(`- ${error}`);process.exitCode=1;}
else console.log('Staging configuration format passed. Firebase ownership, enabled services, billing, App Check and live delivery still require verification.');
