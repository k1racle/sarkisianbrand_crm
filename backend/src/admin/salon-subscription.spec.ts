import { AdminService } from './admin.service';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));
jest.mock('../notifications/notifications.service',()=>({NotificationsService:class{}}));
jest.mock('../media/media.service',()=>({MediaService:class{}}));
describe('Salon subscription configuration — fixtures only, no payment calls',()=>{
 const db:any={salonSubscriptionSetting:{findUnique:jest.fn(),upsert:jest.fn(async({create}:any)=>create)}};
 const service=new (AdminService as any)(db);
 it('defaults to free access and zero prices without creating records',async()=>{db.salonSubscriptionSetting.findUnique.mockResolvedValue(null);expect(await service.salonSubscription()).toMatchObject({freeAccess:true,monthlyPrice:0,annualPrice:0});expect(db.salonSubscriptionSetting.upsert).not.toHaveBeenCalled();});
 it('saves future prices independently of current salon entitlements',async()=>{const value={name:'Кабинет салона',monthlyPrice:1900,annualPrice:19000,freeAccess:true};expect(await service.saveSalonSubscription(value)).toMatchObject(value);expect(db.salonSubscriptionSetting.upsert).toHaveBeenCalledWith({where:{key:'main'},create:{key:'main',...value},update:value});});
});
