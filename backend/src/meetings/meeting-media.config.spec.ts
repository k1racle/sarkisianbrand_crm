import { meetingMediaConfig } from './meeting-media.config';

const enabled={CRM_MEDIA_ENABLED:'true',CRM_MEDIA_GATEWAY_ENFORCED:'true',CRM_MEDIA_PUBLIC_URL:'wss://meet.sarkisianbrand.ru',CRM_MEDIA_API_URL:'http://127.0.0.1:7880',CRM_MEDIA_API_KEY:'test-key',CRM_MEDIA_API_SECRET:'a'.repeat(40),CRM_MEDIA_GATEWAY_KEY:'b'.repeat(40)};
describe('Self-hosted meeting media configuration',()=>{
  it('is disabled by default and ignores dormant credentials',()=>{
    expect(meetingMediaConfig({})).toEqual({enabled:false,publicUrl:'',apiUrl:'',apiKey:'',apiSecret:'',gatewayKey:''});
    expect(meetingMediaConfig({...enabled,CRM_MEDIA_ENABLED:'false'}).enabled).toBe(false);
  });
  it('requires a gateway acknowledgement, not just a media key',()=>{
    expect(()=>meetingMediaConfig({...enabled,CRM_MEDIA_GATEWAY_ENFORCED:'false'})).toThrow('gateway');
  });
  it('accepts only an origin and a private loopback control API',()=>{
    expect(meetingMediaConfig(enabled).publicUrl).toBe('wss://meet.sarkisianbrand.ru');
    expect(meetingMediaConfig({...enabled,CRM_MEDIA_API_URL:'http://[::1]:7880'}).enabled).toBe(true);
  });
  it.each(['https://meet.sarkisianbrand.ru','ws://meet.sarkisianbrand.ru','wss://user:secret@meet.sarkisianbrand.ru','wss://meet.sarkisianbrand.ru/rtc','wss://meet.sarkisianbrand.ru?token=secret','wss://meet.sarkisianbrand.ru#secret'])('rejects an unsafe public origin %s',value=>{
    expect(()=>meetingMediaConfig({...enabled,CRM_MEDIA_PUBLIC_URL:value})).toThrow();
  });
  it.each(['http://example.com:7880','http://localhost:7880','http://127.0.0.1:7880/twirp','http://user:secret@127.0.0.1:7880','http://127.0.0.1:7880?secret=x'])('rejects an unsafe control origin %s',value=>{
    expect(()=>meetingMediaConfig({...enabled,CRM_MEDIA_API_URL:value})).toThrow();
  });
  it('rejects missing, weak and reused secrets without echoing them',()=>{
    for(const override of [{CRM_MEDIA_API_KEY:''},{CRM_MEDIA_API_SECRET:'too-short'},{CRM_MEDIA_GATEWAY_KEY:'short'},{CRM_MEDIA_GATEWAY_KEY:enabled.CRM_MEDIA_API_SECRET}]){
      expect(()=>meetingMediaConfig({...enabled,...override})).toThrow('distinct strong');
      try{meetingMediaConfig({...enabled,...override});}catch(e){expect(String(e)).not.toContain(enabled.CRM_MEDIA_API_SECRET);}
    }
  });
});
