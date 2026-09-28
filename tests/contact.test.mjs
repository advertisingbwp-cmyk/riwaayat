import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverContact} from '../functions/contact-delivery.mjs';
const data={requestId:'local-test-id',name:'Sample',email:'sample@example.test',subject:'Question',message:'A local test only.'};
const config={apiKey:'test-key',to:'support@example.test',from:'test@example.test'};
test('contact delivery fails closed without configuration and never calls transport',async()=>{let called=false;await assert.rejects(()=>deliverContact(data,{},async()=>{called=true;}));assert.equal(called,false);});
test('provider rejection and missing acceptance id do not report success',async()=>{await assert.rejects(()=>deliverContact(data,config,async()=>({ok:false,json:async()=>({error:'Rejected'})})));await assert.rejects(()=>deliverContact(data,config,async()=>({ok:true,json:async()=>({})})));});
test('email transport uses fixed recipient, reply-to and stable idempotency key',async()=>{const result=await deliverContact(data,config,async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'contact-local-test-id');const body=JSON.parse(options.body);assert.deepEqual(body.to,[config.to]);assert.equal(body.reply_to,data.email);assert.equal(body.html,undefined);return {ok:true,json:async()=>({id:'provider-receipt'})};});assert.equal(result,'provider-receipt');});
