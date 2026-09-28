export async function deliverContact(data,config,transport=fetch){
 if(!config.apiKey||!config.to||!config.from)throw new Error('Email delivery is not configured.');
 const response=await transport('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`contact-${data.requestId}`},body:JSON.stringify({from:config.from,to:[config.to],reply_to:data.email,subject:`Riwaayat: ${data.subject}`,text:`From: ${data.name}\nReply to: ${data.email}\n\n${data.message}`}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok||typeof result.id!=='string'||!result.id)throw new Error('Email acceptance could not be confirmed.');return result.id;
}
