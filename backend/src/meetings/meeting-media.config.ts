export type MeetingMediaConfig = { enabled:boolean; publicUrl:string; apiUrl:string; apiKey:string; apiSecret:string; gatewayKey:string };
export function meetingMediaConfig(env:Record<string,string|undefined>=process.env):MeetingMediaConfig {
  const off={enabled:false,publicUrl:'',apiUrl:'',apiKey:'',apiSecret:'',gatewayKey:''};
  if(env.CRM_MEDIA_ENABLED!=='true')return off;
  // This acknowledgement is a deployment prerequisite, NOT proof that Nginx is configured.
  if(env.CRM_MEDIA_GATEWAY_ENFORCED!=='true')throw new Error('CRM media requires an enforced signalling authorization gateway');
  const publicUrl=env.CRM_MEDIA_PUBLIC_URL||'',apiUrl=env.CRM_MEDIA_API_URL||'';
  let pub:URL,api:URL;try{pub=new URL(publicUrl);api=new URL(apiUrl);}catch{throw new Error('Invalid CRM media URLs');}
  if(pub.protocol!=='wss:'||pub.pathname!=='/'||pub.search||pub.hash||pub.username||pub.password)throw new Error('CRM media public URL must be a credential-free WSS origin');
  // The control API must be private on the same host. Never send keys to a user-supplied URL.
  if(api.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(api.hostname)||api.pathname!=='/'||api.search||api.hash||api.username||api.password)throw new Error('CRM media API must use a loopback HTTP origin');
  const apiKey=env.CRM_MEDIA_API_KEY||'',apiSecret=env.CRM_MEDIA_API_SECRET||'',gatewayKey=env.CRM_MEDIA_GATEWAY_KEY||'';
  if(!/^[A-Za-z0-9_-]{8,128}$/.test(apiKey)||apiSecret.length<32||gatewayKey.length<32||apiSecret===gatewayKey)throw new Error('CRM media requires distinct strong server and gateway secrets');
  return {enabled:true,publicUrl:pub.origin,apiUrl:api.origin,apiKey,apiSecret,gatewayKey};
}
