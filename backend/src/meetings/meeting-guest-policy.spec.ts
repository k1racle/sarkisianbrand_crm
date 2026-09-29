import { guestDigest, guestSecret, guestState, guestWindow } from './meeting-guest-policy';
describe('meeting guest policy',()=>{
 const start=new Date('2030-09-24T10:00:00Z'),end=new Date('2030-09-24T11:00:00Z');
 const meeting={startsAt:start,endsAt:end,status:'SCHEDULED'} as any;
 const invitation={revokedAt:null,expiresAt:new Date('2030-09-24T11:30:00Z')} as any;
 const guest={status:'WAITING',expiresAt:invitation.expiresAt} as any;
 test('32-byte secrets are URL-safe, random and only hashed for storage',()=>{
  const a=guestSecret(),b=guestSecret();expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(a).not.toEqual(b);
  expect(guestDigest(a)).toMatch(/^[a-f0-9]{64}$/);expect(guestDigest(a)).not.toEqual(guestDigest(b));
 });
 test.each([[-1800001,false],[-1800000,true],[0,true],[5399999,true],[5400000,false]])('entry window boundary %s',(delta,expected)=>{
  expect(guestWindow(meeting,new Date(+start+delta))).toBe(expected);
 });
 test.each(['WAITING','ADMITTED'])('active state %s preserved',status=>expect(guestState({...guest,status},invitation,meeting,start)).toBe(status));
 test.each(['LEFT','REVOKED','REJECTED'])('terminal state %s never reopened',status=>expect(guestState({...guest,status},invitation,meeting,start)).toBe(status));
 test('revocation and cancellation override admitted state',()=>{
  expect(guestState({...guest,status:'ADMITTED'},{...invitation,revokedAt:start},meeting,start)).toBe('REVOKED');
  expect(guestState(guest,invitation,{...meeting,status:'CANCELLED'},start)).toBe('REVOKED');
 });
 test('expiry is exclusive at boundary',()=>expect(guestState(guest,invitation,meeting,invitation.expiresAt)).toBe('EXPIRED'));
});
